#!/usr/bin/env node
// Число, которое умеет посчитать машина, не копируется в живой документ.
//
// Зачем. `CLAUDE.md` полгода утверждал «150 карточек», когда на доске их было 214.
// `AGENTS.md` и `NAVIGATOR.md` называли 101 документ при 162. Никто не солгал: число было
// верным в день, когда его написали, и устарело молча. Документ, который сам себя
// опровергает, хуже документа, который молчит: следующая сессия спорит с ним, а не с
// репозиторием.
//
// Правило простое. Число живёт там, где его считают, — в `cards.json`, в каталоге
// миграций, в выводе скрипта. В живом документе стоит либо команда, которая его печатает,
// либо ничего.
//
// Датированные документы — исключение и не проверяются. Число в них — часть факта на
// дату, а не утверждение о сегодня. Датированность определяется по самому документу:
// строка вида «Обновлено 27.08.2026» в шапке. Отдельным списком идут журналы, у которых
// такой строки нет по устройству: там дата стоит у каждого раздела.
//
//   node scripts/check-numbers.mjs
//
// Код 0 — чисто. Код 1 — есть числа, которые разошлись с репозиторием или которые
// вообще нельзя проверить машиной.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

// --- что считается живым документом --------------------------------------------------
// Проверяются `CLAUDE.md`, `AGENTS.md` и `docs/**.md`, кроме перечисленного.
const SKIP = new Map([
  ['docs/CURRENT_STATE.md', 'журнал состояния, дата у каждого раздела'],
  ['docs/INCIDENTS.md', 'журнал происшествий, дата у каждой записи'],
  ['docs/ROLLOUT.md', 'журнал раскатки'],
]);
const SKIP_DIRS = ['docs/ai_sessions', 'docs/tasks', 'docs/decisions'];

// Шапка датированного документа. Ищется в первых двенадцати строках: ниже начинается
// содержание, и «Обновлено» там означает уже не документ, а его раздел.
const DATED = /^\s*(Обновлено|Дата проверки|Проверено|Слепок|Собран)\s.*\d{2}\.\d{2}\.\d{4}/m;

// --- что машина умеет посчитать ------------------------------------------------------
const cards = JSON.parse(readFileSync(join(root, 'docs', 'board', 'cards.json'), 'utf8'));

function countFiles(dir, filter) {
  const full = join(root, dir);
  if (!existsSync(full)) return 0;
  return readdirSync(full).filter(filter).length;
}

const KNOWN = [
  {
    word: 'карточ',
    // Слово перегружено: карточка доски, карточка каталога знаний, карточка на экране.
    // Проверяется только та, о которой в строке сказано, что она с доски.
    context: /доск|cards\.json|BACKLOG/i,
    label: 'карточек на доске',
    actual: () => cards.cards.length,
    source: 'docs/board/cards.json',
  },
  {
    word: 'эпик',
    context: /доск|cards\.json|BACKLOG/i,
    label: 'эпиков на доске',
    actual: () => cards.epics.length,
    source: 'docs/board/cards.json',
  },
  {
    word: 'миграци',
    context: /файл|supabase|каталог|репозитор/i,
    label: 'файлов миграций',
    actual: () => countFiles('supabase/migrations', (f) => f.endsWith('.sql')),
    source: 'supabase/migrations/',
  },
  {
    word: 'документ',
    context: /docs|проект/i,
    label: 'документов в docs/',
    actual: () => countFiles('docs', (f) => f.endsWith('.md')),
    source: 'docs/*.md',
  },
];

// Эти машина считает, но не отсюда: значение зависит от прогона или от состояния git.
// В живом документе им не место вовсе — только в датированной записи.
const UNVERIFIABLE = [
  { word: 'тест', context: /прогон|npm|зелён|прошл/i, why: 'число тестов знает прогон `npm test`' },
  { word: 'ветк', context: /репозитор|origin|git/i, why: 'число веток знает `git branch`' },
  { word: 'таблиц', context: /public|схем|баз/i, why: 'число таблиц знает база, а не документ' },
];

// --- обход ---------------------------------------------------------------------------
function walk(dir, out = []) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(rel)) continue;
      walk(rel, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

const files = ['CLAUDE.md', 'AGENTS.md', ...walk('docs')].filter((f) => !SKIP.has(f));

const problems = [];
const dated = [];
for (const file of files) {
  const full = join(root, file);
  if (!existsSync(full) || !statSync(full).isFile()) continue;
  const lines = readFileSync(full, 'utf8').split(/\r?\n/);
  if (DATED.test(lines.slice(0, 12).join('\n'))) {
    dated.push(file);
    continue;
  }
  lines.forEach((line, i) => {
    // Строка внутри блока кода или команда — это пример вывода, а не утверждение.
    if (/^\s{4,}/.test(line) || line.trimStart().startsWith('```')) return;
    for (const kind of KNOWN) {
      if (kind.context && !kind.context.test(line)) continue;
      const re = new RegExp(`(\\d+)\\s+${kind.word}[а-яё]*`, 'gi');
      let m;
      while ((m = re.exec(line))) {
        const said = Number(m[1]);
        const actual = kind.actual();
        if (said !== actual) {
          problems.push(
            `${file}:${i + 1} — «${m[0]}», а по ${kind.source} их ${actual}. ` +
              `Число ${kind.label} считает машина; в документе ему не место.`,
          );
        }
      }
    }
    for (const kind of UNVERIFIABLE) {
      if (kind.context && !kind.context.test(line)) continue;
      const re = new RegExp(`(\\d+)\\s+${kind.word}[а-яё]*`, 'gi');
      let m;
      while ((m = re.exec(line))) {
        problems.push(`${file}:${i + 1} — «${m[0]}»: ${kind.why}.`);
      }
    }
  });
}

if (problems.length) {
  console.error(`числа: расхождений ${problems.length}`);
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nЛибо убрать число, либо поставить команду, которая его печатает,' +
      '\nлибо перенести утверждение в датированную запись.',
  );
  process.exit(1);
}

console.log(
  `числа: проверено ${files.length - dated.length} живых документов; ` +
    `пропущено ${dated.length} датированных и ${SKIP.size} журналов — расхождений нет`,
);
