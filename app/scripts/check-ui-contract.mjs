import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(process.cwd(), '..');
const appRoot = process.cwd();
const mainPath = resolve(appRoot, 'src/main.tsx');
const appPath = resolve(appRoot, 'src/RedesignApp.tsx');
const cssPath = resolve(appRoot, 'src/redesign.css');
const logoPath = resolve(appRoot, 'src/assets/brand-logo-full.png');
const brandbookPath = resolve(root, 'docs/BRANDBOOK.md');

// Owner-approved horizontal ALIVE/Om asset supplied directly on 2026-08-16.
// Do not change this hash without another explicit owner gate.
const CANONICAL_LOGO_SHA256 = '6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832';

const failures = [];
const requireFile = (path, label) => {
  if (!existsSync(path)) failures.push(`Отсутствует обязательный файл: ${label}`);
};

requireFile(mainPath, 'app/src/main.tsx');
requireFile(appPath, 'app/src/RedesignApp.tsx');
requireFile(cssPath, 'app/src/redesign.css');
requireFile(logoPath, 'app/src/assets/brand-logo-full.png');
requireFile(brandbookPath, 'docs/BRANDBOOK.md');

if (!failures.length) {
  const main = readFileSync(mainPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const css = readFileSync(cssPath, 'utf8');
  const logo = readFileSync(logoPath);
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
    'Preview v3.1 · base UI restored',
  ];
  for (const token of mainForbidden) {
    if (main.includes(token)) failures.push(`Запрещён параллельный root/design layer или устаревшая подпись: ${token}`);
  }
  if (!main.includes('Предпросмотр v3.1 · кандидат в релиз')) {
    failures.push('Branch-preview badge должен быть на русском языке и отражать текущий статус');
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
    ['Факты и мифы', 'Факты и мифы'],
    ['контекстные мифы', 'Мягкое напоминание'],
    ['раздел Вместе', "go('/together')"],
    ['метаданные стажа', 'Когда начал регулярно курить'],
    ['бережный разбор употребления', 'Следующий эксперимент'],
    ['явный основной продукт', 'primaryTargetProduct'],
    ['Google OAuth', 'signInWithOAuth'],
    ['выход из аккаунта', 'signOut'],
  ];
  for (const [label, token] of baselineCapabilities) {
    if (!app.includes(token)) failures.push(`Регрессия baseline-функции «${label}»: не найден маркер ${token}`);
  }

  if (/role\s*===\s*['"]target_dependency['"][\s\S]{0,140}\?\?\s*data\.products\[0\]/.test(app)) {
    failures.push('Основной никотиновый продукт нельзя определять через случайный первый элемент products[0]');
  }
  if (!app.includes("return 'Разобрать тягу'")) {
    failures.push('Для старых неоднозначных профилей нужен нейтральный CTA без случайной подстановки продукта');
  }
  const rawEnglishFallbacks = ['?? fact.category', '?? item.mechanism', 'setError(result.error.message)'];
  for (const token of rawEnglishFallbacks) {
    if (app.includes(token)) failures.push(`Пользовательский UI не должен выводить raw English metadata/error: ${token}`);
  }

  const visibleEnglishLabels = ['>Facts<', '>Myths<', '>Together<', '>Profile<', '>Method<', '>Release candidate<'];
  for (const token of visibleEnglishLabels) {
    if (app.includes(token) || main.includes(token)) failures.push(`Пользовательская подпись должна быть на русском: ${token}`);
  }

  const cssTokens = ['--r-bg:#061013', '--r-lime:#c9ff5b', '--r-teal:#51ddd0', '.r-now', '.r-craving', '.r-modal', '.r-knowledge-preview', '.r-header-shortcut'];
  for (const token of cssTokens) {
    if (!css.includes(token)) failures.push(`Нарушен визуальный baseline redesign.css: отсутствует ${token}`);
  }

  if (!app.includes("./assets/brand-logo-full.png")) {
    failures.push('Утверждённый ALIVE logo asset должен импортироваться из ./assets/brand-logo-full.png');
  }

  const actualLogoSha256 = createHash('sha256').update(logo).digest('hex');
  if (actualLogoSha256 !== CANONICAL_LOGO_SHA256) {
    failures.push(
      `Неверный или повреждённый ALIVE logo asset: SHA-256 ${actualLogoSha256}; ожидается канонический ${CANONICAL_LOGO_SHA256}. ` +
      'Восстанови точный owner-approved PNG; не перерисовывай и не меняй ожидаемый hash без owner gate.',
    );
  }

  const brandbookMarkers = ['Визуальная система v3.0', 'Новая функция не является поводом менять визуальный язык существующего экрана', 'additive'];
  for (const token of brandbookMarkers) {
    if (!brandbook.toLowerCase().includes(token.toLowerCase())) failures.push(`BRANDBOOK потерял обязательный guardrail: ${token}`);
  }
}

if (failures.length) {
  console.error('\nALIVE UI CONTRACT — FAIL\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nИзменение root shell, дизайн-системы, канонического логотипа или удаление baseline-функций требует отдельного owner gate.\n');
  process.exit(1);
}

console.log('ALIVE UI CONTRACT — PASS');
console.log('Root: RedesignApp · visual baseline: redesign.css · canonical logo + baseline capabilities preserved');
