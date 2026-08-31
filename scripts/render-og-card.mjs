#!/usr/bin/env node
/**
 * Растр карточки ссылки из её исходника.
 *
 * Источник — `app/src/assets/og-card.svg`, он же единственное место, где карточку
 * правят. Растр `app/public/og-card.png` лежит в репозитории рядом, потому что
 * мессенджеры SVG в превью не берут, а собирать картинку на каждой сборке ради файла,
 * который меняется раз в полгода, — лишняя движущаяся часть.
 *
 * Рисует браузер, который уже стоит в системе: у него настоящий движок шрифтов, и
 * кириллица в нём выглядит так же, как на сайте. Отдельной зависимости для этого не
 * заводится — ни в рантайме прода, ни в сборке.
 *
 *   node scripts/render-og-card.mjs
 *
 * Если браузер лежит не там, где его ищет скрипт: CHROME=/путь/к/chrome node scripts/…
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'app', 'src', 'assets', 'og-card.svg');
const target = join(root, 'app', 'public', 'og-card.png');

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const browser = CANDIDATES.find((path) => existsSync(path));
if (!browser) {
  console.error(
    'Не нашёл Chrome или Edge. Укажи путь: CHROME=/путь/к/chrome node scripts/render-og-card.mjs',
  );
  process.exit(1);
}
if (!existsSync(source)) {
  console.error(`Нет исходника ${source}`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'habitoff-og-'));
const shot = join(work, 'og-card.png');
try {
  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      `--screenshot=${shot}`,
      pathToFileURL(source).href,
    ],
    { stdio: 'ignore' },
  );
  if (!existsSync(shot)) throw new Error('браузер не создал файл');
  renameSync(shot, target);
  console.log(`Готово: ${target}`);
} catch (error) {
  console.error(`Не удалось отрисовать карточку: ${error.message}`);
  process.exit(1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
