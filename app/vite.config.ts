import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import { CATALOG_COUNTS } from './src/services/catalog-counts';
import { buildKnowledge, fillCounts, renderLlmsTxt } from './src/services/knowledge-build';
import { clusterLinks, homeFaqBlock, homeFaqLd } from './src/services/knowledge-pages';
import {
  renderNotFound,
  renderRoute,
  renderSitemap,
  type SitemapEntry,
} from './src/services/prerender';
import type { KnowledgeEntry } from './src/services/schema';
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
 * Отдельный `index.html` на каждый публичный адрес, страницы базы знаний и карта сайта.
 *
 * Плагин работает на `writeBundle`: к этому моменту `index.html` уже прошёл все
 * преобразования Vite и содержит финальные имена чанков, поэтому копии отличаются от
 * оригинала ровно тем, чем должны, — заголовком, описанием, canonical и og:url. Своей
 * сборки на каждый адрес не заводится: это те же байты бандла, а не пять приложений.
 *
 * Страницы базы знаний собираются здесь же, но своим путём: у них нет ни React, ни
 * гидрации — только те же стили. Разложатся они или нет, решает доступ к каталогу; всё
 * про эти два состояния — в `src/services/knowledge-build.ts` и в ADR-0020.
 */
/** Выгрузка каталога, если она есть. Нет файла — нет ItemList, и это рабочий случай. */
function readKnowledge(): KnowledgeEntry[] {
  try {
    return JSON.parse(
      readFileSync(fileURLToPath(new URL('./knowledge-schema.json', import.meta.url)), 'utf8'),
    ) as KnowledgeEntry[];
  } catch {
    return [];
  }
}

function prerenderPublicRoutes(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url));
  return {
    name: 'habitoff-prerender-routes',
    enforce: 'post',
    async writeBundle(options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') {
        throw new Error('Предрендер: в сборке нет index.html — из чего собирать разделы?');
      }
      const outDir = options.dir;
      if (!outDir) throw new Error('Предрендер: у сборки нет каталога вывода.');
      const source = String(index.source);

      // Утверждения каталога с источниками — для разметки `/knowledge`. Файл кладёт
      // выкладка (`scripts/dump-knowledge-for-schema.mjs`), в git его нет: тексты живут
      // в базе, и копия в репозитории разошлась бы с ней на следующей миграции. Нет
      // файла — нет ItemList, остальная разметка от него не зависит.
      const schemaEntries = readKnowledge();

      // Стили страниц базы знаний — те же, что у приложения: вторая дизайн-система не
      // заводится. Имена берутся из уже собранного index.html, а не угадываются.
      const css = [...source.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      const kb = await buildKnowledge(root, { css });
      if (kb.skipped) {
        // Громко и не в конце лога: неполную сборку легко принять за целую.
        this.warn(`База знаний не разложена — ${kb.skipped}`);
      }

      // Частые вопросы главной собираются из статей: у каждого ответа есть адрес
      // разбора и его библиография. Куда их ставить и откуда убирать — решает
      // пререндер, там же, где живёт правило «FAQPage ровно на одном адресе».
      const home = {
        faqLd: homeFaqLd(kb.registry, kb.articles),
        faqBlock: homeFaqBlock(kb.registry, kb.articles),
      };

      // Главная переписывается через тот же путь, что и разделы: ей дописывается
      // навигация. Без неё робот доходит до главной и упирается в тупик — уйти с неё
      // по ссылке было некуда, ноль внутренних ссылок в сыром HTML на всех адресах.
      writeFileSync(
        join(outDir, 'index.html'),
        fillCounts(renderRoute(source, '/', schemaEntries, home), CATALOG_COUNTS),
        'utf8',
      );

      for (const path of PRERENDER_PATHS) {
        const file = join(outDir, path.slice(1), 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        // У раздела «Факты и мифы» под текстом появляется список кластеров базы знаний.
        const extra = path === '/knowledge' ? clusterLinks(kb.registry) : undefined;
        writeFileSync(
          file,
          fillCounts(renderRoute(source, path, schemaEntries, { extra }), CATALOG_COUNTS),
          'utf8',
        );
      }

      // Страница для несуществующего адреса. Её отдаёт Caddy через handle_errors,
      // сохраняя код 404: до 31.08.2026 код был правильный, а тело — нулевой длины,
      // и человек видел белый экран. В карту сайта она не попадает и несёт noindex.
      writeFileSync(
        join(outDir, '404.html'),
        fillCounts(renderNotFound(source), CATALOG_COUNTS),
        'utf8',
      );

      for (const file of kb.files) {
        const target = join(outDir, file.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.contents, 'utf8');
      }

      // Числа в llms.txt собираются из замка, а не пишутся руками: до 31.08.2026 файл
      // называл 28 пусковых моментов, которых в базе уже 25 (карточка chisla-v-llms-txt).
      writeFileSync(
        join(outDir, 'llms.txt'),
        renderLlmsTxt(
          readFileSync(join(root, 'llms.template.txt'), 'utf8'),
          CATALOG_COUNTS,
          kb.registry,
          kb.articles,
        ),
        'utf8',
      );

      const entries: SitemapEntry[] = [
        ...['/', ...PRERENDER_PATHS].map((path) => ({
          path,
          lastmod: lastModified(
            path === '/releases' ? [...SHARED_SOURCES, 'src/redesign/releases.ts'] : SHARED_SOURCES,
          ),
        })),
        ...kb.routes.map((route) => ({
          path: route.path,
          lastmod: lastModified([...SHARED_SOURCES, ...route.sources]),
        })),
      ];
      writeFileSync(join(outDir, 'sitemap.xml'), renderSitemap(entries), 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), buildStamp(), prerenderPublicRoutes()],
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha()),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(version),
  },
  server: {
    // Содержание базы знаний лежит в `content/` в корне репозитория, а не внутри `app/`:
    // его правит редактор, а не разработчик. Реестр кластеров и замок утверждений
    // импортируются оттуда, и dev-серверу надо разрешить читать выше своего корня.
    fs: { allow: ['..'] },
  },
  build: {
    // Карты исходников в прод не уезжают: это 2,8 МБ исходного кода продукта в открытом
    // виде на каждой сборке. deploy.sh удалял их постфактум — лечение симптома.
    sourcemap: false,
  },
});
