#!/usr/bin/env node
/**
 * Выгрузить опубликованный каталог «Факты и Мифы» в репозиторий.
 *
 * Файл `app/knowledge-catalog.json` **коммитится**, и это осознанная перемена позиции.
 * До 05.09.2026 правило звучало как «каталог не копируется в статику», и держалось оно
 * на том, что копию правят руками, а значит она разъезжается с базой. ADR-0017 переписал
 * правило по факту: разница не в том, есть копия или нет, а в том, кто её обновляет.
 * Копия, набранная руками, запрещена по-прежнему. Копия, снятая этим скриптом, — это
 * выгрузка с датой и кодом ревизии, её видно в диффе, и обновляется она одной командой.
 *
 * Почему не на выкладке. Собирать каталог из базы прямо в сборке значит: сборка в CI и
 * сборка на сервере дают разный результат, диффа контента никто не видит, а страницы,
 * которые уедут в индекс, появляются в обход ревью. Выгрузка в репозиторий делает
 * изменение контента обычным изменением: коммит, PR, история.
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
           m.trigger_codes as triggers, m.product_types as products,
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
           '{}'::text[] as triggers, f.product_types as products,
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

function fromDatabase() {
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
      ['-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'postgres', '-tAc', SQL],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, PGPASSWORD: pgpassword } },
    ).trim();
  } catch (error) {
    console.error(`База не ответила: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
}

const rows = JSON.parse(fromDatabase());
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('Каталог пуст. Пустой раздел в репозиторий не кладётся.');
  process.exit(2);
}

// Сортировка по коду, а не по sort_order: файл лежит в git, и его диффы читают люди.
// Порядок показа задаёт `sort_order`, он остаётся полем.
rows.sort((left, right) => left.code.localeCompare(right.code));
for (const row of rows) {
  row.triggers = row.triggers ?? [];
  row.products = row.products ?? [];
}

const payload = `${JSON.stringify(rows, null, 2)}\n`;

if (check) {
  let current = '';
  try {
    current = readFileSync(target, 'utf8');
  } catch {
    console.error('Выгрузки нет в репозитории. Обнови: node scripts/dump-knowledge-catalog.mjs');
    process.exit(1);
  }
  if (current === payload) {
    console.log(`Выгрузка совпадает с базой: карточек ${rows.length}.`);
    process.exit(0);
  }
  const inFile = new Map(JSON.parse(current).map((row) => [row.code, row]));
  const inDb = new Map(rows.map((row) => [row.code, row]));
  const added = [...inDb.keys()].filter((code) => !inFile.has(code));
  const gone = [...inFile.keys()].filter((code) => !inDb.has(code));
  const changed = [...inDb.keys()].filter(
    (code) => inFile.has(code) && JSON.stringify(inFile.get(code)) !== JSON.stringify(inDb.get(code)),
  );
  console.error('Выгрузка разошлась с базой.');
  if (added.length) console.error(`  появились: ${added.join(', ')}`);
  if (gone.length) console.error(`  пропали:   ${gone.join(', ')}`);
  if (changed.length) console.error(`  изменены:  ${changed.join(', ')}`);
  console.error('Обнови: node scripts/dump-knowledge-catalog.mjs');
  process.exit(1);
}

writeFileSync(target, payload, 'utf8');
const thin = rows.filter((row) => `${row.claim} ${row.known} ${row.changes} ${row.detail}`.length < 400);
console.log(`Выгружено карточек: ${rows.length} (фактов и мифов вместе).`);
if (thin.length) {
  // Не отказ и не сокрытие: страницы всё равно собираются. Решение о том, дописывать
  // ли карточку, принимает владелец, а не сборка.
  console.log(`Меньше 400 знаков текста — стоит дописать: ${thin.map((row) => row.code).join(', ')}`);
}
