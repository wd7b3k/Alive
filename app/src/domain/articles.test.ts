import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ARTICLES,
  ARTICLE_CLUSTERS,
  articleHref,
  articlesForCard,
  articlesForContext,
} from './articles';
import { EMPTY_KNOWLEDGE, type Knowledge, type KnowledgeCard } from '../data';

/**
 * Отбор разборов: что показывается, где и — главное — где не показывается.
 *
 * Проверки этого раздела до 05.09.2026 смотрели на отданный HTML. Он был правильным:
 * ссылки в статическом слепке стояли. Человек их не видел, потому что React заменяет
 * слепок собой. Поэтому здесь проверяется то, что решает приложение, а не то, что отдал
 * сервер.
 */
function card(code: string, surfaces: string[]): KnowledgeCard {
  return {
    code,
    kind: 'fact',
    claim_ru: code,
    known_ru: '',
    changes_ru: '',
    detail_ru: '',
    evidence_level: 'A',
    product_types: [],
    surfaces: surfaces as KnowledgeCard['surfaces'],
    sort_order: 10,
    sources: [],
  };
}

function knowledgeWith(cards: KnowledgeCard[]): Knowledge {
  return { ...EMPTY_KNOWLEDGE, cards };
}

/** Любая настоящая статья с её настоящими кодами — фикстуру тут выдумывать незачем. */
const sample = ARTICLES[0];

describe('индекс статей', () => {
  it('непустой и согласован с реестром кластеров', () => {
    expect(ARTICLE_CLUSTERS.length).toBeGreaterThan(0);
    expect(ARTICLES.length).toBeGreaterThan(0);
    const slugs = new Set(ARTICLE_CLUSTERS.map((cluster) => cluster.slug));
    for (const article of ARTICLES) expect(slugs, article.slug).toContain(article.cluster);
  });

  it('у каждой статьи есть процитированные коды — через них она получает контекст', () => {
    for (const article of ARTICLES) {
      expect(article.claims.length, article.slug).toBeGreaterThan(0);
    }
  });

  it('адрес статьи — вложенный путь, а не адрес карточки', () => {
    expect(articleHref(sample)).toBe(`/knowledge/${sample.cluster}/${sample.slug}`);
  });
});

describe('обратный индекс «карточка → разборы»', () => {
  it('находит статью по коду, который она цитирует', () => {
    const found = articlesForCard(sample.claims[0]);
    expect(found.map((article) => article.slug)).toContain(sample.slug);
  });

  it('на карточку без цитат не отдаёт ничего — блока «Подробнее» не будет', () => {
    expect(articlesForCard('takogo_koda_net')).toEqual([]);
  });

  it('не отдаёт длинный список: выбирать из десяти — не помощь', () => {
    for (const article of ARTICLES) {
      expect(articlesForCard(article.claims[0]).length).toBeLessThanOrEqual(3);
    }
  });
});

describe('разбор под момент', () => {
  const knowledge = knowledgeWith(sample.claims.map((code) => card(code, ['links', 'today'])));

  it('отдаёт статью на разрешённой поверхности', () => {
    const found = articlesForContext(knowledge, { surface: 'links', limit: 5 });
    expect(found.map((article) => article.slug)).toContain(sample.slug);
  });

  /**
   * P17: в момент тяги нужно меньше действий, а не лонгрид. Проверка негативная и
   * поэтому единственная, которая тут по-настоящему нужна.
   */
  it('в потоке тяги не отдаёт ничего, даже если карточка там стоит', () => {
    const inFlow = knowledgeWith(sample.claims.map((code) => card(code, ['flow'])));
    expect(articlesForContext(inFlow, { surface: 'flow', limit: 5 })).toEqual([]);
    // И на поверхности, где карточки нет, — тоже пусто, а не «что-нибудь похожее».
    expect(articlesForContext(inFlow, { surface: 'today', limit: 5 })).toEqual([]);
  });

  it('фильтрует по продукту так же, как карточки', () => {
    const withProducts = ARTICLES.find((article) => article.product_types.length);
    expect(withProducts, 'ни у одной статьи нет продуктов — фикстура устарела').toBeTruthy();
    const onSurface = knowledgeWith(withProducts!.claims.map((code) => card(code, ['today'])));
    const alien = withProducts!.product_types.includes('hookah') ? 'vape' : 'hookah';
    const found = articlesForContext(onSurface, {
      surface: 'today',
      products: [alien as never],
      limit: 5,
    });
    expect(found.map((article) => article.slug)).not.toContain(withProducts!.slug);
  });

  it('привязанное к моменту идёт впереди общего', () => {
    const withTrigger = ARTICLES.find((article) => article.triggers.length);
    expect(withTrigger).toBeTruthy();
    const all = knowledgeWith(
      ARTICLES.flatMap((article) => article.claims).map((code) => card(code, ['links'])),
    );
    const found = articlesForContext(all, {
      surface: 'links',
      triggerCode: withTrigger!.triggers[0],
      limit: 5,
    });
    for (const article of found) {
      expect(article.triggers, article.slug).toContain(withTrigger!.triggers[0]);
    }
  });
});

describe('индекс не устарел', () => {
  /**
   * Индекс коммитится, а не собирается на выкладке (ADR-0017), — значит он способен
   * отстать от `content/knowledge`. Сверка идёт по составу: если статья добавлена или
   * переименована, а индекс не пересобран, тест краснеет.
   */
  it('содержит ровно те статьи, что лежат в content/knowledge', () => {
    const registry = JSON.parse(
      readFileSync(
        fileURLToPath(new URL('../../../content/knowledge/clusters.json', import.meta.url)),
        'utf8',
      ),
    ) as { clusters: { slug: string; articles: string[] }[] };
    const expected = registry.clusters
      .flatMap((cluster) => cluster.articles.map((slug) => `${cluster.slug}/${slug}`))
      .sort();
    const actual = ARTICLES.map((article) => `${article.cluster}/${article.slug}`).sort();
    expect(actual, 'пересобери индекс: npm run build в app/').toEqual(expected);
  });
});
