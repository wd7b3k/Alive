#!/usr/bin/env node
/**
 * Еженедельный сбор находок для каталога «Факты и мифы».
 *
 * Что это и чего это не делает. Скрипт **приносит кандидатов**, а не пишет карточки:
 * модели здесь нет, текстов он не сочиняет и в базу не ходит. На выходе — файл улова
 * недели, который читает человек и по которому пишется миграция. Решение о публикации
 * принимает владелец (`AGENTS.md`, гейт на медицински значимые формулировки).
 *
 * Почему без модели. Отбор здесь механический и проверяемый: тип публикации приходит от
 * PubMed полем `pubtype`, окно дат считается от прошлого прогона, дубль ловится по кодам
 * и словам уже опубликованных карточек. Всё это воспроизводимо и объяснимо в диффе.
 * Модель на этом месте дала бы разный ответ на один и тот же вход — и спорить с ней было
 * бы нечем.
 *
 * **Недоступный источник и пустой улов — разные вещи.** «Ничего нового» и «мы не знаем»
 * выглядят одинаково только в плохом отчёте. Источник, который не ответил, попадает в
 * файл со своей ошибкой, печатается отдельным списком, и прогон выходит кодом 3 —
 * расписание в этом случае краснеет, а не рапортует о спокойной неделе.
 *
 *   node scripts/harvest-evidence.mjs                 # окно от прошлого прогона
 *   node scripts/harvest-evidence.mjs --since 2026-08-01
 *   node scripts/harvest-evidence.mjs --dry-run       # ничего не писать на диск
 *
 * Порядок работы с уловом — docs/RUNBOOK_KNOWLEDGE_CATALOG.md.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = new URL('../content/harvest/', import.meta.url);
const QUERIES = fileURLToPath(new URL('queries.json', HERE));
const STATE = fileURLToPath(new URL('state.json', HERE));
const CATALOG = fileURLToPath(new URL('../app/knowledge-catalog.json', import.meta.url));
const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Что проходит отбор. Список закрытый и совпадает с `docs/EDITORIAL_PROTOCOL_MED.md`:
 * систематический обзор, метаанализ, РКИ, клиническое руководство. Всё остальное —
 * препринт, одиночное наблюдательное, обзор без метода, письмо в редакцию — отсеивается
 * с причиной, а не молча: причина и есть то, что человек читает в улове.
 */
const ACCEPTED_TYPES = new Map([
  ['systematic review', 'систематический обзор'],
  ['meta-analysis', 'метаанализ'],
  ['randomized controlled trial', 'рандомизированное испытание'],
  ['guideline', 'клиническое руководство'],
  ['practice guideline', 'клиническое руководство'],
]);

/** Норма недели. Ноль — нормальный результат, четыре — повод остановиться и подумать. */
const WEEKLY_LIMIT = 3;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sinceArg = argValue('--since');
const limitArg = Number(argValue('--limit') ?? '30');

function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Неделя по ISO 8601: четверг той же недели определяет год. Без этого улов последних
 * дней декабря лёг бы в файл следующего года — и нашёлся бы там через год.
 */
function isoWeek(date) {
  const point = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = point.getUTCDay() || 7;
  point.setUTCDate(point.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(point.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((point - yearStart) / 86400000 + 1) / 7);
  return `${point.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Запрос с одной повторной попыткой на «слишком часто».
 *
 * E-utilities без ключа держат три запроса в секунду и отвечают 429, если частить.
 * Прогон из тринадцати источников упирался в это на четвёртом: половина источников
 * приезжала недоступной, то есть выглядела как поломка, будучи обычной вежливостью
 * чужого сервера. Пауза между запросами и одна повторная попытка это снимают.
 */
async function fetchText(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'habitoff-harvest/1.0 (+https://habitoff.ru)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 429 && attempt < 2) {
    await wait(2000 * (attempt + 1));
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

/** PubMed: сначала идентификаторы за окно, потом их описания. */
async function fromPubmed(source, since, until) {
  const search = new URL(`${EUTILS}/esearch.fcgi`);
  search.search = new URLSearchParams({
    db: 'pubmed',
    term: source.term,
    datetype: 'edat',
    mindate: since.replaceAll('-', '/'),
    maxdate: until.replaceAll('-', '/'),
    retmax: String(limitArg),
    retmode: 'json',
  }).toString();
  const ids = JSON.parse(await fetchText(search)).esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  await wait(400);

  const summary = new URL(`${EUTILS}/esummary.fcgi`);
  summary.search = new URLSearchParams({
    db: 'pubmed',
    id: ids.join(','),
    retmode: 'json',
  }).toString();
  const result = JSON.parse(await fetchText(summary)).result ?? {};
  return ids
    .map((id) => result[id])
    .filter(Boolean)
    .map((row) => ({
      id: `pmid:${row.uid}`,
      title: row.title ?? '',
      publication: row.fulljournalname ?? row.source ?? '',
      date: row.sortpubdate?.slice(0, 10).replaceAll('/', '-') ?? '',
      url: `https://pubmed.ncbi.nlm.nih.gov/${row.uid}/`,
      doi: (row.articleids ?? []).find((entry) => entry.idtype === 'doi')?.value ?? null,
      types: (row.pubtype ?? []).map((value) => String(value).toLowerCase()),
    }));
}

/**
 * RSS и Atom одним разбором. Полноценного парсера XML здесь нет намеренно: ведомственная
 * лента — это заголовок, ссылка и дата, а зависимость ради трёх полей переживёт больше
 * ревизий, чем сам скрипт.
 */
function parseFeed(xml) {
  const items = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? [];
  return items.map((item) => {
    const pick = (tag) => {
      const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      if (!match) return '';
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    };
    const href = item.match(/<link[^>]*href="([^"]+)"/);
    return {
      title: pick('title'),
      link: href ? href[1] : pick('link'),
      date: pick('pubDate') || pick('updated') || pick('published') || pick('dc:date'),
    };
  });
}

async function fromFeed(source, since, until) {
  const items = parseFeed(await fetchText(source.url));
  const from = new Date(`${since}T00:00:00Z`).getTime();
  const to = new Date(`${until}T23:59:59Z`).getTime();
  return items
    .filter((item) => {
      const stamp = Date.parse(item.date);
      // Лента без даты не отбрасывается: у ведомств это обычное дело, и потерять из-за
      // этого регуляторное решение хуже, чем показать человеку лишнюю строку.
      return Number.isNaN(stamp) ? true : stamp >= from && stamp <= to;
    })
    .filter((item) => {
      const haystack = item.title.toLowerCase();
      return (source.keywords ?? []).some((word) => haystack.includes(word.toLowerCase()));
    })
    .map((item) => ({
      id: item.link || `${source.id}:${item.title}`,
      title: item.title,
      publication: source.title,
      date: Number.isNaN(Date.parse(item.date))
        ? ''
        : new Date(item.date).toISOString().slice(0, 10),
      url: item.link,
      doi: null,
      // У ведомственной ленты типа публикации нет. Решение регулятора проходит отбор по
      // существу — но каким именно решением оно является, определяет человек.
      types: ['регуляторный источник'],
    }));
}

/** Слова, по которым ищется дубль. Короткие и служебные выкидываются. */
function keywords(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4),
  );
}

/**
 * Похожая карточка в каталоге. Не «умный» поиск: пересечение значимых слов заголовка с
 * утверждением карточки. Задача — не решить за человека, а показать, где смотреть:
 * находка, повторяющая опубликованное, — это правка карточки, а не новая.
 */
function looksLikeExisting(title, catalog) {
  const words = keywords(title);
  let best = null;
  for (const card of catalog) {
    const shared = [...keywords(`${card.claim} ${card.known}`)].filter((word) => words.has(word));
    if (shared.length >= 3 && (!best || shared.length > best.shared)) {
      best = { code: card.code, shared: shared.length };
    }
  }
  return best;
}

const queries = readJson(QUERIES, { sources: [] });
const state = readJson(STATE, { lastRun: null, seen: [], rejected: [] });
const catalog = readJson(CATALOG, []);
const seen = new Set(state.seen ?? []);

const until = today();
const since = sinceArg ?? state.lastRun ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

const sources = [];
const candidates = [];

const collected = new Set();

for (const source of queries.sources) {
  try {
    const found =
      source.type === 'pubmed'
        ? await fromPubmed(source, since, until)
        : await fromFeed(source, since, until);
    sources.push({ id: source.id, status: 'ok', found: found.length });
    for (const item of found) {
      // Один и тот же обзор приходит из нескольких запросов — кокрейновский и по типу
      // публикации. В улове он должен быть один: дважды прочитать одно и то же значит
      // потратить норму недели на дубль самого себя.
      if (collected.has(item.id)) continue;
      collected.add(item.id);
      candidates.push({ ...item, source: source.id });
    }
    await wait(400);
  } catch (error) {
    // Ровно здесь проходит граница между «ничего нового» и «мы не знаем».
    sources.push({
      id: source.id,
      status: 'недоступен',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const accepted = [];
const rejected = [];

for (const item of candidates) {
  if (seen.has(item.id)) continue;
  const kind = item.types.map((type) => ACCEPTED_TYPES.get(type)).find(Boolean);
  if (!kind && item.types[0] !== 'регуляторный источник') {
    rejected.push({ id: item.id, title: item.title, reason: `тип не проходит: ${item.types.join(', ') || 'не указан'}` });
    continue;
  }
  const duplicate = looksLikeExisting(item.title, catalog);
  const entry = {
    ...item,
    kind: kind ?? 'регуляторное решение',
    ...(duplicate ? { duplicate_of: duplicate.code } : {}),
  };
  if (accepted.length < WEEKLY_LIMIT) accepted.push(entry);
  else rejected.push({ id: item.id, title: item.title, reason: 'норма недели исчерпана — отложено до следующего прогона' });
}

const week = isoWeek(new Date());
const catch_ = {
  week,
  window: { since, until },
  sources,
  accepted,
  rejected,
};

const unreachable = sources.filter((source) => source.status !== 'ok');
const target = fileURLToPath(new URL(`${week}.json`, HERE));

if (!dryRun) {
  writeFileSync(target, `${JSON.stringify(catch_, null, 2)}\n`, 'utf8');
  writeFileSync(
    STATE,
    `${JSON.stringify(
      {
        lastRun: until,
        // Рассмотренное не рассматривается второй раз — ни принятое, ни отклонённое.
        seen: [...seen, ...candidates.map((item) => item.id)].slice(-2000),
        rejected: [...(state.rejected ?? []), ...rejected.map(({ id, reason }) => ({ id, reason, week }))].slice(-500),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

console.log(`Улов недели ${week}, окно ${since} … ${until}`);
console.log(`  источников опрошено: ${sources.length}, недоступно: ${unreachable.length}`);
console.log(`  кандидатов: ${candidates.length}, прошло отбор: ${accepted.length}, отклонено: ${rejected.length}`);
for (const item of accepted) {
  console.log(`  + ${item.kind}: ${item.title}`);
  if (item.duplicate_of) console.log(`      похоже на карточку ${item.duplicate_of} — возможно, это правка, а не новая`);
}
for (const source of unreachable) console.log(`  ! источник ${source.id} не ответил: ${source.error}`);
if (!dryRun) console.log(`Файл улова: content/harvest/${week}.json`);
if (!accepted.length && !unreachable.length) console.log('Ноль карточек — нормальный результат недели.');
// Ручные источники не опрашиваются машиной и молчанием считаться не могут. Их
// перечисление в конце прогона — единственное, что отличает «не смотрели» от «смотрели».
if (queries.manual?.length) {
  console.log('  Руками, по списку manual в queries.json:');
  for (const source of queries.manual) console.log(`    ${source.title} — ${source.url}`);
}

// Пустой улов при живых источниках — это ответ. Молчащий источник — это отсутствие
// ответа, и расписание обязано это показать.
process.exit(unreachable.length ? 3 : 0);
