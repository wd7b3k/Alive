#!/usr/bin/env node
/**
 * Выгрузить разобранные убеждения с источниками — для структурированных данных.
 *
 * Зачем это отдельный шаг. Разметка `/knowledge` обязана нести `citation` на источник
 * у каждого утверждения, а тексты каталога живут в базе: только по мифам их правили
 * одиннадцать миграций, и часть из них переписывала формулировки целиком. Копия в
 * репозитории разошлась бы с базой на следующей же миграции, а `docs/SEO_AND_ANALYTICS.md`
 * называет такую копию хуже отсутствия — и называет справедливо: расхождение попадёт
 * в сниппет выдачи и в пересказ языковой модели, где его никто не проверит.
 *
 * Поэтому источник разметки — сама база, а выгрузка делается на выкладке, рядом со
 * сборкой. Файл `app/knowledge-schema.json` в git не попадает: он производный.
 *
 * Если базы нет — в CI её и не бывает, — скрипт молча пишет пустой список. Сборка
 * тогда просто не кладёт `ItemList`; остальная разметка от этого не зависит.
 *
 *   node scripts/dump-knowledge-for-schema.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../app/knowledge-schema.json', import.meta.url));
const envFile = process.env.SUPABASE_ENV_FILE ?? '/srv/supabase/.env';

// Одной строкой и через json_agg: разбирать табличный вывод psql — это писать парсер
// под данные, в которых есть переводы строк и кавычки.
const SQL = `
  select coalesce(json_agg(row_to_json(t) order by t.sort_order), '[]'::json)
  from (
    select m.code, m.title, m.short_reframe as answer,
           s.source_label_ru as "sourceLabel", s.url as "sourceUrl", s.doi, m.sort_order
    from public.myths_catalog m
    join public.evidence_sources s on s.id = m.source_id
    where m.published and s.url is not null and btrim(s.url) <> ''
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
  if (!pgpassword) return null;
  try {
    return execFileSync(
      'psql',
      ['-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'postgres', '-tAc', SQL],
      { encoding: 'utf8', env: { ...process.env, PGPASSWORD: pgpassword } },
    ).trim();
  } catch {
    return null;
  }
}

const raw = fromDatabase();
let entries = [];
if (raw) {
  try {
    entries = JSON.parse(raw);
  } catch {
    entries = [];
  }
}

// Порядок для сборки роли не играет, а вот стабильность файла — да: иначе каждая
// выкладка меняет разметку местами и выглядит изменением там, где ничего не менялось.
entries.sort((a, b) => a.code.localeCompare(b.code));
for (const entry of entries) delete entry.sort_order;

writeFileSync(target, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
console.log(
  entries.length
    ? `разметка каталога: ${entries.length} утверждений с источником`
    : 'разметка каталога: база недоступна, ItemList в сборку не попадёт',
);
