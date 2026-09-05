#!/usr/bin/env node
/**
 * Живы ли ссылки на источники в базе знаний.
 *
 * Отдельным скриптом, а не гардом сборки, и это осознанно. Ссылка умирает не в тот
 * момент, когда её правят, а когда издание переезжает, — то есть отказ пришёл бы в
 * случайный день и остановил бы выкладку правки, никак с ним не связанной. Библиография
 * для этого и хранит название, издание и год: по ним документ можно найти и после смерти
 * адреса.
 *
 * Отдельная сложность: половина изданий закрыта защитой от роботов. BMJ, NEJM и JAMA
 * отвечают 403 на любой запрос без браузера, а Cochrane Library — 412. Считать это
 * мёртвой ссылкой значит получать шум вместо сигнала, поэтому сломанным считается только
 * 404 и 410 — «страницы нет» и «страница удалена».
 *
 *   node scripts/check-knowledge-links.mjs          # проверить всё
 *   node scripts/check-knowledge-links.mjs --json   # машинный вывод
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content', 'knowledge');
const json = process.argv.includes('--json');

/** Адреса источников без разбора фронтматтера целиком: здесь достаточно строк `url:`. */
function collect() {
  const registry = JSON.parse(readFileSync(join(contentDir, 'clusters.json'), 'utf8'));
  const found = [];
  for (const cluster of registry.clusters) {
    const dir = join(contentDir, cluster.slug);
    for (const name of readdirSync(dir).filter((file) => file.endsWith('.md'))) {
      const raw = readFileSync(join(dir, name), 'utf8');
      const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
      for (const match of head.matchAll(/^\s*url:\s*(\S+)\s*$/gm)) {
        found.push({ file: `content/knowledge/${cluster.slug}/${name}`, url: match[1] });
      }
    }
  }
  return found;
}

const DEAD = new Set([404, 410]);

async function check(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'habitoff-link-check (+https://habitoff.ru)' },
    });
    return { status: response.status, dead: DEAD.has(response.status) };
  } catch (error) {
    // Сеть не ответила — это про сеть, а не про ссылку.
    return { status: 0, dead: false, note: String(error.message ?? error) };
  }
}

const links = collect();
const results = [];
for (const link of links) {
  results.push({ ...link, ...(await check(link.url)) });
}

const dead = results.filter((result) => result.dead);
const unknown = results.filter((result) => !result.dead && result.status !== 200);

if (json) {
  console.log(JSON.stringify({ checked: results.length, dead, unknown }, null, 2));
} else {
  console.log(`Проверено ссылок: ${results.length}.`);
  for (const result of unknown) {
    console.log(
      `  ${result.status || 'нет ответа'} — ${result.url} (${result.file})` +
        (result.status === 403 || result.status === 412 ? ' — защита от роботов, не смерть' : ''),
    );
  }
  if (dead.length) {
    console.error('\nМёртвые ссылки:');
    for (const result of dead) console.error(`  ${result.status} — ${result.url} (${result.file})`);
    console.error(
      '\nПочинить в статье и записать правку в changelog. Найти документ можно по названию,' +
        ' изданию и году — они лежат рядом с адресом ровно на этот случай.',
    );
  } else {
    console.log('Мёртвых ссылок нет.');
  }
}

process.exit(dead.length ? 1 : 0);
