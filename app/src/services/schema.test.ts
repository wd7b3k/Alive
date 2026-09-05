import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { knowledgeHubList, notFoundGraph, scriptTag } from './schema';
import { cards } from './knowledge-catalog';
import { renderNotFound, renderRoute } from './prerender';
import { PRERENDER_PATHS } from './seo';

const template = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

function graphOf(html: string): Record<string, unknown>[] {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!block) return [];
  return JSON.parse(block[1].replace(/\\u003c/g, '<'))['@graph'];
}

const types = (graph: Record<string, unknown>[]) => graph.map((node) => node['@type']);

describe('разметка по месту', () => {
  it('FAQPage стоит ровно на одном адресе — на главной', () => {
    expect(types(graphOf(renderRoute(template, '/')))).toContain('FAQPage');
    for (const path of PRERENDER_PATHS) {
      expect(types(graphOf(renderRoute(template, path))), path).not.toContain('FAQPage');
    }
    expect(types(graphOf(renderNotFound(template)))).not.toContain('FAQPage');
  });

  it('у внутреннего адреса есть хлебные крошки', () => {
    for (const path of PRERENDER_PATHS) {
      const graph = graphOf(renderRoute(template, path));
      const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList') as any;
      expect(crumbs, path).toBeTruthy();
      expect(crumbs.itemListElement).toHaveLength(2);
      expect(crumbs.itemListElement[1].item).toBe(`https://habitoff.ru${path}`);
    }
  });

  it('страница описывает себя, а не соседнюю', () => {
    for (const path of PRERENDER_PATHS) {
      const page = graphOf(renderRoute(template, path))[0] as any;
      expect(page.url, path).toBe(`https://habitoff.ru${path}`);
      expect(String(page['@type'])).toMatch(/Page$/);
    }
  });

  it('ItemList стоит только на /knowledge и перечисляет реальные адреса', () => {
    expect(types(graphOf(renderRoute(template, '/knowledge')))).toContain('ItemList');
    expect(types(graphOf(renderRoute(template, '/links')))).not.toContain('ItemList');
    const list = knowledgeHubList() as { numberOfItems: number; itemListElement: any[] };
    expect(list.numberOfItems).toBe(cards().length);
    for (const element of list.itemListElement) {
      expect(element.url).toMatch(/^https:\/\/habitoff\.ru\/knowledge\/[a-z0-9-]+$/);
    }
  });

  it('Organization и sameAs не заводятся: адресов сообществ ещё нет', () => {
    for (const path of ['/', ...PRERENDER_PATHS]) {
      const raw = JSON.stringify(graphOf(renderRoute(template, path)));
      expect(raw, path).not.toContain('"Organization"');
      expect(raw, path).not.toContain('sameAs');
    }
  });

  it('несуществующий адрес описывает только себя', () => {
    expect(types(graphOf(renderNotFound(template)))).toEqual(['WebPage']);
  });

  it('закрывающий тег внутри данных не рвёт скрипт', () => {
    // Тексты каталога правят люди, и `</script>` в них теоретически возможен.
    const tag = scriptTag([{ '@type': 'WebPage', name: 'Про </script><script>alert(1)</script>' }]);
    expect(tag.match(/<\/script>/g)).toHaveLength(1);
    expect(tag).toContain('\\u003c/script');
  });

  it('граф несуществующего адреса не ссылается на подборки', () => {
    expect(JSON.stringify(notFoundGraph())).not.toContain('ItemList');
  });
});
