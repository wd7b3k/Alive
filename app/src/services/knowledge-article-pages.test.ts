import { describe, expect, it } from 'vitest';

import { parseArticle, type Article, type Cluster } from './knowledge-articles';
import { checkNoVerbatimCopy } from './knowledge-article-pages';
import {
  anchor,
  DISCLAIMER,
  renderArticle,
  renderBody,
  renderCluster,
  renderMethod,
  renderUpdatesFeed,
  renderUpdatesLatest,
  summarize,
  type Claim,
} from './knowledge-article-pages';

/**
 * Страницы базы знаний: подстановка утверждений и отказы.
 *
 * Каталог здесь выдуманный. Это принципиально: настоящие тексты утверждений живут в
 * базе, и положить их в тест значило бы завести ту самую вторую копию, ради отсутствия
 * которой построен весь механизм (ADR-0020). Фикстура проверяет устройство, а не
 * содержание, и работает офлайн — в CI, где базы нет.
 */
const CLAIM: Claim = {
  code: 'proba_fakt',
  kind: 'fact',
  claim: 'Учебное утверждение каталога',
  known: 'Что известно по учебному утверждению.',
  changes: 'Что оно меняет для читателя.',
  detail: 'Границы учебного утверждения: это среднее по группе, а не прогноз для одного человека.',
  level: 'A',
  scope: 'Учебные границы',
  triggers: [],
  needs: [],
  replacements: [],
  tags: [],
  category: null,
  products: [],
  verified: '2026-01-01',
  updated: '2026-01-01',
  sort_order: 10,
  source_title: 'Учебный источник',
  source_url: 'https://example.org/uchebnyy',
  source_doi: null,
  source_publication: 'Учебное издание',
};

const MYTH: Claim = { ...CLAIM, code: 'proba_mif', kind: 'myth', claim: 'Учебное убеждение' };

const claims = new Map<string, Claim>([
  [CLAIM.code, CLAIM],
  [MYTH.code, MYTH],
]);

const RAW = `---
slug: proba
cluster: proba-klaster
title: Проба — заголовок для поиска | Habitoff
h1: Проба: заголовок страницы
question: Что проверяет этот файл?
answer_short: Учебная статья, существующая только внутри теста: она нужна, чтобы проверить подстановку утверждения, разметку страницы и отказы сборки на выдуманном каталоге, а не на настоящем.
level: B
claims:
  - proba_fakt
sources:
  - title: Учебный источник
    publication: Учебное издание
    date: 2020
    url: https://www.cdc.gov/tobacco/about/benefits-of-quitting.html
    type: материал органа здравоохранения
author:
reviewer:
updated: 2026-08-31
changelog:
  - date: 2026-08-31
    what: Заведена вместе с гардами.
related:
faq:
  - q: Это настоящая статья?
    a: Нет, учебная.
---

## На чём это основано

Уровень B, источник один[^1], и ссылка [на раздел](/knowledge) тоже есть.

{{claim:proba_fakt}}

## Что известно

- первый пункт
- второй пункт

> Цитата в одну строку.

Обычный абзац с **выделением**.
`;

const article: Article = parseArticle(RAW, 'content/knowledge/proba-klaster/proba.md');

const cluster: Cluster = {
  slug: 'proba-klaster',
  title: 'Учебный кластер',
  h1: 'Учебный кластер целиком',
  description: 'Описание учебного кластера',
  intro: ['Первый вводный абзац.'],
  articles: ['proba'],
};

const assets = { css: ['/assets/index-test.css'] };

describe('разметка текста статьи', () => {
  const { html, toc } = renderBody(article, claims);

  it('собирает оглавление из заголовков второго уровня', () => {
    expect(toc.map((item) => item.title)).toEqual(['На чём это основано', 'Что известно']);
    expect(html).toContain(`<h2 id="${toc[0].id}">`);
  });

  it('превращает сноску в ссылку на библиографию', () => {
    expect(html).toContain('href="#istochnik-1"');
  });

  it('подставляет утверждение каталога вместе с уровнем, границами и источником', () => {
    expect(html).toContain(CLAIM.claim);
    expect(html).toContain(CLAIM.known);
    expect(html).toContain(CLAIM.changes);
    expect(html).toContain(CLAIM.detail);
    expect(html).toContain('level-a');
    expect(html).toContain(CLAIM.source_url);
  });

  it('рисует список, цитату и выделение', () => {
    expect(html).toContain('<li>первый пункт</li>');
    expect(html).toContain('<blockquote><p>Цитата в одну строку.</p></blockquote>');
    expect(html).toContain('<b>выделением</b>');
  });

  it('падает, если утверждения нет в каталоге', () => {
    // Ровно тот случай, ради которого механизм и существует: страницу с дырой на месте
    // медицинского утверждения выложить нельзя даже на минуту.
    expect(() => renderBody(article, new Map())).toThrow(/не найдено в каталоге/);
  });

  it('падает на разметке, которую не умеет', () => {
    const broken = parseArticle(RAW.replace('- первый пункт', '| таблица |'), article.file);
    expect(() => renderBody(broken, claims)).toThrow(/не поддерживается/);
  });

  it('падает на неразобранном выделении', () => {
    const broken = parseArticle(RAW.replace('**выделением**', '**выделением'), article.file);
    expect(() => renderBody(broken, claims)).toThrow(/неразобранная разметка/);
  });

  it('отличает миф от факта в подстановке', () => {
    const mythArticle = parseArticle(RAW.replace(/proba_fakt/g, 'proba_mif'), article.file);
    const rendered = renderBody(mythArticle, claims);
    expect(rendered.html).toContain('r-article-claim myth');
    expect(rendered.html).toContain('<b>Миф.</b>');
  });
});

describe('страница статьи', () => {
  const html = renderArticle(article, cluster, claims, assets, [article]);

  it('несёт свой заголовок, описание и canonical на себя', () => {
    expect(html).toContain('<title>Проба — заголовок для поиска | Habitoff</title>');
    expect(html).toContain(
      '<link rel="canonical" href="https://habitoff.ru/knowledge/proba-klaster/proba" />',
    );
  });

  it('печатает оговорку шаблоном, а не силами автора', () => {
    expect(html).toContain(DISCLAIMER);
  });

  it('не грузит приложение', () => {
    // Человеку, пришедшему прочитать один ответ, 613 КБ приложения не нужны.
    expect(html).not.toContain('<script type="module"');
    expect(html).toContain('<link rel="stylesheet" href="/assets/index-test.css" />');
  });

  it('несёт хлебные крошки, источники с датами и запись об изменениях', () => {
    expect(html).toContain('r-breadcrumbs');
    expect(html).toContain('id="istochnik-1"');
    expect(html).toContain('Заведена вместе с гардами.');
  });

  it('даёт структурированные данные со ссылками на настоящие источники', () => {
    const graph = JSON.parse(
      html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] as string,
    );
    const page = graph['@graph'][0];
    expect(page['@type']).toBe('MedicalWebPage');
    expect(page.dateModified).toBe('2026-08-31');
    // Карточка доски utverzhdeniya-v-razmetke-faq: в разметке не было ни уровня, ни
    // границ, ни источника — при том что в базе все три обязательны.
    expect(page.citation).toHaveLength(1);
    expect(page.citation[0].url).toBe(article.sources[0].url);
    expect(graph['@graph'][1]['@type']).toBe('BreadcrumbList');
    expect(graph['@graph'][2]['@type']).toBe('FAQPage');
  });

  it('ставит переход в продукт после ответа, а не вместо него', () => {
    const answerAt = html.indexOf('r-article-answer');
    const nextAt = html.indexOf('r-article-next');
    expect(answerAt).toBeGreaterThan(-1);
    expect(nextAt).toBeGreaterThan(answerAt);
    // До закрытия бэкапов переход ведёт в чтение, а не в регистрацию.
    expect(html).not.toContain('href="/login"');
  });
});

describe('кластер, метод и лента', () => {
  it('страница кластера перечисляет статьи и ведёт на метод', () => {
    const html = renderCluster(cluster, [article], assets);
    expect(html).toContain('href="/knowledge/proba-klaster/proba"');
    expect(html).toContain('href="/knowledge/method"');
    expect(html).toContain('Учебный кластер целиком');
  });

  it('страница метода называет все три уровня и отсутствие рецензента', () => {
    const html = renderMethod({ clusters: [cluster] }, [article], assets);
    for (const level of ['<b>A</b>', '<b>B</b>', '<b>C</b>']) expect(html).toContain(level);
    expect(html).toContain('рецензента у раздела нет');
  });

  it('лента обновлений собирается из записей changelog', () => {
    const latest = JSON.parse(renderUpdatesLatest([article]));
    expect(latest.updated).toBe('2026-08-31');
    expect(latest.entries[0].url).toBe('https://habitoff.ru/knowledge/proba-klaster/proba');
    const feed = renderUpdatesFeed([article]);
    expect(feed).toContain('<rss version="2.0">');
    expect(feed).toContain('<link>https://habitoff.ru/knowledge/proba-klaster/proba</link>');
  });
});

describe('утверждение и его копия', () => {
  it('падает на дословной копии текста карточки', () => {
    const copied = parseArticle(
      RAW.replace('Обычный абзац с **выделением**.', CLAIM.detail + ' Ещё немного текста рядом.'),
      article.file,
    );
    expect(() => checkNoVerbatimCopy(copied, claims)).toThrow(/дословно повторяет/);
  });

  it('не считает копией разбор своими словами', () => {
    expect(() => checkNoVerbatimCopy(article, claims)).not.toThrow();
  });

  it('ведёт от процитированного утверждения на его собственный адрес', () => {
    // С 05.09.2026 у карточки есть своя страница. Ссылка на хаб отправляла бы читателя
    // искать её глазами среди тридцати восьми.
    const { html } = renderBody(article, claims);
    expect(html).toContain('href="/knowledge/proba-fakt"');
  });
});

describe('сноски внизу статьи', () => {
  const withNotes = (notes: string) =>
    parseArticle(
      `${RAW}
${notes}
`,
      article.file,
    );

  it('не рисует определения сносок: библиографию печатает шаблон', () => {
    const parsed = withNotes(
      '[^1]: Учебный источник, Учебное издание, 2020, https://example.org/u',
    );
    const { html } = renderBody(parsed, claims);
    expect(html).not.toContain('Учебный источник, Учебное издание');
    expect(html).toContain('href="#istochnik-1"');
  });

  it('падает на сноске, для которой нет источника', () => {
    const parsed = withNotes('[^9]: Источник, которого нет, 2020, https://example.org/u');
    expect(() => renderBody(parsed, claims)).toThrow(/источника с таким номером/);
  });
});

describe('мелочи, которые видно в выдаче', () => {
  it('режет описание по границе предложения, а не посреди слова', () => {
    const text =
      'Первое предложение здесь. Второе предложение заметно длиннее первого и не влезет.';
    expect(summarize(text, 40)).toBe('Первое предложение здесь.');
  });

  it('делает якорь заголовка читаемым', () => {
    expect(anchor('Что известно')).toBe('chto-izvestno');
  });
});
