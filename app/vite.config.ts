import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import {
  renderCard,
  renderNotFound,
  renderRoute,
  renderSitemap,
  type SitemapEntry,
} from './src/services/prerender';
import { cards, pathFor } from './src/services/knowledge-catalog';
import { PRERENDER_PATHS } from './src/services/seo';

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

/**
 * Когда страница менялась в последний раз.
 *
 * Не время сборки: пересборка без коммита ничего в отданных байтах не меняет, а
 * `lastmod`, который дёргается на каждой выкладке, поисковик перестаёт читать. Дата
 * берётся из git по тем файлам, из которых страница фактически собрана, — для робота
 * без JavaScript это ровно `index.html`, `seo.ts` и предрендер, а для «Что нового»
 * ещё и сама константа с версиями.
 */
function lastModified(paths: string[]): string {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], {
      encoding: 'utf8',
    }).trim();
    if (date) return date;
  } catch {
    // git недоступен — дата сборки честнее выдуманной.
  }
  return new Date().toISOString().slice(0, 10);
}

const SHARED_SOURCES = [
  'index.html',
  'src/services/seo.ts',
  'src/services/prerender.ts',
  'vite.config.ts',
];

/**
 * Отдельный `index.html` на каждый публичный адрес плюс карта сайта.
 *
 * Плагин работает на `writeBundle`: к этому моменту `index.html` уже прошёл все
 * преобразования Vite и содержит финальные имена чанков, поэтому копии отличаются от
 * оригинала ровно тем, чем должны, — заголовком, описанием, canonical и og:url. Своей
 * сборки на каждый адрес не заводится: это те же байты бандла, а не пять приложений.
 */
function prerenderPublicRoutes(): Plugin {
  return {
    name: 'habitoff-prerender-routes',
    enforce: 'post',
    writeBundle(options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') {
        throw new Error('Предрендер: в сборке нет index.html — из чего собирать разделы?');
      }
      const outDir = options.dir;
      if (!outDir) throw new Error('Предрендер: у сборки нет каталога вывода.');
      const source = String(index.source);

      // Главная переписывается через тот же путь, что и разделы: ей дописывается
      // навигация. Без неё робот доходит до главной и упирается в тупик — уйти с неё
      // по ссылке было некуда, ноль внутренних ссылок в сыром HTML на всех адресах.
      writeFileSync(join(outDir, 'index.html'), renderRoute(source, '/'), 'utf8');

      for (const path of PRERENDER_PATHS) {
        const file = join(outDir, path.slice(1), 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderRoute(source, path), 'utf8');
      }

      // Страница для несуществующего адреса. Её отдаёт Caddy через handle_errors,
      // сохраняя код 404: до 31.08.2026 код был правильный, а тело — нулевой длины,
      // и человек видел белый экран. В карту сайта она не попадает и несёт noindex.
      writeFileSync(join(outDir, '404.html'), renderNotFound(source), 'utf8');

      // Страница на каждую опубликованную карточку каталога. Решение владельца
      // 05.09.2026 (ADR-0018): адрес выводится из первичного ключа и не меняется —
      // адрес, который переехал, теряет всё, что успел набрать в индексе.
      const catalog = cards();
      for (const card of catalog) {
        const file = join(outDir, pathFor(card).slice(1), 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderCard(source, card), 'utf8');
      }

      const entries: SitemapEntry[] = [
        ...['/', ...PRERENDER_PATHS].map((path) => ({
          path,
          lastmod: lastModified(
            path === '/releases' ? [...SHARED_SOURCES, 'src/redesign/releases.ts'] : SHARED_SOURCES,
          ),
        })),
        // У карточки своя дата: `updated_at` из базы, а не общая дата сборки. Общая
        // дата означала бы «все тридцать восемь страниц изменились», и поисковик
        // перестал бы верить полю целиком.
        ...catalog.map((card) => ({ path: pathFor(card), lastmod: card.updated })),
      ];
      writeFileSync(join(outDir, 'sitemap.xml'), renderSitemap(entries), 'utf8');
      console.log(
        `предрендер: ${1 + PRERENDER_PATHS.length} разделов и ${catalog.length} карточек каталога`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), buildStamp(), prerenderPublicRoutes()],
  server: {
    fs: {
      /**
       * Раздел «Доска» импортирует `scripts/board-template.html` и `docs/board/*.json` —
       * файлы репозитория за пределами `app/`. Сборка их видит по обычному разрешению
       * импорта, а dev-сервер и vitest отдают файлы только из разрешённых каталогов и
       * иначе отвечают `Denied ID`. Разрешён корень репозитория, а не диск.
       */
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
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
