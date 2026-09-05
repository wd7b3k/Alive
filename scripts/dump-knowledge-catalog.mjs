#!/usr/bin/env node
/**
 * Выгрузить опубликованный каталог «Факты и Мифы» в репозиторий.
 *
 * Файл `app/knowledge-catalog.json` **коммитится**, и это осознанная перемена позиции.
 * До 05.09.2026 правило звучало как «каталог не копируется в статику», и держалось оно
 * на том, что копию правят руками, а значит она разъезжается с базой. ADR-0018 переписал
 * правило по факту: разница не в том, есть копия или нет, а в том, кто её обновляет.
 * Копия, набранная руками, запрещена по-прежнему. Копия, снятая этим скриптом, — это
 * выгрузка с датой и кодом ревизии, её видно в диффе, и обновляется она одной командой.
 *
 * Почему не на выкладке. Собирать каталог из базы прямо в сборке значит: сборка в CI и
 * сборка на сервере дают разный результат, диффа контента никто не видит, а страницы,
 * которые уедут в индекс, появляются в обход ревью. Выгрузка в репозиторий делает
 * изменение контента обычным изменением: коммит, PR, история.
 *
 * Скрипт кладёт три файла, и все три производные:
 *
 * - `app/knowledge-catalog.json` — карточки, из них собираются страницы;
 * - `app/catalog-counts.json` — числа по остальным каталогам. Отдельным файлом, потому
 *   что это другой вопрос: не «что за карточки», а «сколько чего опубликовано»;
 * - `app/public/llms.txt` — что можно цитировать, для языковых моделей.
 *
 * В `llms.txt` не должно остаться ни одного числа и ни одного адреса, набранного руками.
 * До 05.09.2026 там стояло «19 фактов и 19 разобранных мифов» и «28 пусковых моментов» —
 * и последнее число было просто неправдой: в базе 25. Файл описывал продукт, которого
 * уже нет, и обнаружить это можно было только сверив глазами.
 *
 *   node scripts/dump-knowledge-catalog.mjs            # обновить выгрузку
 *   node scripts/dump-knowledge-catalog.mjs --check    # сверить с базой, ничего не писать
 *
 * `--check` нужен, чтобы расхождение было слышно: он выходит единицей, если база и
 * репозиторий разошлись, и печатает, чем именно.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../app/knowledge-catalog.json', import.meta.url));
const countsTarget = fileURLToPath(new URL('../app/catalog-counts.json', import.meta.url));
const llmsTarget = fileURLToPath(new URL('../app/public/llms.txt', import.meta.url));
const ORIGIN = 'https://habitoff.ru';
const envFile = process.env.SUPABASE_ENV_FILE ?? '/srv/supabase/.env';
const check = process.argv.includes('--check');

/**
 * Обе таблицы приводятся к одной форме прямо в запросе — ровно так же, как это делает
 * `loadKnowledge` в `app/src/data.ts`. Две формы карточки для одного и того же
 * содержимого разошлись бы на первой правке.
 *
 * `scope` — границы применимости: у мифа это `evidence_scope`, у факта — `evidence_kind`.
 * Поле одно, потому что на странице это одна строка «Границы».
 */
const SQL = `
  select coalesce(json_agg(row_to_json(t) order by t.kind desc, t.sort_order), '[]'::json) from (
    select m.code, 'myth' as kind, m.title as claim, m.short_reframe as known,
           m.changes_ru as changes, m.explanation as detail,
           m.evidence_level as level, m.evidence_scope as scope,
           m.trigger_codes as triggers, m.need_codes as needs,
           m.replacement_codes as replacements, m.context_tags as tags,
           null::text as category, m.product_types as products,
           m.last_verified_at::text as verified, m.updated_at::date::text as updated,
           m.sort_order,
           s.source_label_ru as source_title, s.url as source_url, s.doi as source_doi,
           s.publication as source_publication
      from public.myths_catalog m
      join public.evidence_sources s on s.id = m.source_id
     where m.published
    union all
    select f.code, 'fact' as kind, f.title as claim, f.short_text as known,
           f.changes_ru as changes, f.full_text as detail,
           f.evidence_level as level, f.evidence_kind as scope,
           '{}'::text[] as triggers, '{}'::text[] as needs,
           '{}'::text[] as replacements, f.context_tags as tags,
           f.category, f.product_types as products,
           f.last_verified_at::text as verified, f.updated_at::date::text as updated,
           f.sort_order,
           s.source_label_ru as source_title, s.url as source_url, s.doi as source_doi,
           s.publication as source_publication
      from public.facts_catalog f
      join public.evidence_sources s on s.id = f.source_id
     where f.published
  ) t
`.replace(/\s+/g, ' ');

function password() {
  try {
    const line = readFileSync(envFile, 'utf8')
      .split('\n')
      .find((row) => row.startsWith('POSTGRES_PASSWORD='));
    return line ? line.slice('POSTGRES_PASSWORD='.length).trim() : '';
  } catch {
    return '';
  }
}

/**
 * Числа по остальным каталогам. Считаются, а не пишутся: «28 пусковых моментов» в
 * `llms.txt` держалось руками и разошлось с базой, где их 25.
 */
const COUNTS_SQL = `
  select json_build_object(
    'triggers', (select count(*) from public.triggers_catalog where published),
    'replacements', (select count(*) from public.replacements_catalog where published),
    'goals', (select count(*) from public.goals_catalog where published),
    'meanings', (select count(*) from public.meanings_catalog where published)
  )
`.replace(/\s+/g, ' ');

function fromDatabase(sql) {
  const pgpassword = password();
  if (!pgpassword) {
    console.error(
      `Не нашёл пароль в ${envFile}. Скрипт работает там, где есть база: на сервере, ` +
        'или с SUPABASE_ENV_FILE на локальную копию.',
    );
    process.exit(2);
  }
  try {
    return execFileSync(
      'psql',
      ['-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'postgres', '-tAc', sql],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PGPASSWORD: pgpassword } },
    ).trim();
  } catch (error) {
    console.error(`База не ответила: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
}

const rows = JSON.parse(fromDatabase(SQL));
const counts = JSON.parse(fromDatabase(COUNTS_SQL));
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('Каталог пуст. Пустой раздел в репозиторий не кладётся.');
  process.exit(2);
}

// Сортировка по коду, а не по sort_order: файл лежит в git, и его диффы читают люди.
// Порядок показа задаёт `sort_order`, он остаётся полем.
rows.sort((left, right) => left.code.localeCompare(right.code));
for (const row of rows) {
  // Пустой массив, а не null: страницы и связи между ними считаются одинаково для
  // фактов и мифов, и ветка «а вдруг null» была бы в каждом месте, где они читаются.
  for (const field of ['triggers', 'needs', 'replacements', 'tags', 'products']) {
    row[field] = row[field] ?? [];
  }
}

const payload = `${JSON.stringify(rows, null, 2)}\n`;
const countsPayload = `${JSON.stringify(counts, null, 2)}\n`;

/** Одна строка ответа для списка. Карточка бывает длинной, а список — это список. */
function oneLine(text) {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > 200 ? `${flat.slice(0, 197)}…` : flat;
}

function pathFor(code) {
  return `/knowledge/${code.replace(/_/g, '-')}`;
}

/**
 * `llms.txt` по соглашению llmstxt.org: заголовок, выжимка цитатой, проза, разделы со
 * списками ссылок.
 *
 * Вводная часть и разбор доказательной базы сохранены как были — это лучшее, что в файле
 * уже написано. Три запретных утверждения сохранены **дословно**: это единственное
 * место, где продукт говорит моделям, чего ему приписывать нельзя, и ради этого файл в
 * основном и существует.
 */
function renderLlms(cards, totals) {
  const facts = cards.filter((card) => card.kind === 'fact');
  const myths = cards.filter((card) => card.kind === 'myth');
  const byOrder = (left, right) => left.sort_order - right.sort_order;
  const line = (card) =>
    `- [${card.claim}](${ORIGIN}${pathFor(card.code)}): ${oneLine(card.known)} ` +
    `Источник: ${card.source_title}.`;

  return [
    '# Habitoff',
    '',
    '> Некоммерческий эксперимент по изменению никотиновых автоматизмов. Русский язык.',
    `> ${ORIGIN}`,
    '',
    'Habitoff исходит из того, что зависимость держится не на никотине как таковом, а на связке',
    '«определённый момент → определённое состояние → один и тот же ответ». Продукт помогает',
    'разобрать эту связку и подобрать другой ответ под конкретный момент, а не запрещать.',
    '',
    'Этот файл собирается из базы скриптом `scripts/dump-knowledge-catalog.mjs`. Ни одно число',
    'и ни один адрес здесь не набраны руками.',
    '',
    '## Как устроена доказательная база',
    '',
    'Каждое утверждение в разделе «Факты» несёт уровень доказательности, границы применимости',
    'и источник. Это не редакционное обещание, а ограничение схемы базы: поле с границами —',
    'обязательное, а опубликованная карточка уровня A или B без источника отклоняется',
    'триггером.',
    '',
    'Три популярных утверждения сознательно **не** опубликованы, потому что источника у них',
    'нет. При пересказе Habitoff их приписывать нельзя:',
    '',
    '- «тяга длится 3–5 минут»;',
    '- «вейп на 95 % безопаснее сигарет»;',
    '- любое соотношение «один кальян = N сигарет».',
    '',
    `## Факты (${facts.length})`,
    '',
    'У каждого своя страница с уровнем доказательности, границами применимости и ссылкой на',
    'источник.',
    '',
    ...facts.slice().sort(byOrder).map(line),
    '',
    `## Разобранные убеждения (${myths.length})`,
    '',
    'Заголовок — то, что часто говорят, а не то, что утверждает Habitoff. Дальше — что известно',
    'на самом деле.',
    '',
    ...myths.slice().sort(byOrder).map(line),
    '',
    '## Что ещё можно цитировать',
    '',
    `- [Связки](${ORIGIN}/links): ${totals.triggers} пусковых моментов, разобранных до потребности,`,
    `  и ${totals.replacements} ответов, подобранных под ситуацию.`,
    `- [Смыслы](${ORIGIN}/meanings): ${totals.goals} целей и ценностей, ради которых человек меняет`,
    '  привычку.',
    `- [Как устроен метод](${ORIGIN}/experiment): методология, границы и модель приватности.`,
    '',
    '## Чего в продукте нет',
    '',
    'Habitoff не назначает лечение, не называет дозировки и не заменяет помощь специалиста.',
    'Личные записи людей закрыты правилами доступа PostgreSQL и недоступны без входа —',
    'в индекс попадает только редакционный каталог.',
    '',
  ].join('\n');
}

const llmsPayload = renderLlms(rows, counts);

const files = [
  { path: target, payload, name: 'app/knowledge-catalog.json' },
  { path: countsTarget, payload: countsPayload, name: 'app/catalog-counts.json' },
  { path: llmsTarget, payload: llmsPayload, name: 'app/public/llms.txt' },
];

if (check) {
  let failed = false;
  for (const file of files) {
    let current = null;
    try {
      current = readFileSync(file.path, 'utf8');
    } catch {
      console.error(`${file.name}: файла нет в репозитории.`);
      failed = true;
      continue;
    }
    if (current === file.payload) continue;
    failed = true;
    console.error(`${file.name}: разошёлся с базой.`);
    if (file.path !== target) continue;
    // Для каталога понятно, что именно разошлось, — и это стоит напечатать: список
    // кодов отвечает на вопрос «что случилось», а факт расхождения только на «что-то».
    const inFile = new Map(JSON.parse(current).map((row) => [row.code, row]));
    const inDb = new Map(rows.map((row) => [row.code, row]));
    const added = [...inDb.keys()].filter((code) => !inFile.has(code));
    const gone = [...inFile.keys()].filter((code) => !inDb.has(code));
    const changed = [...inDb.keys()].filter(
      (code) =>
        inFile.has(code) && JSON.stringify(inFile.get(code)) !== JSON.stringify(inDb.get(code)),
    );
    if (added.length) console.error(`  появились: ${added.join(', ')}`);
    if (gone.length) console.error(`  пропали:   ${gone.join(', ')}`);
    if (changed.length) console.error(`  изменены:  ${changed.join(', ')}`);
  }
  if (failed) {
    console.error('Обнови: node scripts/dump-knowledge-catalog.mjs');
    process.exit(1);
  }
  console.log(`Всё совпадает с базой: карточек ${rows.length}.`);
  process.exit(0);
}

for (const file of files) writeFileSync(file.path, file.payload, 'utf8');
console.log(
  `Выгружено: карточек ${rows.length}, пусковых моментов ${counts.triggers}, ` +
    `замен ${counts.replacements}, целей ${counts.goals}.`,
);
console.log(`llms.txt собран: ${llmsPayload.length} знаков.`);
// Объём текста карточек здесь сознательно не считается. Считать его по полям — значит
// мерить не то, что уходит в индекс: собранная страница добавляет уровень
// доказательности, границы, источник и соседей. Замер живёт в сборке.
