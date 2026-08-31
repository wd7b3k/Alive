#!/usr/bin/env node
// Сверка «локальное ⇄ origin».
//
// check-deploy-drift.mjs отвечает на вопрос «прод отстал от main?».
// Этот скрипт отвечает на вопрос, который до 31.08.2026 никто не задавал машине:
// «есть ли работа, которая существует только на этой машине?».
//
// Повод: infra/backups/ создан коммитом 2843802 и не существует в origin/main.
// Из-за этого один и тот же блокер три дня подряд описывался в чатах и как
// закрытый, и как незакрытый.

import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

let problems = 0;

try {
  sh('git fetch origin --quiet');
} catch {
  console.log('ВНИМАНИЕ: git fetch не прошёл. Сравнение идёт с последним известным состоянием origin.');
}

const rows = sh("git for-each-ref --format='%(refname:short)\t%(upstream:short)' refs/heads")
  .split('\n')
  .filter(Boolean)
  .map((line) => line.replace(/^'|'$/g, '').split('\t'));

const noUpstream = [];
const ahead = [];

for (const [branch, upstream] of rows) {
  if (!upstream) {
    noUpstream.push(branch);
    continue;
  }
  const count = Number(sh(`git rev-list --count ${upstream}..${branch}`));
  if (count > 0) ahead.push({ branch, count });
}

if (ahead.length) {
  problems += ahead.length;
  console.log('НЕОТПРАВЛЕННОЕ (есть коммиты, которых нет в origin):');
  for (const a of ahead) console.log(`  ${a.branch} — ${a.count} коммит(ов)`);
}

if (noUpstream.length) {
  problems += noUpstream.length;
  console.log('БЕЗ ORIGIN (ветка существует только здесь):');
  for (const b of noUpstream) console.log(`  ${b}`);
}

try {
  const behind = Number(sh('git rev-list --count main..origin/main'));
  if (behind > 0) console.log(`ЛОКАЛЬНЫЙ main отстаёт от origin/main на ${behind} коммит(ов) — git pull перед новой веткой.`);
} catch {
  /* main может отсутствовать в рабочем дереве worktree */
}

if (problems === 0) {
  console.log('Всё локальное есть в origin.');
  process.exit(0);
}

console.log('');
console.log(`Итого мест, существующих только на этой машине: ${problems}.`);
console.log('Правило AGENTS.md: сессия заканчивается пушем всего, что прошло проверку.');
process.exit(1);
