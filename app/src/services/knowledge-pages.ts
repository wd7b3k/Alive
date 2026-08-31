/**
 * Страницы базы знаний: разметка, подстановка утверждений и структурированные данные.
 *
 * Модуль этапа сборки — как `prerender.ts`, в рантайм приложения не попадает.
 *
 * Страница статьи — **статика без React**. Причина в весе: стартовый чанк приложения
 * весит 613 КБ, а человеку, пришедшему из поиска прочитать один ответ, приложение не
 * нужно вовсе. Оформление приезжает тем же файлом стилей, что и у приложения, поэтому
 * вторая дизайн-система не заводится: `EvidenceBadge` и границы выглядят здесь так же,
 * как в разделе.
 *
 * Тексты утверждений подставляются из каталога (ADR-0017). Своего текста утверждения у
 * статьи нет, поэтому расходиться нечему; сверка хэша с замком ловит обратный случай —
 * карточку правили, а статью вокруг неё никто не перечитывал.
 */
import { EVIDENCE_LEVELS, type EvidenceLevelCode } from '../domain/evidence-levels';
import { articlePath, type Article, type Cluster, type ClusterRegistry } from './knowledge-content';
import { escapeHtml } from './prerender';
import { ORIGIN } from './seo';

/** Утверждение каталога в том виде, в каком его отдаёт `scripts/knowledge-lock.mjs`. */
export type Claim = {
  code: string;
  kind: 'fact' | 'myth';
  claim: string;
  known: string;
  changes: string;
  detail: string;
  level: EvidenceLevelCode;
  source: {
    title: string;
    original: string | null;
    url: string | null;
    publication: string | null;
    year: number | null;
  } | null;
};

export type Lock = {
  claims: Record<string, { kind: string; level: string; hash: string }>;
};

export type Assets = { css: string[] };

const NAV: ReadonlyArray<[string, string]> = [
  ['/', 'Главная'],
  ['/knowledge', 'Факты и мифы'],
  ['/links', 'Связки'],
  ['/meanings', 'Смыслы'],
  ['/experiment', 'О методе'],
  ['/releases', 'Что нового'],
];

/**
 * Оговорка, которую печатает шаблон, а не автор.
 *
 * У раздела нет медицинского рецензента, и вся страховка — форма
 * (`docs/EDITORIAL_PROTOCOL_MED.md`). Оговорку, которую пишет человек, человек и
 * забывает; эта строка стоит на каждой странице по устройству.
 */
export const DISCLAIMER =
  'Это не медицинская рекомендация. Habitoff не заменяет врача, психотерапевта и ' +
  'доказательное лечение; решение о препарате принимает врач.';

/**
 * Описание страницы для поиска: целые предложения, а не обрубок.
 *
 * Мета-описание, оборванное посреди слова, выглядит в выдаче так же, как выглядит:
 * недоделанным. Режем по границе предложения, а если её нет — по границе слова.
 */
export function summarize(text: string, max = 300): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentence > max / 2) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function levelOf(code: EvidenceLevelCode) {
  return EVIDENCE_LEVELS.find((level) => level.code === code) ?? EVIDENCE_LEVELS[2];
}

// ---------------------------------------------------------------------------
// Разметка текста
// ---------------------------------------------------------------------------

/**
 * Подмножество Markdown, которого хватает статье.
 *
 * Заголовки второго и третьего уровня, абзацы, списки, цитаты, ссылки, выделение,
 * сноски на библиографию и подстановка утверждения. Больше ничего: зависимость ради
 * шести форм записи не заводится, а тихо проглоченная разметка в медицинском тексте
 * дороже любого удобства — всё, что не разобрано, роняет сборку.
 */
function inline(raw: string, article: Article): string {
  let html = escapeHtml(raw);
  html = html.replace(/\[\^(\d+)\]/g, (_, number: string) => {
    const index = Number(number);
    return (
      `<sup class="r-article-ref"><a href="#istochnik-${index}" ` +
      `aria-label="Источник ${index}">${index}</a></sup>`
    );
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
    const external = /^https?:/.test(href);
    const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : '';
    return `<a href="${escapeHtml(href)}"${attrs}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  html = html.replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  if (/[*_`]{1}/.test(html.replace(/<[^>]+>/g, ''))) {
    // Осталась неразобранная разметка — значит текст рассчитывал на то, чего этот
    // рендерер не умеет, и на странице она была бы видна звёздочками.
    throw new Error(
      `База знаний, ${article.file}: неразобранная разметка в строке «${raw.slice(0, 60)}»`,
    );
  }
  return html;
}

/** Устойчивый якорь заголовка: русский текст в латиницу, чтобы ссылка читалась. */
const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export function anchor(text: string): string {
  return (
    text
      .toLowerCase()
      .split('')
      .map((letter) => TRANSLIT[letter] ?? letter)
      .join('')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'razdel'
  );
}

/** Утверждение каталога внутри статьи. */
function claimBlock(claim: Claim): string {
  const level = levelOf(claim.level);
  const isMyth = claim.kind === 'myth';
  const source = claim.source;
  const bibliography = source
    ? `<p class="r-article-claim-source">${
        source.url
          ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(source.title)}</a>`
          : escapeHtml(source.title)
      }${
        source.publication || source.year
          ? ` <small>${escapeHtml([source.publication, source.year].filter(Boolean).join(' · '))}</small>`
          : ''
      }</p>`
    : '';
  return [
    `<aside class="r-article-claim ${isMyth ? 'myth' : 'fact'}" id="claim-${escapeHtml(claim.code)}">`,
    '  <header>',
    `    <span class="r-knowledge-kind">${isMyth ? 'Разобранный миф' : 'Факт'} из каталога Habitoff</span>`,
    `    <span class="r-evidence-badge level-${claim.level.toLowerCase()}"><b>${claim.level}</b>${escapeHtml(level.label_ru)}</span>`,
    '  </header>',
    isMyth
      ? `  <p class="r-knowledge-myth-claim"><b>Миф.</b> ${escapeHtml(claim.claim)}</p>`
      : `  <p class="r-article-claim-title"><b>${escapeHtml(claim.claim)}</b></p>`,
    `  <p><b>Что известно.</b> ${escapeHtml(claim.known)}</p>`,
    `  <p><b>Что это меняет для тебя.</b> ${escapeHtml(claim.changes)}</p>`,
    `  <p class="r-evidence-limit">${escapeHtml(claim.detail)}</p>`,
    `  <p class="r-evidence-limit">${escapeHtml(level.limit_ru)}</p>`,
    bibliography,
    '  <p class="r-article-claim-back"><a href="/knowledge">Карточка в разделе «Факты и мифы»</a></p>',
    '</aside>',
  ]
    .filter(Boolean)
    .join('\n');
}

export type Rendered = { html: string; toc: { id: string; title: string }[] };

export function renderBody(article: Article, claims: Map<string, Claim>): Rendered {
  const blocks = article.body.split(/\n\s*\n/);
  const out: string[] = [];
  const toc: { id: string; title: string }[] = [];
  const used = new Set<string>();

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const claimMatch = /^\{\{claim:([a-z0-9_]+)\}\}$/.exec(block);
    if (claimMatch) {
      const claim = claims.get(claimMatch[1]);
      if (!claim) {
        throw new Error(
          `База знаний, ${article.file}: утверждение «${claimMatch[1]}» не найдено в каталоге. ` +
            'Страницу с дырой на месте медицинского утверждения выложить нельзя.',
        );
      }
      out.push(claimBlock(claim));
      continue;
    }

    const heading = /^(##|###)\s+(.+)$/.exec(block);
    if (heading) {
      const title = heading[2].trim();
      let id = anchor(title);
      while (used.has(id)) id = `${id}-2`;
      used.add(id);
      if (heading[1] === '##') toc.push({ id, title });
      const tag = heading[1] === '##' ? 'h2' : 'h3';
      out.push(`<${tag} id="${id}">${inline(title, article)}</${tag}>`);
      continue;
    }

    if (block.split('\n').every((line) => line.startsWith('- '))) {
      const items = block
        .split('\n')
        .map((line) => `  <li>${inline(line.slice(2).trim(), article)}</li>`)
        .join('\n');
      out.push(`<ul>\n${items}\n</ul>`);
      continue;
    }

    if (block.split('\n').every((line) => line.startsWith('> '))) {
      const text = block
        .split('\n')
        .map((line) => line.slice(2).trim())
        .join(' ');
      out.push(`<blockquote><p>${inline(text, article)}</p></blockquote>`);
      continue;
    }

    if (block.startsWith('#') || block.startsWith('|') || block.startsWith('```')) {
      throw new Error(
        `База знаний, ${article.file}: разметка «${block.slice(0, 30)}» не поддерживается`,
      );
    }

    out.push(`<p>${inline(block.replace(/\n/g, ' '), article)}</p>`);
  }
  return { html: out.join('\n\n'), toc };
}

// ---------------------------------------------------------------------------
// Документ
// ---------------------------------------------------------------------------

type Head = {
  title: string;
  description: string;
  path: string;
  jsonLd?: unknown[];
};

/**
 * Общий каркас страницы базы знаний.
 *
 * Заголовок, описание и canonical — как у остальных адресов домена; шапка и подвал —
 * настоящие ссылки, а не кнопки, потому что этот документ читают и без JavaScript.
 * Скрипта приложения здесь нет: см. комментарий модуля.
 */
function page(head: Head, assets: Assets, body: string): string {
  const url = ORIGIN + head.path;
  const title = escapeHtml(head.title);
  const description = escapeHtml(head.description);
  const styles = assets.css
    .map((href) => `    <link rel="stylesheet" href="${escapeHtml(href)}" />`)
    .join('\n');
  const jsonLd = head.jsonLd?.length
    ? `    <script type="application/ld+json">\n${JSON.stringify(
        { '@context': 'https://schema.org', '@graph': head.jsonLd },
        null,
        2,
      )}\n    </script>\n`
    : '';
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#061013" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Habitoff" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ORIGIN}/og-card.png" />
    <meta name="twitter:card" content="summary_large_image" />
${styles}
${jsonLd}  </head>
  <body class="r-static">
    <header class="r-static-header">
      <a class="r-static-brand" href="/">Habitoff</a>
      <nav aria-label="Разделы Habitoff">
        <ul>
${NAV.map(([href, label]) => `          <li><a href="${href}">${escapeHtml(label)}</a></li>`).join('\n')}
        </ul>
      </nav>
    </header>
${body}
    <footer class="r-static-footer">
      <p>${escapeHtml(DISCLAIMER)}</p>
      <p>
        <a href="/knowledge/method">Как отбираются источники</a> ·
        <a href="/knowledge">Факты и мифы</a> ·
        <a href="/experiment">О методе</a> ·
        <a href="/">Habitoff</a>
      </p>
    </footer>
  </body>
</html>
`;
}

function breadcrumbs(trail: { href: string; label: string }[]): string {
  const items = trail
    .map((step, index) =>
      index === trail.length - 1
        ? `<li aria-current="page">${escapeHtml(step.label)}</li>`
        : `<li><a href="${step.href}">${escapeHtml(step.label)}</a></li>`,
    )
    .join('\n          ');
  return `      <nav class="r-breadcrumbs" aria-label="Хлебные крошки">\n        <ol>\n          ${items}\n        </ol>\n      </nav>`;
}

function breadcrumbLd(trail: { href: string; label: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.label,
      item: ORIGIN + step.href,
    })),
  };
}

// ---------------------------------------------------------------------------
// Страница статьи
// ---------------------------------------------------------------------------

/**
 * Структурированные данные статьи.
 *
 * `citation` собирается из настоящей библиографии, а не из воздуха: карточка доски
 * `utverzhdeniya-v-razmetke-faq` появилась ровно потому, что в разметке — там, откуда
 * утверждение попадает в сниппет и в пересказ модели, — уровня, границ и источника не
 * было. Здесь у каждого утверждения источник есть.
 */
function articleLd(article: Article, cluster: Cluster, trail: { href: string; label: string }[]) {
  const url = ORIGIN + articlePath(article);
  const graph: unknown[] = [
    {
      '@type': 'MedicalWebPage',
      '@id': `${url}#page`,
      url,
      name: article.h1,
      headline: article.h1,
      description: article.answer_short,
      inLanguage: 'ru-RU',
      dateModified: article.updated,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      about: { '@type': 'MedicalCondition', name: 'Табачная зависимость' },
      audience: { '@type': 'PeopleAudience', audienceType: 'Взрослые курящие' },
      publisher: { '@type': 'Organization', name: 'Habitoff', url: `${ORIGIN}/` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      citation: article.sources.map((source) => ({
        '@type': 'CreativeWork',
        name: source.title,
        publisher: source.publication,
        datePublished: source.date,
        url: source.url,
      })),
      mainContentOfPage: {
        '@type': 'WebPageElement',
        cssSelector: '.r-article-body',
      },
      significantLink: cluster.articles
        .filter((slug) => slug !== article.slug)
        .map((slug) => `${ORIGIN}/knowledge/${cluster.slug}/${slug}`),
    },
    { ...breadcrumbLd(trail), '@id': `${url}#breadcrumb` },
  ];
  if (article.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: article.faq.map((entry) => ({
        '@type': 'Question',
        name: entry.q,
        acceptedAnswer: { '@type': 'Answer', text: entry.a },
      })),
    });
  }
  return graph;
}

export function renderArticle(
  article: Article,
  cluster: Cluster,
  claims: Map<string, Claim>,
  assets: Assets,
  all: Article[],
): string {
  const { html, toc } = renderBody(article, claims);
  const level = levelOf(article.level);
  const trail = [
    { href: '/', label: 'Главная' },
    { href: '/knowledge', label: 'Факты и мифы' },
    { href: `/knowledge/${cluster.slug}`, label: cluster.title },
    { href: articlePath(article), label: article.h1 },
  ];

  const sources = article.sources
    .map(
      (source, index) =>
        `          <li id="istochnik-${index + 1}">\n` +
        `            <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(source.title)}</a>\n` +
        `            <small>${escapeHtml([source.publication, source.date, source.type].filter(Boolean).join(' · '))}</small>\n` +
        '          </li>',
    )
    .join('\n');

  const related = article.related
    .map((path) => all.find((item) => `${item.cluster}/${item.slug}` === path))
    .filter((item): item is Article => Boolean(item))
    .map(
      (item) =>
        `          <li><a href="${articlePath(item)}">${escapeHtml(item.h1)}</a><small>${escapeHtml(item.question)}</small></li>`,
    )
    .join('\n');

  const changelog = article.changelog
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (entry) =>
        `          <li><time datetime="${entry.date}">${escapeHtml(entry.date)}</time> — ${escapeHtml(entry.what)}</li>`,
    )
    .join('\n');

  const faq = article.faq.length
    ? [
        '      <section class="r-article-faq">',
        '        <h2 id="chastye-voprosy">Частые вопросы</h2>',
        ...article.faq.map(
          (entry) =>
            `        <h3>${escapeHtml(entry.q)}</h3>\n        <p>${escapeHtml(entry.a)}</p>`,
        ),
        '      </section>',
      ].join('\n')
    : '';

  const body = [
    '    <main class="r-article">',
    breadcrumbs(trail),
    '      <article>',
    `        <h1>${escapeHtml(article.h1)}</h1>`,
    '        <p class="r-article-answer">' + escapeHtml(article.answer_short) + '</p>',
    '        <p class="r-article-meta">',
    `          <span class="r-evidence-badge level-${article.level.toLowerCase()}"><b>${article.level}</b>${escapeHtml(level.label_ru)}</span>`,
    `          <span class="r-evidence-limit">${escapeHtml(level.limit_ru)}</span>`,
    `          <span>Обновлено <time datetime="${article.updated}">${escapeHtml(article.updated)}</time></span>`,
    '        </p>',
    toc.length > 1
      ? '        <nav class="r-article-toc" aria-label="Содержание"><h2>В этой статье</h2><ol>' +
        toc.map((item) => `<li><a href="#${item.id}">${escapeHtml(item.title)}</a></li>`).join('') +
        '</ol></nav>'
      : '',
    '        <div class="r-article-body">',
    html,
    '        </div>',
    faq,
    '        <section class="r-article-sources">',
    '          <h2 id="istochniki">Источники</h2>',
    '          <ol>',
    sources,
    '          </ol>',
    '        </section>',
    '        <section class="r-article-changelog">',
    '          <h2 id="chto-izmenilos">Что изменилось и когда</h2>',
    '          <ul>',
    changelog,
    '          </ul>',
    '        </section>',
    related
      ? '        <section class="r-article-related">\n          <h2>Рядом</h2>\n          <ul>\n' +
        related +
        '\n          </ul>\n        </section>'
      : '',
    // Переход в продукт стоит после ответа, а не вместо него, и ведёт в чтение:
    // человек пришёл за ответом, и приглашение зарегистрироваться на первом экране
    // отвечает не на его вопрос, а на чужой.
    '        <aside class="r-article-next">',
    '          <p>Habitoff — некоммерческий эксперимент по изменению никотиновых автоматизмов.</p>',
    '          <p><a href="/links">Посмотреть, из чего состоят связки</a> · <a href="/knowledge">Все факты и мифы</a></p>',
    '        </aside>',
    '      </article>',
    '    </main>',
  ]
    .filter(Boolean)
    .join('\n');

  return page(
    {
      title: article.title,
      description: summarize(article.answer_short),
      path: articlePath(article),
      jsonLd: articleLd(article, cluster, trail),
    },
    assets,
    body,
  );
}

// ---------------------------------------------------------------------------
// Страница кластера
// ---------------------------------------------------------------------------

export function renderCluster(cluster: Cluster, articles: Article[], assets: Assets): string {
  const trail = [
    { href: '/', label: 'Главная' },
    { href: '/knowledge', label: 'Факты и мифы' },
    { href: `/knowledge/${cluster.slug}`, label: cluster.title },
  ];
  const items = cluster.articles
    .map((slug) => articles.find((article) => article.slug === slug))
    .filter((article): article is Article => Boolean(article))
    .map(
      (article) =>
        `          <li>\n` +
        `            <h2><a href="${articlePath(article)}">${escapeHtml(article.h1)}</a></h2>\n` +
        `            <p>${escapeHtml(article.answer_short)}</p>\n` +
        `            <p class="r-article-meta"><span class="r-evidence-badge level-${article.level.toLowerCase()}"><b>${article.level}</b>${escapeHtml(levelOf(article.level).label_ru)}</span> <span>Обновлено ${escapeHtml(article.updated)}</span></p>\n` +
        '          </li>',
    )
    .join('\n');

  const body = [
    '    <main class="r-article r-cluster">',
    breadcrumbs(trail),
    `      <h1>${escapeHtml(cluster.h1)}</h1>`,
    ...cluster.intro.map((text) => `      <p>${escapeHtml(text)}</p>`),
    '      <ol class="r-cluster-list">',
    items,
    '      </ol>',
    '      <p><a href="/knowledge/method">Как отбираются источники и что означают уровни</a></p>',
    '    </main>',
  ].join('\n');

  return page(
    {
      title: cluster.title,
      description: cluster.description,
      path: `/knowledge/${cluster.slug}`,
      jsonLd: [
        {
          '@type': 'CollectionPage',
          '@id': `${ORIGIN}/knowledge/${cluster.slug}#page`,
          url: `${ORIGIN}/knowledge/${cluster.slug}`,
          name: cluster.h1,
          description: cluster.description,
          inLanguage: 'ru-RU',
          isPartOf: { '@id': `${ORIGIN}/#website` },
          hasPart: cluster.articles.map((slug) => ({
            '@type': 'MedicalWebPage',
            '@id': `${ORIGIN}/knowledge/${cluster.slug}/${slug}#page`,
          })),
        },
        breadcrumbLd(trail),
      ],
    },
    assets,
    body,
  );
}

// ---------------------------------------------------------------------------
// Страница метода
// ---------------------------------------------------------------------------

/**
 * Как раздел устроен — и почему эта страница обязательна.
 *
 * Медицинского рецензента у базы знаний нет. Значит экспертность подтверждается не
 * подписью, а методом: правилом отбора источников, словарём уровней, обозначенной
 * границей знания и порядком обновления. Страница пишется вместе с первым кластером, а
 * не «потом»: раздел без неё утверждает то же самое, но без основания.
 */
export function renderMethod(
  registry: ClusterRegistry,
  articles: Article[],
  assets: Assets,
): string {
  const trail = [
    { href: '/', label: 'Главная' },
    { href: '/knowledge', label: 'Факты и мифы' },
    { href: '/knowledge/method', label: 'Как собран раздел' },
  ];
  const levels = EVIDENCE_LEVELS.map(
    (level) =>
      `        <dt><span class="r-evidence-badge level-${level.code.toLowerCase()}"><b>${level.code}</b>${escapeHtml(level.label_ru)}</span></dt>\n` +
      `        <dd><p>${escapeHtml(level.claim_ru)}</p><p class="r-evidence-limit">${escapeHtml(level.limit_ru)}</p></dd>`,
  ).join('\n');

  const clusters = registry.clusters
    .map(
      (cluster) =>
        `        <li><a href="/knowledge/${cluster.slug}">${escapeHtml(cluster.title)}</a> — ${cluster.articles.length}</li>`,
    )
    .join('\n');

  const body = [
    '    <main class="r-article">',
    breadcrumbs(trail),
    '      <article>',
    '        <h1>Как собран раздел: источники, уровни и границы</h1>',
    '        <p class="r-article-answer">',
    '          Каждое утверждение о здоровье в Habitoff приезжает вместе с уровнем доказательности,',
    '          границей применимости и ссылкой на первоисточник. Медицинского рецензента у раздела',
    '          нет, и это сказано прямо: вместо подписи под текстом здесь описан метод, по которому',
    '          текст собран, — его можно проверить.',
    '        </p>',
    '        <div class="r-article-body">',
    '<h2 id="istochniki">Какие источники считаются источниками</h2>',
    '<p>Только первоисточник: сам систематический обзор, клиническое руководство или исследование. Пересказ пересказа источником не считается, и это не редакционное пожелание — список разрешённых изданий лежит в коде рядом с проверкой, и статья со ссылкой на пересказ не собирается.</p>',
    '<p>Основные издания раздела — Кокрейновская библиотека, ВОЗ, NICE, CDC, BMJ, NEJM, JAMA. У каждого источника обязательны дата и адрес: ссылка когда-нибудь умрёт, а по названию, изданию и году документ всё ещё можно найти.</p>',
    '<h2 id="urovni">Что означают уровни</h2>',
    '<p>Три буквы, один словарь на весь продукт — тот же, что стоит на карточках в разделе «Факты и мифы». Четвёртого словаря уровней в системе не заводится.</p>',
    `<dl class="r-method-levels">\n${levels}\n</dl>`,
    '<h2 id="granica">Что означает «граница знания»</h2>',
    '<p>Утверждение никогда не появляется без того, где доказательство заканчивается. Среднее по большой группе — это не прогноз для одного человека; эффект, измеренный в моменте, — не доказательство того, что он помогает бросить; результат одного исследования — не установленный факт.</p>',
    '<p>Три популярных утверждения в продукт сознательно не попали, потому что источника у них нет: «тяга длится 3–5 минут», «вейп на 95 % безопаснее сигарет» и любое соотношение «один кальян = N сигарет». Отсутствие ответа честнее придуманного, и приписывать эти утверждения Habitoff нельзя.</p>',
    '<h2 id="obnovlenie">Как раздел обновляется</h2>',
    '<p>У каждой статьи есть дата обновления и запись о том, что именно изменилось. Правка опубликованной статьи без такой записи не собирается: раздел существует ради границ, а граница, изменившаяся молча, — ровно то, чего он не должен допускать.</p>',
    '<p>Утверждения каталога статьи не пересказывают, а цитируют по коду. Текст приезжает из базы на сборке, поэтому правка карточки доходит до статьи сама; если карточку правили, а статью вокруг неё никто не перечитывал, сборка отказывается собираться. Устройство целиком — <a href="https://github.com/wd7b3k/Alive/blob/main/docs/decisions/ADR-0017-knowledge-base.md">ADR-0017</a>.</p>',
    '<h2 id="otvetstvennost">Кто отвечает за содержание</h2>',
    '<p>Habitoff — некоммерческий эксперимент, выросший из личной задачи автора. Медицинского рецензента у раздела нет; это ограничение названо здесь, а не спрятано. Ничто в разделе не является медицинской рекомендацией и не заменяет врача, психотерапевта и доказательное лечение.</p>',
    '<p>Ошибку в тексте или умершую ссылку можно прислать через <a href="https://github.com/wd7b3k/Alive/issues">репозиторий проекта</a>: раздел собран из него, и исправление доезжает до страницы той же выкладкой.</p>',
    '<h2 id="klastery">Что уже есть</h2>',
    `<ul>\n${clusters}\n</ul>`,
    `<p>Всего статей: ${articles.length}.</p>`,
    '        </div>',
    '      </article>',
    '    </main>',
  ].join('\n');

  return page(
    {
      title: 'Как собран раздел знаний Habitoff — источники, уровни, границы',
      description:
        'Правило отбора источников, словарь уровней доказательности A/B/C, что означает граница знания и как обновляются статьи. Медицинского рецензента у раздела нет — вместо подписи описан метод.',
      path: '/knowledge/method',
      jsonLd: [
        {
          '@type': 'AboutPage',
          '@id': `${ORIGIN}/knowledge/method#page`,
          url: `${ORIGIN}/knowledge/method`,
          name: 'Как собран раздел знаний Habitoff',
          inLanguage: 'ru-RU',
          isPartOf: { '@id': `${ORIGIN}/#website` },
        },
        breadcrumbLd(trail),
      ],
    },
    assets,
    body,
  );
}

// ---------------------------------------------------------------------------
// Лента обновлений
// ---------------------------------------------------------------------------

/**
 * Машинный срез последних изменений раздела.
 *
 * Адрес заводится сейчас, а конвейер обновлений — отдельная работа. Смысл в том, чтобы
 * у ленты с самого начала был один формат и один источник: список собирается из записей
 * `changelog` самих статей, а не пишется рядом руками.
 */
export function renderUpdatesLatest(articles: Article[]): string {
  const entries = articles
    .flatMap((article) =>
      article.changelog.map((change) => ({
        date: change.date,
        what: change.what,
        path: articlePath(article),
        title: article.h1,
      })),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path))
    .slice(0, 50);
  return `${JSON.stringify(
    {
      note: 'Последние изменения в базе знаний Habitoff. Собирается из записей changelog самих статей.',
      origin: ORIGIN,
      updated: entries[0]?.date ?? null,
      entries: entries.map((entry) => ({
        date: entry.date,
        title: entry.title,
        url: ORIGIN + entry.path,
        what: entry.what,
      })),
    },
    null,
    2,
  )}\n`;
}

export function renderUpdatesFeed(articles: Article[]): string {
  const entries = articles
    .slice()
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.slug.localeCompare(b.slug))
    .slice(0, 30);
  const items = entries
    .map((article) => {
      const url = ORIGIN + articlePath(article);
      const last = article.changelog.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
      return [
        '    <item>',
        `      <title>${escapeHtml(article.h1)}</title>`,
        `      <link>${escapeHtml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeHtml(url)}</guid>`,
        `      <pubDate>${new Date(`${article.updated}T00:00:00Z`).toUTCString()}</pubDate>`,
        `      <description>${escapeHtml(`${article.answer_short} Последнее изменение: ${last.what}`)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>База знаний Habitoff</title>',
    `    <link>${ORIGIN}/knowledge</link>`,
    '    <description>Статьи о том, что происходит с телом и привычкой после отказа от курения. У каждой — уровень доказательности, границы и источники.</description>',
    '    <language>ru</language>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Врезки на существующих страницах
// ---------------------------------------------------------------------------

/**
 * Ссылки на кластеры для статического слепка `/knowledge`.
 *
 * Передаётся в `renderRoute` отдельным куском, а не импортируется в `prerender.ts`:
 * тот модуль сознательно ничего не знает про содержание разделов, и `prerender.test.ts`
 * следит за списком его импортов. Кластеры — репозиторный текст, но правило «предрендер
 * не тянет содержание» стоит того, чтобы не делать для него исключение.
 */
export function clusterLinks(registry: ClusterRegistry): string {
  const items = registry.clusters
    .map(
      (cluster) =>
        `          <li><a href="/knowledge/${cluster.slug}">${escapeHtml(cluster.title)}</a> — ${escapeHtml(cluster.description)}</li>`,
    )
    .join('\n');
  return [
    '<h2>Разборы по темам</h2>',
    '        <p>',
    '          Карточки отвечают коротко. Ниже — статьи: по одной на вопрос, с механизмом,',
    '          границами и своей библиографией.',
    '        </p>',
    '        <ul>',
    items,
    '        </ul>',
    '        <p><a href="/knowledge/method">Как отбираются источники и что означают уровни</a></p>',
  ].join('\n        ');
}

/**
 * Частые вопросы на главной — из статей, а не из руками написанной копии.
 *
 * Карточка доски `utverzhdeniya-v-razmetke-faq`: в разметке `FAQPage`, то есть ровно
 * там, откуда утверждение попадает в сниппет и в пересказ языковой модели, не было ни
 * уровня, ни границ, ни источника — при том что в базе все три обязательны. Теперь
 * ответ приезжает из статьи вместе со своей библиографией, и у каждого вопроса есть
 * адрес, по которому видно, на чём он стоит.
 */
function homeFaqArticles(registry: ClusterRegistry, articles: Article[]): Article[] {
  const chosen = registry.home_faq ?? [];
  return chosen.map((path) => {
    const article = articles.find((item) => `${item.cluster}/${item.slug}` === path);
    if (!article) {
      throw new Error(`clusters.json: в home_faq назван «${path}», а такой статьи нет`);
    }
    return article;
  });
}

export function homeFaqBlock(registry: ClusterRegistry, articles: Article[]): string {
  const chosen = homeFaqArticles(registry, articles);
  const entries = chosen
    .map(
      (article) =>
        `        <h3>${escapeHtml(article.question)}</h3>\n` +
        `        <p>${escapeHtml(article.answer_short)} <a href="${articlePath(article)}">Разбор с источниками</a>.</p>`,
    )
    .join('\n');
  return [
    '<section class="r-prerender-faq">',
    '        <h2>Частые вопросы</h2>',
    entries,
    '      </section>',
  ].join('\n        ');
}

export function homeFaqLd(registry: ClusterRegistry, articles: Article[]): string {
  const chosen = homeFaqArticles(registry, articles);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${ORIGIN}/#faq`,
    mainEntity: chosen.map((article) => ({
      '@type': 'Question',
      name: article.question,
      url: ORIGIN + articlePath(article),
      acceptedAnswer: {
        '@type': 'Answer',
        text: article.answer_short,
        url: ORIGIN + articlePath(article),
        citation: article.sources.map((source) => ({
          '@type': 'CreativeWork',
          name: source.title,
          publisher: source.publication,
          datePublished: source.date,
          url: source.url,
        })),
      },
    })),
  };
  return `<script type="application/ld+json" id="faq-ld">\n${JSON.stringify(data, null, 2)}\n    </script>`;
}
