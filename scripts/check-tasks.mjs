#!/usr/bin/env node
// Проверка постановок и записей сессий: номера уникальны, темы существуют на доске.
//
// Зачем. Номер до 06.09.2026 брали глазами, и за один день 05.09 разъехались пять раз:
// `R-20260905-01`, `T-20260905-11` и `T-20260905-12` означали по две разные работы, а в
// `docs/ai_sessions/2026-09-05/` дважды были заняты 004 и 005. Две сессии в один день
// считают «последний занятый» по своей копии каталога и приходят к одному числу; ни одна
// из них при этом не делает ничего неправильного. Номер выдаёт `scripts/next-id.sh`,
// а эта проверка не даёт коллизии дожить до `main`.
//
// Тема в имени файла проверяется по списку `epic` из `docs/board/cards.json`. Это не
// украшение: одна задача — одна карточка, а карточка без существующего эпика не заводится.
// Тема, которой нет на доске, означает работу, которую доска не увидит.
//
//   node scripts/check-tasks.mjs
//
// Код 0 — чисто. Код 1 — есть нарушения, они перечислены.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tasksDir = join(root, 'docs', 'tasks');
const sessionsDir = join(root, 'docs', 'ai_sessions');
const cardsPath = join(root, 'docs', 'board', 'cards.json');

const problems = [];

const epics = new Set(JSON.parse(readFileSync(cardsPath, 'utf8')).epics.map((e) => e.id));

// --- постановки и разборы ------------------------------------------------------------
// Имя: T-ГГГГММДД-NN-<тема>-<слаг>.md. Тема — первый сегмент после номера.
const taskName = /^([RT])-(\d{8})-(\d{2})-([a-z0-9]+)-(.+)\.md$/;
const byNumber = new Map();
const taskFiles = existsSync(tasksDir) ? readdirSync(tasksDir).filter((f) => f.endsWith('.md')) : [];

for (const file of taskFiles) {
  if (file === 'README.md' || file.startsWith('TEMPLATE')) continue;
  const m = taskName.exec(file);
  if (!m) {
    problems.push(`${file}: имя не по образцу T-ГГГГММДД-NN-<тема>-<слаг>.md`);
    continue;
  }
  const [, kind, date, num, theme] = m;
  const key = `${kind}-${date}-${num}`;
  if (!byNumber.has(key)) byNumber.set(key, []);
  byNumber.get(key).push(file);
  if (!epics.has(theme)) {
    problems.push(
      `${file}: темы «${theme}» нет среди эпиков доски (${[...epics].sort().join(', ')})`,
    );
  }
}

for (const [key, files] of byNumber) {
  if (files.length > 1) problems.push(`номер ${key} занят ${files.length} раз: ${files.join(', ')}`);
}

// --- записи сессий -------------------------------------------------------------------
// Пара prompt/response делит один номер — это норма. Коллизией считается номер, под
// которым лежат две разные работы, то есть больше одного слага.
const sessionDays = existsSync(sessionsDir)
  ? readdirSync(sessionsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];

for (const day of sessionDays) {
  const bySlug = new Map();
  for (const file of readdirSync(join(sessionsDir, day.name))) {
    const m = /^(\d{3})-(.+?)-(prompt|response)\.md$/.exec(file);
    if (!m) continue;
    const [, num, slug] = m;
    if (!bySlug.has(num)) bySlug.set(num, new Set());
    bySlug.get(num).add(slug);
  }
  for (const [num, slugs] of bySlug) {
    if (slugs.size > 1) {
      problems.push(
        `${day.name}/${num}: номер занят ${slugs.size} разными работами — ${[...slugs].join(', ')}`,
      );
    }
  }
}

if (problems.length) {
  console.error('постановка: нарушений ' + problems.length);
  for (const p of problems) console.error('  ' + p);
  console.error('\nНомер берётся у scripts/next-id.sh, а не глазами.');
  process.exit(1);
}

console.log(
  `постановка: ${taskFiles.length} файлов в docs/tasks, ${sessionDays.length} дней записей — ` +
    'номера уникальны, темы есть на доске',
);
