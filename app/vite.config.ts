import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const version: string = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
).version;

/**
 * Отпечаток сборки.
 *
 * Между «код в main» и «это на проде» до 27.08.2026 не было ни одной автоматической
 * проверки — только память человека о том, что где осталось. Четыре сессии подряд
 * заканчивались формулировкой «осталось владельцу: запушить», и прод месяцами отдавал
 * не то, что лежало в репозитории. Отпечаток делает расхождение видимым: коммит, из
 * которого собрана живая страница, лежит в `/version.json` и в мета-теге, и его можно
 * сравнить с `origin/main` одной командой — `node scripts/check-deploy-drift.mjs`.
 *
 * Значение берётся из git, а если сборка идёт там, где git недоступен, — из переменной
 * окружения. Пустая строка допустима: она честнее выдуманного значения и сразу видна.
 */
function commitSha(): string {
  const fromEnv = process.env.VITE_COMMIT_SHA?.trim();
  if (fromEnv) return fromEnv;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function buildStamp(): Plugin {
  const commit = commitSha();
  const builtAt = new Date().toISOString();
  return {
    name: 'habitoff-build-stamp',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ version: version, commit, builtAt }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildStamp()],
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha()),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(version),
  },
  build: {
    // Карты исходников в прод не уезжают: это 2,8 МБ исходного кода продукта в открытом
    // виде на каждой сборке. deploy.sh удалял их постфактум — лечение симптома.
    sourcemap: false,
  },
});
