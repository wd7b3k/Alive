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
 * Тексты утверждений подставляются из выгрузки `app/knowledge-catalog.json` — той же,
 * из которой собираются страницы карточек. Своего текста утверждения у статьи нет,
 * поэтому расходиться с каталогом ей нечем (ADR-0019).
 *
 * Процитированное утверждение ведёт на **свой адрес** `/knowledge/<код>`, а не на хаб
 * раздела: с 05.09.2026 у карточки есть собственная страница, и отправлять читателя
 * искать её глазами в списке из тридцати восьми — значит не отправлять никуда.
 */
import { EVIDENCE_LEVELS, type EvidenceLevelCode } from '../domain/evidence-levels';
import { pathForCode } from '../domain/knowledge-address';
import {
  articlePath,
  type Article,
  type Cluster,
  type ClusterRegistry,
} from './knowledge-articles';
import { type CatalogCard } from './knowledge-catalog';
import { escapeHtml } from './prerender';
import { ORIGIN } from './seo';

/**
 * Утверждение каталога, каким его видит статья.
 *
 * Это ровно `CatalogCard` из выгрузки — не своя форма и не своя копия. Псевдоним
 * оставлен затем, чтобы в тексте модуля было видно: подставляется утверждение каталога,
 * а не произвольная строка.
 */
export type Claim = CatalogCard;

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
  const level = levelOf(claim.level as EvidenceLevelCode);
  const isMyth = claim.kind === 'myth';
  const bibliography = claim.source_url
    ? `<p class="r-article-claim-source"><a href="${escapeHtml(claim.source_url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(claim.source_title)}</a>${
        claim.source_publication ? ` <small>${escapeHtml(claim.source_publication)}</small>` : ''
      }</p>`
    : `<p class="r-article-claim-source">${escapeHtml(claim.source_title)}</p>`;
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
    // Границы карточки из базы и границы уровня — разные вещи, и показываются обе:
    // первая говорит, где заканчивается это доказательство, вторая — что означает буква.
    claim.scope
      ? `  <p class="r-evidence-limit"><b>Границы:</b> ${escapeHtml(claim.scope)}</p>`
      : '',
    `  <p class="r-evidence-limit">${escapeHtml(level.limit_ru)}</p>`,
    bibliography,
    `  <p class="r-article-claim-back"><a href="${pathForCode(claim.code)}">Разбор этого утверждения целиком</a></p>`,
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

    // Определения сносок внизу статьи: `[^1]: название, издание, дата, адрес`.
    //
    // Они не рисуются. Библиографию печатает шаблон — из `sources` во фронтматтере, то
    // есть из полей, которые проверены гардами: первоисточник, дата, живой адрес. Если
    // напечатать заодно и эти строки, на странице окажутся два списка источников,
    // способные разойтись. Здесь они только сверяются с библиографией: номер обязан
    // существовать, и на каждый источник обязано найтись определение.
    if (block.split('\n').every((line) => /^\[\^\d+\]:\s/.test(line))) {
      const numbers = block.split('\n').map((line) => Number(/^\[\^(\d+)\]/.exec(line)?.[1]));
      for (const number of numbers) {
        if (!(number >= 1 && number <= article.sources.length)) {
          throw new Error(
            `База знаний, ${article.file}: сноска [^${number}] описана внизу статьи, ` +
              'а источника с таким номером в библиографии нет.',
          );
        }
      }
      if (new Set(numbers).size !== article.sources.length) {
        throw new Error(
          `База знаний, ${article.file}: внизу описано ${new Set(numbers).size} сносок, ` +
            `а источников во фронтматтере ${article.sources.length}. Страницу собирает ` +
            'библиография из фронтматтера — расхождение означает, что автор описал не её.',
        );
      }
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

// ---------------------------------------------------------------------------
// Что кладётся в сборку
// ---------------------------------------------------------------------------

/**
 * Дословная копия текста карточки внутри текста статьи.
 *
 * Это та же запрещённая копия, только записанная руками: статья, повторившая
 * утверждение своими буквами, перестанет обновляться вместе с каталогом. Порог —
 * предложение целиком, а не совпадение слов: разбирать утверждение своими словами
 * статья обязана, иначе ей нечего сказать.
 */
export function checkNoVerbatimCopy(article: Article, claims: Map<string, Claim>): void {
  const prose = article.body.replace(/\{\{claim:[a-z0-9_]+\}\}/g, ' ').replace(/\s+/g, ' ');
  for (const claim of claims.values()) {
    for (const [field, value] of Object.entries({
      claim: claim.claim,
      known: claim.known,
      changes: claim.changes,
      detail: claim.detail,
    })) {
      for (const sentence of String(value).split(/(?<=[.!?])\s+/)) {
        const normalized = sentence.trim().replace(/\s+/g, ' ');
        if (normalized.length < 40) continue;
        if (prose.includes(normalized)) {
          throw new Error(
            `База знаний, ${article.file}: дословно повторяет поле «${field}» карточки ` +
              `«${claim.code}» — «${normalized.slice(0, 60)}…». Это та же копия, которая ` +
              'разойдётся с каталогом на первой же миграции. Цитируй по коду: ' +
              `{{claim:${claim.code}}}`,
          );
        }
      }
    }
  }
}

export type ArticleFile = { path: string; contents: string; sources: string[] };

export type ArticlesBuild = {
  registry: ClusterRegistry;
  articles: Article[];
  /** Файлы для `dist`: путь относительно каталога вывода. */
  files: ArticleFile[];
  /** Адреса для карты сайта вместе с файлами, по которым считается `lastmod`. */
  routes: { path: string; sources: string[] }[];
};

/**
 * Файлы, от которых зависит вид **любой** статьи.
 *
 * Список нужен для `lastmod`: правка шаблона меняет все страницы раздела, и дата
 * должна это отражать. Дата сборки на её месте означала бы «всё изменилось» при каждой
 * выкладке, и поисковик перестал бы читать поле целиком.
 */
const SHARED_ARTICLE_SOURCES = [
  'src/services/knowledge-articles.ts',
  'src/services/knowledge-article-pages.ts',
  '../content/knowledge/clusters.json',
];

/**
 * Собирает раздел статей целиком: кластеры, статьи, метод и ленту обновлений.
 *
 * В базу не ходит и ходить не может: единственный источник утверждений — выгрузка
 * `app/knowledge-catalog.json`, переданная параметром. Поэтому сборка ведёт себя
 * одинаково на сервере выкладки и в CI, и «неполной сборки» больше не существует как
 * состояния (ADR-0019).
 */
export function buildArticles(
  contentDir: string,
  catalog: Map<string, Claim>,
  assets: Assets,
  read: (
    dir: string,
    codes: ReadonlySet<string>,
  ) => { registry: ClusterRegistry; articles: Article[] },
): ArticlesBuild {
  const { registry, articles } = read(contentDir, new Set(catalog.keys()));
  for (const article of articles) checkNoVerbatimCopy(article, catalog);

  const files: ArticleFile[] = [];
  const routes: { path: string; sources: string[] }[] = [];

  for (const cluster of registry.clusters) {
    const inCluster = articles.filter((article) => article.cluster === cluster.slug);
    files.push({
      path: `knowledge/${cluster.slug}/index.html`,
      contents: renderCluster(cluster, inCluster, assets),
      sources: SHARED_ARTICLE_SOURCES,
    });
    routes.push({
      path: `/knowledge/${cluster.slug}`,
      sources: [...SHARED_ARTICLE_SOURCES, ...inCluster.map((article) => `../${article.file}`)],
    });
    for (const article of inCluster) {
      files.push({
        path: `knowledge/${cluster.slug}/${article.slug}/index.html`,
        contents: renderArticle(article, cluster, catalog, assets, articles),
        sources: [...SHARED_ARTICLE_SOURCES, `../${article.file}`],
      });
      routes.push({
        path: articlePath(article),
        sources: [...SHARED_ARTICLE_SOURCES, `../${article.file}`],
      });
    }
  }

  files.push({
    path: 'knowledge/method/index.html',
    contents: renderMethod(registry, articles, assets),
    sources: SHARED_ARTICLE_SOURCES,
  });
  routes.push({ path: '/knowledge/method', sources: SHARED_ARTICLE_SOURCES });

  files.push({
    path: 'knowledge/updates/latest.json',
    contents: renderUpdatesLatest(articles),
    sources: SHARED_ARTICLE_SOURCES,
  });
  files.push({
    path: 'knowledge/updates/feed.xml',
    contents: renderUpdatesFeed(articles),
    sources: SHARED_ARTICLE_SOURCES,
  });

  return { registry, articles, files, routes };
}

/**
 * Раздел про кластеры для `llms.txt`.
 *
 * Сам файл собирается из базы скриптом выгрузки и коммитится; статьи в базе не лежат,
 * поэтому их список дописывается на сборке — из тех же данных, из которых собираются
 * страницы. Руками здесь не набирается ничего, включая числа.
 */
export function llmsArticlesSection(registry: ClusterRegistry, articles: Article[]): string {
  const lines: string[] = ['', '## Разборы', ''];
  lines.push(
    'Длинные статьи по одному вопросу: механизм, границы, чего до сих пор не знают, и',
    'собственная библиография у каждой. Утверждения каталога они не пересказывают, а',
    'цитируют — текст подставляется из той же выгрузки, что и страницы карточек.',
    '',
  );
  for (const cluster of registry.clusters) {
    const inCluster = cluster.articles
      .map((slug) => articles.find((article) => article.slug === slug))
      .filter((article): article is Article => Boolean(article));
    lines.push(`### ${cluster.title} (${inCluster.length})`, '');
    for (const article of inCluster) {
      lines.push(`- ${articlePath(article)} — ${article.question}`);
    }
    lines.push('');
  }
  lines.push('Как собран раздел: /knowledge/method', '');
  lines.push('Обновления: /knowledge/updates/latest.json и /knowledge/updates/feed.xml', '');
  return lines.join('\n');
}
