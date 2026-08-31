#!/usr/bin/env node
/**
 * Замок утверждений: коды и хэши, без самих текстов.
 *
 * Зачем он существует. Статьи базы знаний не пересказывают утверждения каталога своими
 * словами — они цитируют их по коду (`{{claim:myth_vape_harmless}}`), а текст
 * подставляется на сборке из базы. Второго текста утверждения в репозитории не
 * существует, поэтому расходиться нечему: правка карточки миграцией доезжает до статьи
 * на ближайшей выкладке, потому что выкладка и применение миграций — один процесс
 * (`docs/RELEASE_POLICY.md`).
 *
 * Но у сборки в CI базы нет. Чтобы проверка «код существует и опубликован» работала и
 * там, рядом лежит этот замок: **только коды, вид, уровень и хэш текста**. Текстов в нём
 * нет намеренно — иначе в репозитории появилась бы та самая вторая копия, ради
 * отсутствия которой всё и сделано.
 *
 * Что из этого следует:
 *
 * - статья, сославшаяся на код, которого нет в замке, роняет сборку где угодно;
 * - сборка, у которой есть доступ к каталогу, дополнительно сверяет хэш. Разошёлся —
 *   значит карточку правили, а статью вокруг неё никто не перечитывал, и это отказ, а
 *   не предупреждение;
 * - замок пересобирается тем, кто правит каталог, и коммитится вместе с миграцией.
 *
 * Чтение только чтение: скрипт ходит в PostgREST под публикуемым ключом — тем же, что
 * уезжает в браузер. Не под сервисным: anon-политики фильтруют по `published`, а
 * сервисный ключ вынес бы в статику редакционный черновик.
 *
 * Использование:
 *
 *   node scripts/knowledge-lock.mjs                 # пересобрать замок
 *   node scripts/knowledge-lock.mjs --check         # сверить, не переписывая (код 1 при расхождении)
 *   node scripts/knowledge-lock.mjs --baseline FILE # снимок метаданных каталога (без текстов)
 *
 * Ключи берутся из `app/.env` или из переменных окружения:
 * `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LOCK_PATH = join(root, 'content', 'knowledge', 'claims.lock.json');

/**
 * Переменные окружения сборки.
 *
 * `app/.env` в git нет и не будет — там ключи. Поэтому значения ищутся сначала в
 * окружении процесса, потом в файле: так один и тот же скрипт работает и на сервере
 * выкладки, и локально, и в разовом прогоне с ключом в командной строке.
 */
export function buildEnv(appDir = join(root, 'app')) {
  const fromFile = {};
  const file = join(appDir, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) fromFile[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
  const url = process.env.VITE_SUPABASE_URL || fromFile.VITE_SUPABASE_URL || '';
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fromFile.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  return { url: url.replace(/\/+$/, ''), key };
}

const SOURCE_COLUMNS =
  'evidence_sources(title_original,source_label_ru,url,publication,publication_date)';

function source(row) {
  const one = Array.isArray(row?.evidence_sources)
    ? row.evidence_sources[0]
    : row?.evidence_sources;
  if (!one) return null;
  const title = one.source_label_ru || one.title_original;
  if (!title) return null;
  return {
    title,
    original: one.title_original,
    url: one.url,
    publication: one.publication,
    year: one.publication_date ? Number(String(one.publication_date).slice(0, 4)) || null : null,
  };
}

/**
 * Опубликованные карточки обоих каталогов, приведённые к одной форме.
 *
 * Форма совпадает с той, к которой их приводит `loadKnowledge` в приложении: дальше
 * разница между фактом и мифом — одно поле `kind`. Расхождение между тем, что видит
 * читатель статьи, и тем, что видит человек в разделе, было бы худшим из возможных.
 */
export async function fetchCounts({ url, key }) {
  const client = restClient({ url, key });
  const [triggers, replacements] = await Promise.all([
    client('triggers_catalog?select=code&published=eq.true'),
    client('replacements_catalog?select=code&published=eq.true'),
  ]);
  return { triggers: triggers.length, replacements: replacements.length };
}

function restClient({ url, key }) {
  if (!url || !key) {
    throw new Error(
      'Нет доступа к каталогу: не заданы VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return async function query(path) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      throw new Error(`Каталог не ответил (${path}): ${response.status} ${await response.text()}`);
    }
    return response.json();
  };
}

export async function fetchClaims({ url, key }) {
  const query = restClient({ url, key });
  const [facts, myths] = await Promise.all([
    query(
      `facts_catalog?select=code,title,short_text,full_text,changes_ru,evidence_level,product_types,surfaces,sort_order,${SOURCE_COLUMNS}&published=eq.true&order=sort_order`,
    ),
    query(
      `myths_catalog?select=code,title,short_reframe,explanation,changes_ru,evidence_level,product_types,surfaces,trigger_codes,sort_order,${SOURCE_COLUMNS}&published=eq.true&order=sort_order`,
    ),
  ]);
  const claims = new Map();
  for (const row of facts) {
    claims.set(row.code, {
      code: row.code,
      kind: 'fact',
      claim: row.title,
      known: row.short_text,
      changes: row.changes_ru,
      detail: row.full_text,
      level: level(row.evidence_level),
      product_types: row.product_types ?? [],
      surfaces: row.surfaces ?? [],
      trigger_codes: [],
      sort_order: row.sort_order,
      source: source(row),
    });
  }
  for (const row of myths) {
    claims.set(row.code, {
      code: row.code,
      kind: 'myth',
      claim: row.title,
      known: row.short_reframe,
      changes: row.changes_ru,
      detail: row.explanation,
      level: level(row.evidence_level),
      product_types: row.product_types ?? [],
      surfaces: row.surfaces ?? [],
      trigger_codes: row.trigger_codes ?? [],
      sort_order: row.sort_order,
      source: source(row),
    });
  }
  return claims;
}

function level(value) {
  return value === 'A' || value === 'B' ? value : 'C';
}

/**
 * Хэш одного утверждения.
 *
 * Считается по всему, что статья показывает читателю: сам текст, границы, уровень и
 * источник. Правка любого из этих полей обязана заметить статью — иначе смысл замка
 * теряется ровно там, где он нужен: границы поменяли, а статья вокруг них осталась
 * прежней.
 */
export function claimHash(claim) {
  const canonical = JSON.stringify([
    claim.kind,
    claim.claim,
    claim.known,
    claim.changes,
    claim.detail,
    claim.level,
    claim.source?.title ?? null,
    claim.source?.url ?? null,
    claim.source?.publication ?? null,
    claim.source?.year ?? null,
  ]);
  return createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 32);
}

export function buildLock(claims, generated, counts) {
  const entries = [...claims.values()].sort((a, b) => a.code.localeCompare(b.code));
  return {
    note:
      'Коды и хэши утверждений каталога. Текстов здесь нет намеренно: второй копии ' +
      'текста в репозитории не существует. Пересобирается scripts/knowledge-lock.mjs.',
    generated,
    algorithm: 'sha256-32',
    // Числа, которые до 31.08.2026 лежали в llms.txt руками написанной строкой
    // (карточка доски chisla-v-llms-txt). Здесь они машинные и приезжают из базы;
    // сборка подставляет их в файл, а не переписывает его глазами.
    counts: {
      facts: entries.filter((claim) => claim.kind === 'fact').length,
      myths: entries.filter((claim) => claim.kind === 'myth').length,
      triggers: counts.triggers,
      replacements: counts.replacements,
    },
    claims: Object.fromEntries(
      entries.map((claim) => [
        claim.code,
        { kind: claim.kind, level: claim.level, hash: claimHash(claim) },
      ]),
    ),
  };
}

export function readLock(path = LOCK_PATH) {
  if (!existsSync(path)) {
    throw new Error(
      `Нет замка утверждений ${path}. Пересобрать: node scripts/knowledge-lock.mjs`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Снимок метаданных каталога: коды, вид, уровень, поверхности, порядок, привязки. */
function baseline(claims) {
  const rows = [...claims.values()].sort((a, b) =>
    a.kind === b.kind ? a.sort_order - b.sort_order : a.kind.localeCompare(b.kind),
  );
  return {
    note:
      'Снимок метаданных опубликованного каталога. Текстов здесь нет: они живут в базе. ' +
      'Служит для сверки «до» и «после» сессии — база знаний обязана быть только читателем.',
    taken: new Date().toISOString().slice(0, 10),
    counts: {
      fact: rows.filter((row) => row.kind === 'fact').length,
      myth: rows.filter((row) => row.kind === 'myth').length,
    },
    cards: rows.map((row) => ({
      code: row.code,
      kind: row.kind,
      level: row.level,
      product_types: row.product_types,
      surfaces: row.surfaces,
      sort_order: row.sort_order,
      trigger_codes: row.trigger_codes,
      has_source: Boolean(row.source),
    })),
  };
}

const runDirectly =
  Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (runDirectly) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const baselineAt = args.indexOf('--baseline');
  const env = buildEnv();
  let claims;
  try {
    claims = await fetchClaims(env);
  } catch (error) {
    console.error(String(error.message ?? error));
    process.exit(1);
  }

  if (baselineAt !== -1) {
    const target = args[baselineAt + 1];
    if (!target) {
      console.error('--baseline требует путь к файлу.');
      process.exit(1);
    }
    writeFileSync(target, `${JSON.stringify(baseline(claims), null, 2)}\n`, 'utf8');
    console.log(`Снимок каталога записан: ${target} (${claims.size} карточек).`);
    process.exit(0);
  }

  let counts;
  try {
    counts = await fetchCounts(env);
  } catch (error) {
    console.error(String(error.message ?? error));
    process.exit(1);
  }
  const previous = existsSync(LOCK_PATH) ? readLock() : null;
  const next = buildLock(
    claims,
    previous?.generated ?? new Date().toISOString().slice(0, 10),
    counts,
  );

  if (check) {
    const same =
      previous &&
      JSON.stringify(previous.claims) === JSON.stringify(next.claims) &&
      JSON.stringify(previous.counts) === JSON.stringify(next.counts);
    if (same) {
      console.log(`Замок совпадает с каталогом: ${claims.size} утверждений.`);
      process.exit(0);
    }
    console.error(
      'Замок разошёлся с каталогом. Карточки правились — перечитай статьи, которые их ' +
        'цитируют, и пересобери: node scripts/knowledge-lock.mjs',
    );
    process.exit(1);
  }

  next.generated = new Date().toISOString().slice(0, 10);
  writeFileSync(LOCK_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  console.log(`Замок пересобран: ${claims.size} утверждений → ${LOCK_PATH}`);
}
