/**
 * Что видит робот, который не выполняет JavaScript.
 *
 * До 30.08.2026 все публичные адреса отдавали побайтно один и тот же `index.html`:
 * `/knowledge`, `/links`, `/meanings`, `/experiment` и `/releases` различались только
 * тем, что дорисовывал браузер. Внутри этого файла жёстко записан
 * `<link rel="canonical" href="https://habitoff.ru/">`, поэтому карта сайта звала по
 * пяти адресам, каждый из которых сам себя объявлял копией главной.
 *
 * Правка от 30.08 подменила голову документа и на этом остановилась. Замер снаружи
 * 31.08 показал, чем это кончилось: пять адресов из шести отдавали 2240 знаков одного
 * и того же текста с одинаковым `<h1>` — при разных canonical. Для поисковика это
 * худший из двух вариантов: склеить страницы он не может и обязан считать их разными
 * страницами с одинаковым содержимым. Плюс ноль внутренних ссылок на всех шести.
 *
 * Поэтому здесь теперь не только голова, но и тело: у каждого адреса свой заголовок,
 * свой текст и ссылки на соседние разделы. Значения `title`, `description` и canonical
 * по-прежнему берутся из `seo.ts` — второй копии заголовка не существует.
 *
 * Модуль работает на этапе сборки (его зовёт плагин в `vite.config.ts`) и в рантайм
 * приложения не попадает: ни один файл из `src/` его не импортирует.
 */
import { RELEASES } from '../redesign/releases';
import { ORIGIN, metaFor } from './seo';
import { notFoundGraph, routeGraph, scriptTag, type KnowledgeEntry } from './schema';

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
export function replaceOne(
  html: string,
  label: string,
  pattern: RegExp,
  replacement: string | ((match: string) => string),
): string {
  if (!pattern.test(html)) {
    throw new Error(
      `Предрендер: в index.html не найден ${label} (${pattern}). ` +
        'Разметка изменилась — почини шаблон, а не выкладывай страницы с чужим canonical.',
    );
  }
  return html.replace(pattern, (match) =>
    typeof replacement === 'function' ? replacement(match) : replacement,
  );
}

const TITLE = /<title>[\s\S]*?<\/title>/;
const CANONICAL = /<link[^>]*rel="canonical"[^>]*>/;
const PRERENDER_BODY = /<main class="r-prerender">[\s\S]*?<\/main>/;
const LD_JSON = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;

/**
 * Частые вопросы главной: отдельный блок разметки и отдельный блок текста.
 *
 * Оба собираются на сборке из статей базы знаний — с адресом разбора и его
 * библиографией у каждого ответа (ADR-0020). В `index.html` на их месте стоят заглушки,
 * и правило `FAQPage` живёт ровно на одном адресе продолжает действовать: на всех
 * адресах, кроме главной, заглушка вырезается здесь же.
 */
const FAQ_LD = /<script type="application\/ld\+json" id="faq-ld">[\s\S]*?<\/script>/;
const PRERENDER_FAQ = /<section class="r-prerender-faq">[\s\S]*?<\/section>/;

/** Что подставляется в страницу помимо мета-тегов: собрано вне этого модуля. */
export type PageParts = {
  /** Дополнительная разметка в тело раздела — сейчас список кластеров базы знаний. */
  extra?: string;
  /** Готовый `FAQPage` для главной. Не передан — остаётся заглушка из `index.html`. */
  faqLd?: string;
  /** Видимые вопросы и ответы для статического слепка главной. */
  faqBlock?: string;
};

function metaByName(name: string): RegExp {
  return new RegExp(`<meta[^>]*name="${name}"[^>]*>`);
}

function metaByProperty(property: string): RegExp {
  return new RegExp(`<meta[^>]*property="${property}"[^>]*>`);
}

/**
 * Навигация для того, кто не выполняет JavaScript.
 *
 * До 31.08.2026 в сыром HTML не было ни одного `<a href="/...">`: навигацию рисовал
 * React, и до робота она не доезжала. Обход домена держался на одной карте сайта,
 * ссылочной связности не было вовсе — раздел «внутренние ссылки» в Вебмастере поэтому
 * и пустовал: ему нечего было показывать.
 *
 * Список повторяет `PUBLIC_NAV` из `redesign/shared.tsx` по смыслу, но не по коду: тот
 * живёт в рантайме и знает про иконки, этот — про то, что видит краулер. Тянуть один
 * в другой значит связать сборку с интерфейсом ради шести строк. Вместо этого
 * `prerender.test.ts` сверяет, что оба списка ведут на одни и те же адреса.
 */
const NAV: ReadonlyArray<[string, string]> = [
  ['/', 'Главная'],
  ['/knowledge', 'Факты и мифы'],
  ['/links', 'Связки'],
  ['/meanings', 'Смыслы'],
  ['/experiment', 'О методе'],
  ['/releases', 'Что нового'],
];

export const NAV_PATHS: ReadonlyArray<string> = NAV.map(([path]) => path);

export function navBlock(current: string): string {
  const items = NAV.filter(([path]) => path !== current)
    .map(([path, label]) => `          <li><a href="${path}">${escapeHtml(label)}</a></li>`)
    .join('\n');
  return [
    '<nav class="r-prerender-nav" aria-label="Разделы Habitoff">',
    '        <h2>Разделы</h2>',
    '        <ul>',
    items,
    '        </ul>',
    '      </nav>',
  ].join('\n        ');
}

/**
 * Своё содержание для каждого адреса.
 *
 * **Чего здесь нет и не будет: карточек из базы.** Факты, мифы, связки и смыслы
 * правятся миграциями, и копия разошлась бы с базой на первой же — правило
 * `docs/SEO_AND_ANALYTICS.md` не отменено. Здесь лежит то, что от базы не зависит:
 * чем раздел является, что в нём искать и на каком основании он собран. Это
 * редакционный текст продукта, а не слепок его данных.
 */
type RouteBody = { h1: string; paragraphs: string[] };

const BODIES: Record<string, RouteBody> = {
  '/knowledge': {
    h1: 'Факты и мифы о курении — с источниками и границами',
    paragraphs: [
      'Раздел отвечает на вопрос «а это вообще правда» про курение, вейп и кальян. У каждого утверждения указаны уровень доказательности, границы применимости и источник: сильное исследование и единичное наблюдение выглядят здесь по-разному, и это видно до того, как человек решит, что с этим делать.',
      'Разобранные убеждения лежат рядом с проверенными утверждениями и в том же формате. Миф не объявляется глупостью — показано, откуда он взялся, что в нём верно и где именно он перестаёт работать.',
      'Три популярных утверждения в продукт сознательно не попали, потому что источника у них нет: «тяга длится 3–5 минут», «вейп на 95 % безопаснее» и любое соотношение «один кальян = N сигарет». Отсутствие ответа честнее придуманного.',
      'Ничто из этого не заменяет врача и не является медицинской рекомендацией.',
    ],
  },
  '/links': {
    h1: 'Связки: почему тянет курить в одни и те же моменты',
    paragraphs: [
      'Зависимость держится не на никотине как таковом, а на связке: определённый момент — определённое состояние — один и тот же ответ. Кофе, конец рабочей задачи, напряжение, дорога, компания. Пока связка не разобрана, запреты держатся ровно до первого трудного дня.',
      'Каждый пусковой момент разобран до потребности: что человек на самом деле ищет в этот момент — паузу, переключение, вкус, повод выйти к людям. Потребность и есть то, что придётся закрыть чем-то другим; сигарета в этой схеме способ, а не цель.',
      'Под каждую потребность собраны ответы, привязанные к ситуации, а не общий список полезных привычек. В момент тяги предлагается не весь список, а несколько вариантов под текущий контекст.',
    ],
  },
  '/meanings': {
    h1: 'Смыслы: ради чего менять привычку',
    paragraphs: [
      'Раздел про то, ради чего всё это, и он существует отдельно по простой причине: в момент тяги вспоминается не польза вообще, а что-то своё и конкретное. Цели, ценности и направления собраны так, чтобы их можно было примерить, а не согласиться с ними.',
      'У каждой карточки есть вопрос. Отвечать на вопрос интереснее, чем соглашаться с лозунгом, и ответ остаётся у человека: смыслы не публикуются и не попадают в общую базу без явного согласия.',
      'Смысл здесь — не мотивационная цитата, а то, что возвращается человеку в момент выбора и делает выбор осмысленным.',
    ],
  },
  '/experiment': {
    h1: 'Как устроен метод Habitoff',
    paragraphs: [
      'Habitoff — некоммерческий эксперимент по изменению никотиновых автоматизмов, выросший из личной задачи автора. Он не обещает вылечить зависимость, не гарантирует отказ и не заменяет врача, психотерапевта или доказательную фармакотерапию.',
      'Метод состоит в том, чтобы заметить связку «момент → состояние → сигарета», разобрать её до потребности и подобрать другой ответ под конкретную ситуацию. Измеряется не сила воли, а то, в каких моментах автоматизм срабатывает и что его прерывает.',
      'Факты и эвристики разделены намеренно. Проверяемые утверждения публикуются с источником и границами; рабочие правила проекта — например, счёт единиц — называются эвристиками и не выдаются за эквивалент вреда.',
      'Личные записи хранятся отдельно и защищены правилами доступа на уровне базы: их не видит никто, кроме автора. Аккаунт нужен только затем, чтобы было где хранить твою карту; весь редакционный каталог открыт для чтения без входа.',
    ],
  },
};

/**
 * Статический текст страницы «Что нового».
 *
 * Единственная страница домена, содержание которой известно на этапе сборки: это
 * константа `RELEASES`, а не запрос к базе. Поэтому её можно и нужно положить в
 * статику целиком.
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
    navBlock('/releases'),
    '      </main>',
  ].join('\n      ');
}

/**
 * Тело раздела: свой заголовок, свой текст и ссылки на соседние разделы.
 *
 * `extra` — готовая разметка, собранная кем-то другим: сейчас это список кластеров базы
 * знаний для `/knowledge`. Она приходит параметром, а не импортом, потому что этот
 * модуль сознательно ничего не знает про содержание разделов, и `prerender.test.ts`
 * следит за списком его импортов.
 */
export function routeBody(path: string, extra?: string): string | null {
  const body = BODIES[path];
  if (!body) return null;
  const paragraphs = body.paragraphs.map((text) => `        <p>${escapeHtml(text)}</p>`).join('\n');
  return [
    '<main class="r-prerender">',
    `        <h1>${escapeHtml(body.h1)}</h1>`,
    paragraphs,
    ...(extra ? [extra] : []),
    navBlock(path),
    '      </main>',
  ].join('\n      ');
}

/**
 * Страница для несуществующего адреса.
 *
 * Код 404 сервер отдавал и раньше, но с телом нулевой длины: человек видел белый экран,
 * робот — пустой документ. Ссылки здесь не украшение, а единственное, что человеку в
 * этот момент нужно: способ уйти туда, куда он шёл.
 */
export function notFoundBody(): string {
  return [
    '<main class="r-prerender">',
    '        <h1>Такой страницы нет</h1>',
    '        <p>',
    '          Адрес набран с опечаткой или страница переехала. Ничего не потеряно:',
    '          весь открытый каталог Habitoff на месте, ниже — куда идти.',
    '        </p>',
    navBlock('/404'),
    '      </main>',
  ].join('\n      ');
}

/**
 * Документ для одного адреса: тот же бандл, свои заголовок, описание и содержание.
 */
export function renderRoute(
  indexHtml: string,
  path: string,
  knowledge: KnowledgeEntry[] = [],
  parts: PageParts = {},
): string {
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

  // Разметка по месту. На главной остаётся та, что написана в `index.html`, — там
  // живёт `FAQPage`, и он обязан встречаться ровно на одном адресе. Остальные получают
  // свою: до 31.08.2026 пререндер копировал главную целиком, и шесть страниц несли
  // один и тот же набор вопросов.
  if (path !== '/') {
    html = replaceOne(
      html,
      'блок application/ld+json',
      LD_JSON,
      scriptTag(routeGraph(path, knowledge)),
    );
  }

  // Частые вопросы — только на главной, по тому же правилу, что и остальная разметка
  // по месту. На прочих адресах заглушка вырезается, а не наполняется.
  if (path === '/') {
    if (parts.faqLd) html = replaceOne(html, 'разметка faq-ld', FAQ_LD, parts.faqLd);
    if (parts.faqBlock) {
      html = replaceOne(html, 'блок частых вопросов', PRERENDER_FAQ, parts.faqBlock);
    }
  } else {
    html = replaceOne(html, 'разметка faq-ld', FAQ_LD, '');
  }

  const body = path === '/releases' ? releasesBody() : routeBody(path, parts.extra);
  if (body) {
    html = replaceOne(html, 'статический слепок в <body>', PRERENDER_BODY, body);
  } else if (path === '/') {
    // У главной свой слепок, написанный руками в `index.html`, — он и есть источник
    // для остальных страниц, подменять его нечем. Ей дописывается только навигация:
    // без неё робот попадает на главную и упирается в тупик, потому что уйти с неё
    // по ссылке некуда.
    html = replaceOne(html, 'статический слепок в <body>', PRERENDER_BODY, (match) =>
      match.replace(/<\/main>$/, [navBlock('/'), '      </main>'].join('\n')),
    );
  }
  return html;
}

/**
 * Документ для несуществующего адреса: `noindex`, своё тело, ссылки наружу.
 *
 * `canonical` и `og:url` отсюда не убираются, а ставятся на главную: страница ошибки,
 * объявляющая канонической саму себя, просится в индекс — а ей там нечего делать.
 */
export function renderNotFound(indexHtml: string): string {
  let html = renderRoute(indexHtml, '/');
  // Страница ошибки — не главная: вопросы с главной ей не принадлежат.
  html = replaceOne(html, 'разметка faq-ld', FAQ_LD, '');
  html = replaceOne(html, 'тег <title>', TITLE, '<title>Страница не найдена — Habitoff</title>');
  html = replaceOne(
    html,
    'мета-тег description',
    metaByName('description'),
    '<meta name="description" content="Такой страницы нет: адрес набран с опечаткой или страница переехала. Открытый каталог Habitoff — факты и мифы, связки, смыслы, описание метода — на месте." />',
  );
  html = replaceOne(
    html,
    'мета-тег robots',
    metaByName('robots'),
    '<meta name="robots" content="noindex, follow" />',
  );
  html = replaceOne(html, 'блок application/ld+json', LD_JSON, scriptTag(notFoundGraph()));
  html = replaceOne(html, 'статический слепок в <body>', PRERENDER_BODY, notFoundBody());
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
