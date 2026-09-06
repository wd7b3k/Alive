#!/usr/bin/env node
// Открыть адрес в браузере и показать, что видит человек.
//
// Зачем. 05.09.2026 `curl` отвечал 200 на девятнадцати адресах, которых для человека не
// существовало: сервер отдавал каркас приложения, разметку и заголовок, а содержания в
// нём не было. Код ответа и наличие `<title>` про это не говорят ничего — их даёт и
// пустой контейнер. Инвариант «экран открыт в браузере, состояние совпадает с ожидаемым»
// (`AGENTS.md`, инвариант 5) до сих пор проверялся глазами и потому не проверялся.
//
//   node scripts/check-screen.mjs https://habitoff.ru/knowledge
//   node scripts/check-screen.mjs https://habitoff.ru/ --width 390
//   node scripts/check-screen.mjs https://habitoff.ru/knowledge --expect "Факты и мифы"
//
// Печатает код ответа, заголовок, первый `h1`, длину видимого текста, горизонтальный
// перелив и первые строки текста. Код 1 — страница не открылась, видимого текста меньше
// порога, не нашлось ожидаемой строки или в консоли была ошибка.
//
// Браузер. Берётся установленный Edge (`channel: 'msedge'`), поэтому в репозиторий ничего
// не скачивается и `node_modules` не растёт. Playwright ставится один раз командой
// `npm --prefix app install --no-save playwright` и в зависимости не коммитится: он нужен
// приёмке на машине, а не сборке в CI.
import { argv, exit } from 'node:process';

const args = argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
}

if (!url) {
  console.error('Использование: node scripts/check-screen.mjs <адрес> [--width 1280]');
  console.error('              [--expect "строка"] [--min-text 200] [--browser msedge]');
  exit(2);
}

const width = Number(opt('width', 1280));
const minText = Number(opt('min-text', 200));
const expect = opt('expect', null);
const channel = opt('browser', 'msedge');

// Playwright живёт в `app/node_modules`: там он ставится одной командой и туда же
// смотрит `npm --prefix app`. Скрипт лежит в `scripts/`, поэтому импорт идёт по прямому
// пути, а не по разрешению из каталога скрипта.
let chromium;
try {
  ({ chromium } = await import(new URL('../app/node_modules/playwright/index.mjs', import.meta.url)));
} catch {
  console.error('playwright не установлен. Один раз, без записи в зависимости:');
  console.error('  npm --prefix app install --no-save playwright');
  exit(2);
}

const browser = await chromium.launch({ channel });
const context = await browser.newContext({ viewport: { width, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

let status = 0;
const problems = [];
try {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  status = response ? response.status() : 0;
  if (status >= 400) problems.push(`код ответа ${status}`);

  // Видимый текст, а не `innerHTML`: разметка, скрытые блоки и каркас приложения в него
  // не попадают — именно этим отличается «страница есть» от «человеку есть что читать».
  const seen = await page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    const h1 = document.querySelector('h1');
    return {
      title: document.title,
      h1: h1 ? h1.textContent.trim() : null,
      text: text.replace(/\s+/g, ' ').trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  console.log(`адрес:    ${url}`);
  console.log(`ширина:   ${width} px`);
  console.log(`код:      ${status}`);
  console.log(`заголовок: ${seen.title || '— нет —'}`);
  console.log(`h1:       ${seen.h1 || '— нет —'}`);
  console.log(`видимого текста: ${seen.text.length} знаков`);
  console.log(`горизонтальный перелив: ${seen.overflow} px`);
  console.log('');
  console.log(seen.text.slice(0, 400) + (seen.text.length > 400 ? ' …' : ''));

  if (seen.text.length < minText) {
    problems.push(
      `видимого текста ${seen.text.length} знаков при пороге ${minText} — ` +
        'страница открылась, но читать нечего',
    );
  }
  if (seen.overflow > 0) problems.push(`горизонтальный перелив ${seen.overflow} px`);
  if (expect && !seen.text.includes(expect)) problems.push(`нет ожидаемой строки «${expect}»`);
} catch (e) {
  problems.push(`страница не открылась: ${e.message}`);
} finally {
  await browser.close();
}

if (consoleErrors.length) {
  problems.push(`ошибок в консоли: ${consoleErrors.length} — ${consoleErrors[0]}`);
}

if (problems.length) {
  console.error('');
  console.error('экран: не сошлось');
  for (const p of problems) console.error('  ' + p);
  exit(1);
}
console.log('');
console.log('экран: человеку есть что читать');
