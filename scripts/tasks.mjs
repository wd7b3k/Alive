#!/usr/bin/env node
// Указатель постановок: что заведено по каждой теме и в каком состоянии.
// Разбор (R-) отвечает «надо ли», задача (T-) — «как и когда готово».
// Порядок и формат — docs/tasks/README.md.

import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'docs/tasks';
const field = (text, name) => {
  const m = text.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/`/g, '') : '';
};

const files = readdirSync(DIR).filter((f) => /^[RT]-\d{8}/.test(f)).sort();
const byTheme = new Map();

for (const file of files) {
  const text = readFileSync(`${DIR}/${file}`, 'utf8');
  const theme = field(text, 'Тема') || 'без темы';
  const kind = file.startsWith('R-') ? 'разбор' : 'задача';
  const status = field(text, 'Статус') || (kind === 'задача' ? field(text, 'Карточка доски') && 'см. доску' : '');
  const title = (text.split('\n')[0] || '').replace(/^#\s*/, '');
  if (!byTheme.has(theme)) byTheme.set(theme, []);
  byTheme.get(theme).push({ file, kind, status, title });
}

if (!files.length) {
  console.log('Постановок нет.');
  process.exit(0);
}

let parked = 0;
for (const [theme, items] of [...byTheme].sort()) {
  console.log(`\n=== ${theme} ===`);
  for (const it of items) {
    if (it.status === 'подвешено') parked++;
    const mark = it.status ? ` — ${it.status}` : '';
    console.log(`  ${it.kind.padEnd(7)} ${it.file}${mark}`);
    console.log(`          ${it.title}`);
  }
}

console.log(`\nВсего: ${files.length} · тем: ${byTheme.size}${parked ? ` · подвешено решений: ${parked}` : ''}`);
if (parked) console.log('У подвешенного разбора должно быть условие разморозки и список того, что нельзя делать, пока он подвешен.');
