import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '..');
const appRoot = process.cwd();
const mainPath = resolve(appRoot, 'src/main.tsx');
const appPath = resolve(appRoot, 'src/RedesignApp.tsx');
const cssPath = resolve(appRoot, 'src/redesign.css');
const brandbookPath = resolve(root, 'docs/BRANDBOOK.md');

const failures = [];
const requireFile = (path, label) => {
  if (!existsSync(path)) failures.push(`Отсутствует обязательный файл: ${label}`);
};

requireFile(mainPath, 'app/src/main.tsx');
requireFile(appPath, 'app/src/RedesignApp.tsx');
requireFile(cssPath, 'app/src/redesign.css');
requireFile(brandbookPath, 'docs/BRANDBOOK.md');

if (!failures.length) {
  const main = readFileSync(mainPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const css = readFileSync(cssPath, 'utf8');
  const brandbook = readFileSync(brandbookPath, 'utf8');

  const mainRequired = [
    "import RedesignApp from './RedesignApp'",
    "import './redesign.css'",
    '<RedesignApp />',
  ];
  for (const token of mainRequired) {
    if (!main.includes(token)) failures.push(`Нарушен root UI contract: main.tsx должен содержать ${token}`);
  }

  const mainForbidden = [
    "import V31App from './V31App'",
    "import './v31.css'",
  ];
  for (const token of mainForbidden) {
    if (main.includes(token)) failures.push(`Запрещён параллельный root/design layer: ${token}`);
  }

  const baselineCapabilities = [
    ['Сегодня', "['/', 'Сегодня'"],
    ['Связки', "['/links', 'Связки'"],
    ['Путь', "['/path', 'Путь'"],
    ['Смыслы', "['/meanings', 'Смыслы'"],
    ['быстрая запись никотина', 'Никотин уже был'],
    ['вечерний разбор', 'Итоги дня'],
    ['удаление ошибочного эпизода', 'deleteEpisode'],
    ['пользовательские Связки', 'addLink'],
    ['пользовательские Смыслы', 'addMeaning'],
    ['guided craving flow', 'saveGuidedEpisode'],
    ['Google OAuth', 'signInWithOAuth'],
    ['выход из аккаунта', 'signOut'],
  ];
  for (const [label, token] of baselineCapabilities) {
    if (!app.includes(token)) failures.push(`Регрессия baseline-функции «${label}»: не найден маркер ${token}`);
  }

  const cssTokens = ['--r-bg:#061013', '--r-lime:#c9ff5b', '--r-teal:#51ddd0', '.r-now', '.r-craving', '.r-modal'];
  for (const token of cssTokens) {
    if (!css.includes(token)) failures.push(`Нарушен визуальный baseline redesign.css: отсутствует ${token}`);
  }

  if (!app.includes("./assets/brand-logo-full.png")) {
    failures.push('Утверждённый ALIVE logo asset должен импортироваться из ./assets/brand-logo-full.png');
  }

  const brandbookMarkers = ['Визуальная система v3.0', 'Новая функция не является поводом менять визуальный язык существующего экрана', 'additive'];
  for (const token of brandbookMarkers) {
    if (!brandbook.toLowerCase().includes(token.toLowerCase())) failures.push(`BRANDBOOK потерял обязательный guardrail: ${token}`);
  }
}

if (failures.length) {
  console.error('\nALIVE UI CONTRACT — FAIL\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nИзменение root shell, дизайн-системы или удаление baseline-функций требует отдельного owner gate и обновления UI-contract проверки.\n');
  process.exit(1);
}

console.log('ALIVE UI CONTRACT — PASS');
console.log('Root: RedesignApp · visual baseline: redesign.css · baseline capabilities preserved');
