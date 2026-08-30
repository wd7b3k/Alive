/**
 * Что видит робот, который не выполняет JavaScript.
 *
 * До 30.08.2026 все публичные адреса отдавали побайтно один и тот же `index.html`:
 * `/knowledge`, `/links`, `/meanings`, `/experiment` и `/releases` различались только
 * тем, что дорисовывал браузер. Внутри этого файла жёстко записан
 * `<link rel="canonical" href="https://habitoff.ru/">`, поэтому карта сайта звала по
 * пяти адресам, каждый из которых сам себя объявлял копией главной. Google это
 * переписывал на лету, потому что выполняет JavaScript; Яндекс и краулеры языковых
 * моделей — нет.
 *
 * Здесь лежит чистая часть решения: из готового `index.html` собирается отдельный
 * документ на каждый адрес. Значения заголовков не дублируются — они берутся из
 * `seo.ts`, того же места, откуда их берёт приложение на переходах. Второй копии
 * заголовка не существует, значит нечему разъезжаться.
 *
 * Модуль работает на этапе сборки (его зовёт плагин в `vite.config.ts`) и в рантайм
 * приложения не попадает: ни один файл из `src/` его не импортирует.
 */
import { RELEASES } from '../redesign/releases';
import { ORIGIN, metaFor } from './seo';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Замена одного тега — с падением, если тега нет.
 *
 * Молчаливый пропуск здесь означал бы страницу с canonical на главную, то есть ровно
 * ту ошибку, ради которой всё это написано, — и обнаружился бы он через месяц в
 * выдаче. Сборка обязана упасть на месте.
 */
function replaceOne(html: string, label: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) {
    throw new Error(
      `Предрендер: в index.html не найден ${label} (${pattern}). ` +
        'Разметка изменилась — почини шаблон, а не выкладывай страницы с чужим canonical.',
    );
  }
  return html.replace(pattern, () => replacement);
}

const TITLE = /<title>[\s\S]*?<\/title>/;
const CANONICAL = /<link[^>]*rel="canonical"[^>]*>/;
const PRERENDER_BODY = /<main class="r-prerender">[\s\S]*?<\/main>/;

function metaByName(name: string): RegExp {
  return new RegExp(`<meta[^>]*name="${name}"[^>]*>`);
}

function metaByProperty(property: string): RegExp {
  return new RegExp(`<meta[^>]*property="${property}"[^>]*>`);
}

/**
 * Статический текст страницы «Что нового».
 *
 * Единственная страница домена, содержание которой известно на этапе сборки: это
 * константа `RELEASES`, а не запрос к базе. Поэтому её можно и нужно положить в
 * статику целиком — остальным разделам это запрещено ровно по обратной причине
 * (`docs/SEO_AND_ANALYTICS.md`: копия, которая расходится с базой, хуже её отсутствия).
 */
export function releasesBody(): string {
  const entries = RELEASES.map(
    (release) =>
      `        <h2>${escapeHtml(release.version)} — ${escapeHtml(release.title)}</h2>\n` +
      `        <p>${escapeHtml(release.summary)}</p>`,
  ).join('\n');
  return [
    '<main class="r-prerender">',
    '        <h1>Что нового в Habitoff</h1>',
    '        <p>',
    '          История версий сервиса, который помогает разобрать никотиновые автоматизмы:',
    '          что изменилось для человека, а не какие файлы тронуты.',
    '        </p>',
    entries,
    '      </main>',
  ].join('\n      ');
}

/**
 * Документ для одного адреса: тот же бандл, свои заголовок, описание и canonical.
 */
export function renderRoute(indexHtml: string, path: string): string {
  const meta = metaFor(path);
  const url = ORIGIN + path;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);

  let html = indexHtml;
  html = replaceOne(html, 'тег <title>', TITLE, `<title>${title}</title>`);
  html = replaceOne(
    html,
    'мета-тег description',
    metaByName('description'),
    `<meta name="description" content="${description}" />`,
  );
  html = replaceOne(
    html,
    'ссылка canonical',
    CANONICAL,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  );
  html = replaceOne(
    html,
    'мета-тег og:url',
    metaByProperty('og:url'),
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
  );
  html = replaceOne(
    html,
    'мета-тег og:title',
    metaByProperty('og:title'),
    `<meta property="og:title" content="${title}" />`,
  );
  html = replaceOne(
    html,
    'мета-тег og:description',
    metaByProperty('og:description'),
    `<meta property="og:description" content="${description}" />`,
  );

  if (path === '/releases') {
    html = replaceOne(html, 'статический слепок в <body>', PRERENDER_BODY, releasesBody());
  }
  return html;
}

export type SitemapEntry = { path: string; lastmod: string };

/**
 * Карта сайта.
 *
 * Без `changefreq` и `priority`: поисковики их не читают, а поле, которое никто не
 * читает, создаёт впечатление управления там, где его нет. `lastmod` они читают, и до
 * 30.08.2026 его не было ни у одного адреса — карта не сообщала ровно то
 * единственное, ради чего её смотрят.
 */
export function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) =>
      [
        '  <url>',
        `    <loc>${escapeHtml(ORIGIN + entry.path)}</loc>`,
        `    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}
