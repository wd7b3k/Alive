#!/usr/bin/env node
// Пределы одновременной работы: сколько задач в работе, сколько держит пилот, сколько
// постановок ждёт исполнителя.
//
// Зачем. Пределы записаны в `AGENTS.md` с 27.08.2026 и с тех пор не соблюдались ни дня.
// На 06.09 в `doing` стояло восемь карточек при пределе два, приоритет 0 был у 44 при
// пределе три, а в очереди лежало четырнадцать неисполненных постановок при пределе одна.
// Правило, за нарушение которого ничего не происходит, не ограничивает ничего: оно просто
// перестаёт читаться.
//
//   node scripts/check-limits.mjs            падает при превышении
//   node scripts/check-limits.mjs --warn     печатает и выходит нулём
//
// Что не считается очередью:
//
//  - постановка с заполненным разделом «Результат» — она исполнена;
//  - помеченная «Отменена» — она снята решением;
//  - помеченная «Подвешена» — снята из очереди с условием разморозки, как эпик `i18n`
//    решением владельца 06.09.2026;
//  - помеченная «Постоянная» — процедура, которая выполняется по расписанию и не может
//    быть «исполнена» однажды.
//
// Пределы живут здесь, а не в `AGENTS.md`: документ описывает правило словами, число
// считает машина. Меняются они правкой этого файла и никак иначе.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMITS = {
  doing: 2, // не больше двух активных задач
  priorityZero: 3, // «держит пилот» — не более чем трём карточкам
  queue: 1, // не больше одной неисполненной постановки
};

const root = fileURLToPath(new URL('..', import.meta.url));
const warnOnly = process.argv.includes('--warn');

const board = JSON.parse(readFileSync(join(root, 'docs', 'board', 'cards.json'), 'utf8'));

const doing = board.cards.filter((c) => c.status === 'doing');
const priorityZero = board.cards.filter((c) => c.priority === 0 && c.status !== 'done');

// --- очередь постановок ---------------------------------------------------------------
const tasksDir = join(root, 'docs', 'tasks');
const queue = [];
if (existsSync(tasksDir)) {
  for (const file of readdirSync(tasksDir)) {
    if (!/^T-\d{8}-\d{2}-/.test(file)) continue;
    const text = readFileSync(join(tasksDir, file), 'utf8');
    if (/^\s*(\*\*)?Отменена/m.test(text)) continue;
    if (/^\s*Подвешена:/m.test(text)) continue;
    if (/^\s*Постоянная:/m.test(text)) continue;
    // Раздел «Результат» считается заполненным, если под заголовком есть хоть одна
    // строка не из шаблона. Шаблонные пункты начинаются с «- » и словом «заполняет».
    const after = text.split(/^##+ Результат.*$/m)[1];
    const filled =
      after &&
      after
        .split(/\r?\n/)
        .some((l) => l.trim() && !l.trim().startsWith('- ') && !l.startsWith('#'));
    if (!filled) queue.push(file);
  }
}

const rows = [
  ['в работе (doing)', doing.length, LIMITS.doing, doing.map((c) => c.id)],
  ['приоритет 0', priorityZero.length, LIMITS.priorityZero, priorityZero.map((c) => c.id)],
  ['неисполненных постановок', queue.length, LIMITS.queue, queue],
];

const over = rows.filter(([, n, limit]) => n > limit);

for (const [label, n, limit, items] of rows) {
  const mark = n > limit ? '✗' : '·';
  console.log(`${mark} ${label}: ${n} при пределе ${limit}`);
  if (n > limit) console.log(`    ${items.join(', ')}`);
}

if (!over.length) {
  console.log('пределы: соблюдены');
  process.exit(0);
}

const head = `пределы: превышено по ${over.length} из ${rows.length}`;
if (warnOnly) {
  console.log(head + ' — предупреждение, сборку не роняю');
  process.exit(0);
}
console.error(head);
console.error(
  'Правило — `AGENTS.md`, раздел «Пределы одновременной работы». Разбор состояния — роль ' +
    '`sostoyanie` в `.claude/agents/`.',
);
process.exit(1);
