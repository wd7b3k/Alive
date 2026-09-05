import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ArticleMore, KnowledgeClusters } from './knowledge';
import { ARTICLES, ARTICLE_CLUSTERS, articlesForCard } from '../domain/articles';

/**
 * Из приложения в разборы обязан быть путь.
 *
 * 05.09.2026 девятнадцать страниц выложили и проверили — краулером. Снаружи всё сходилось:
 * ссылки стояли в статическом слепке `/knowledge`, `sitemap.xml` знал все адреса, IndexNow
 * их принял. Участник, открывший тот же адрес в браузере, не видел ни одной: React
 * заменяет слепок собой при монтировании.
 *
 * Ни одна проверка этого не поймала, потому что все они смотрели на отданный HTML.
 * Здесь проверяется то, что рисует React.
 */
const app = readFileSync(fileURLToPath(new URL('../RedesignApp.tsx', import.meta.url)), 'utf8');

describe('раздел ведёт в разборы', () => {
  const markup = renderToStaticMarkup(<KnowledgeClusters />);

  it('реестр непустой, а ссылок в разделе ноль — так быть не должно', () => {
    // Ровно та поломка, ради которой этот файл написан: статьи есть, ссылок нет.
    expect(ARTICLE_CLUSTERS.length).toBeGreaterThan(0);
    const hrefs = markup.match(/href="\/knowledge\/[^"]+"/g) ?? [];
    expect(hrefs.length, 'в разделе нет ни одной ссылки на разборы').toBeGreaterThan(0);
  });

  it('на каждый кластер есть ссылка и его название видно', () => {
    for (const cluster of ARTICLE_CLUSTERS) {
      expect(markup, cluster.slug).toContain(`href="/knowledge/${cluster.slug}"`);
      expect(markup, cluster.slug).toContain(cluster.title);
    }
  });

  it('страница метода тоже достижима', () => {
    expect(markup).toContain('href="/knowledge/method"');
  });

  it('блок стоит на обоих экранах раздела — до входа и после', () => {
    // Половина починки выглядит как целая: поставить ссылки только на публичный экран
    // и не заметить, что участник по-прежнему их не видит.
    expect(app.match(/<KnowledgeClusters[\s/>]/g) ?? []).toHaveLength(2);
  });
});

describe('блок «Подробнее»', () => {
  const withArticles = ARTICLES[0];

  it('рисует ссылки на разборы карточки', () => {
    const markup = renderToStaticMarkup(
      <ArticleMore
        articles={articlesForCard(withArticles.claims[0])}
        from="card"
        cardCode={withArticles.claims[0]}
      />,
    );
    expect(markup).toContain(`href="/knowledge/${withArticles.cluster}/`);
  });

  it('на пустом списке не рисует ничего — заголовка над пустотой не бывает', () => {
    expect(renderToStaticMarkup(<ArticleMore articles={[]} from="card" />)).toBe('');
  });
});

describe('переход — полной загрузкой, а не через роутер', () => {
  /**
   * Страница статьи — отдельный статический документ без React. `AppLink` перехватывает
   * обычный левый клик и отдаёт его роутеру, у которого такого экрана нет: человек
   * остался бы на прежней странице, решив, что ссылка сломана.
   */
  it('в блоках разборов нет AppLink', () => {
    const source = readFileSync(fileURLToPath(new URL('./knowledge.tsx', import.meta.url)), 'utf8');
    const block = source.slice(source.indexOf('export function ArticleLink'));
    expect(block).not.toContain('AppLink');
  });
});

describe('поток тяги остаётся без разборов', () => {
  /**
   * P17: в момент тяги нужно меньше действий, а не лонгрид. Отбор это гарантирует
   * (`domain/articles.test.ts`), а здесь проверяется, что блок туда просто не поставили:
   * гард в отборе не спасёт от `articlesForCard`, вызванного прямо во flow.
   */
  it('во flow не вызывается ни один блок разборов', () => {
    // Границы — от объявления карточек потока до следующего компонента верхнего уровня.
    // Брать шире нельзя: дальше идёт «Сегодня», где блок разборов как раз нужен.
    const from = app.indexOf('const flowCards');
    const flow = app.slice(from, app.indexOf('\nfunction ', from));
    expect(flow).not.toContain('ArticleMore');
    expect(flow).not.toContain('articlesForCard');
    expect(flow).not.toContain('articlesForContext');
  });
});
