#!/usr/bin/env node
/**
 * Сообщить поисковикам об изменившихся адресах — сразу после выкладки.
 *
 * Зачем. Обход молодого домена идёт неделями: на 05.09.2026 в индексе Яндекса была одна
 * страница, в Google — одна со снимком до ребренда. Раздел, выложенный и не замеченный
 * месяц, для поиска не существует. IndexNow — единственный способ сказать «эти адреса
 * изменились» за часы, а не за недели; протокол принимают Яндекс и Bing.
 *
 * Почему это не нарушает запрет внешних сервисов в рантайме (`AGENTS.md`). Запрет — про
 * браузер посетителя: страница не должна ходить на чужие домены. Здесь запрос делает
 * сервер один раз при выкладке, и до посетителя он не доходит никак. Решение записано в
 * `docs/SEO_AND_ANALYTICS.md`.
 *
 * **Отправляются только изменившиеся адреса.** Слать все шестьдесят три на каждой
 * выкладке — это научить поисковик, что сигнал ничего не значит: он перестанет его
 * читать, и в тот раз, когда изменение будет настоящим, ничего не произойдёт. Поэтому
 * новая сборка сравнивается с уже опубликованной, побайтно.
 *
 * **Исчезнувшие адреса сообщаются тоже.** Удалённая страница — такое же изменение, как
 * правленая, и поисковику надо сказать о ней раньше, чем он придёт сам: иначе адрес
 * висит в очереди обхода неделями. Что он получит по этому адресу — 410 или 404 —
 * решает `infra/caddy/Caddyfile`, а не этот скрипт.
 *
 * **Отказ пинга не роняет выкладку.** К моменту вызова симлинк уже переключён, сайт уже
 * новый. Уронить здесь — значит объявить успешную выкладку неудачной из-за чужого
 * сервера.
 *
 *   node scripts/indexnow-ping.mjs --dist app/dist --previous /srv/alive/current
 *   node scripts/indexnow-ping.mjs --dist app/dist --previous none --dry-run
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ORIGIN = process.env.INDEXNOW_ORIGIN ?? 'https://habitoff.ru';
const HOST = new URL(ORIGIN).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Ключ лежит рядом с сайтом и публичен по устройству протокола: его читает поисковик. */
function findKey(dist) {
  const file = readdirSync(dist).find((name) => /^[0-9a-f]{8,128}\.txt$/.test(name));
  if (!file) {
    throw new Error(
      `В ${dist} нет файла ключа IndexNow (имя вида <ключ>.txt). ` +
        'Он лежит в app/public/ и попадает в сборку сам.',
    );
  }
  const key = readFileSync(join(dist, file), 'utf8').trim();
  if (`${key}.txt` !== file) {
    throw new Error(`Ключ внутри ${file} не совпадает с именем файла — поисковик такой не примет.`);
  }
  return { key, location: `${ORIGIN}/${file}` };
}

/** Все страницы сборки как адреса: `dist/knowledge/novoe/x/index.html` → `/knowledge/novoe/x`. */
function pages(dir, root = dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pages(full, root, found);
    else if (entry.name === 'index.html') {
      const path = `/${relative(root, full)
        .replace(/\\/g, '/')
        .replace(/index\.html$/, '')}`.replace(/\/$/, '');
      found.push({ path: path || '/', file: full });
    }
  }
  return found;
}

function arg(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const dist = arg('dist', 'app/dist');
const previous = arg('previous', 'none');
const dryRun = process.argv.includes('--dry-run');

let key;
try {
  key = findKey(dist);
} catch (error) {
  console.error(`IndexNow: ${error.message}`);
  process.exit(1);
}

const all = pages(dist);
const changed = all.filter(({ path, file }) => {
  if (previous === 'none') return true;
  const before = join(previous, path === '/' ? '' : path.slice(1), 'index.html');
  if (!statSync(before, { throwIfNoEntry: false })?.isFile()) return true;
  return readFileSync(before).compare(readFileSync(file)) !== 0;
});

// Адреса, которые были в прошлой выкладке и исчезли в этой.
const live = new Set(all.map(({ path }) => path));
const removed =
  previous === 'none'
    ? []
    : pages(previous)
        .map(({ path }) => path)
        .filter((path) => !live.has(path));

if (!changed.length && !removed.length) {
  console.log(`IndexNow: страниц ${all.length}, изменившихся нет — сообщать нечего.`);
  process.exit(0);
}

const urlList = [...changed.map(({ path }) => path), ...removed].map((path) => ORIGIN + path);
console.log(
  `IndexNow: изменилось ${changed.length} из ${all.length} адресов` +
    (removed.length ? `, удалено ${removed.length}` : '') +
    '.',
);
for (const url of urlList.slice(0, 20)) console.log(`  ${url}`);
if (urlList.length > 20) console.log(`  … и ещё ${urlList.length - 20}`);

if (dryRun) {
  console.log('IndexNow: --dry-run, запрос не отправлен.');
  process.exit(0);
}

try {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: key.key,
      keyLocation: key.location,
      urlList,
    }),
  });
  // 200 и 202 — принято. Остальное печатаем и живём дальше: выкладка уже состоялась.
  if (response.ok) console.log(`IndexNow: принято, код ${response.status}.`);
  else console.warn(`IndexNow: отказ, код ${response.status}. Выкладку это не отменяет.`);
} catch (error) {
  console.warn(
    `IndexNow: запрос не ушёл (${String(error.message ?? error)}). Выкладку это не отменяет.`,
  );
}
