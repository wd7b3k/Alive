import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  hasExternalSource,
  knowledgeItemList,
  notFoundGraph,
  routeGraph,
  scriptTag,
  type KnowledgeEntry,
} from './schema';
import { renderNotFound, renderRoute } from './prerender';
import { PRERENDER_PATHS } from './seo';

const template = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

/** Три записи: две с внешним источником, одна со ссылкой на собственную методологию. */
const CATALOG: KnowledgeEntry[] = [
  {
    code: 'one_does_not_count',
    title: 'Одна сигарета почти не считается',
    answer: 'Для сердца и сосудов риск не уменьшается линейно вместе с количеством сигарет.',
    sourceLabel: 'Hackshaw et al. BMJ 2018',
    sourceUrl: 'https://www.bmj.com/content/360/bmj.j5855',
    doi: null,
  },
  {
    code: 'too_late_to_quit',
    title: 'Я курю слишком давно — уже поздно',
    answer: 'Раньше бросить лучше, но польза отказа сохраняется и после долгого стажа.',
    sourceLabel: 'Jha et al. NEJM 2013',
    sourceUrl: 'https://www.nejm.org/doi/full/10.1056/NEJMsa1211128',
    doi: '10.1056/NEJMsa1211128',
  },
  {
    code: 'only_real_pause',
    title: 'Сигарета — мой единственный настоящий отдых',
    answer: 'Пауза тебе действительно нужна. Дым — не обязательная её часть.',
    sourceLabel: 'Метод Habitoff',
    sourceUrl: 'https://github.com/wd7b3k/Alive/blob/main/docs/METHODOLOGY.md',
    doi: null,
  },
];

/**
 * Вся разметка страницы, из всех блоков `ld+json`.
 *
 * Блоков стало два: основной граф и отдельный `FAQPage`, который собирается из статей
 * базы знаний (ADR-0020). Правило «`FAQPage` ровно на одном адресе» от этого не
 * изменилось, но проверять его надо по всей странице, а не по первому блоку — иначе
 * тест окажется зелёным ровно потому, что смотрит не туда.
 */
function graphOf(html: string): Record<string, unknown>[] {
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  const nodes: Record<string, unknown>[] = [];
  for (const block of blocks) {
    const data = JSON.parse(block[1].replace(/\\u003c/g, '<'));
    if (Array.isArray(data['@graph'])) nodes.push(...data['@graph']);
    else nodes.push(data);
  }
  return nodes;
}

const types = (graph: Record<string, unknown>[]) => graph.map((node) => node['@type']);

describe('источник утверждения', () => {
  it('ссылка на собственную методологию источником не считается', () => {
    expect(hasExternalSource(CATALOG[0])).toBe(true);
    expect(hasExternalSource(CATALOG[2])).toBe(false);
  });

  it('утверждение без источника в разметку не попадает', () => {
    const list = knowledgeItemList(CATALOG) as Record<string, unknown>;
    expect(list.numberOfItems).toBe(2);
    expect(JSON.stringify(list)).not.toContain('only_real_pause');
  });

  it('у каждого вопроса есть citation с адресом', () => {
    const list = knowledgeItemList(CATALOG) as { itemListElement: Record<string, any>[] };
    for (const element of list.itemListElement) {
      const citation = element.item.acceptedAnswer.citation;
      expect(citation['@type']).toBe('CreativeWork');
      expect(citation.url).toMatch(/^https:\/\//);
      expect(citation.name.length).toBeGreaterThan(3);
    }
  });

  it('doi превращается в разрешимый адрес, а не остаётся кодом', () => {
    const list = knowledgeItemList(CATALOG) as { itemListElement: Record<string, any>[] };
    const withDoi = list.itemListElement.find((e) => e.item['@id'].endsWith('too_late_to_quit'));
    expect(withDoi).toBeTruthy();
    expect(withDoi!.item.acceptedAnswer.citation.identifier).toBe(
      'https://doi.org/10.1056/NEJMsa1211128',
    );
  });

  it('пустой каталог не рождает пустой ItemList', () => {
    expect(knowledgeItemList([])).toBeNull();
    expect(knowledgeItemList([CATALOG[2]])).toBeNull();
  });
});

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

  it('ItemList появляется только на /knowledge и только с каталогом', () => {
    expect(types(graphOf(renderRoute(template, '/knowledge', CATALOG)))).toContain('ItemList');
    expect(types(graphOf(renderRoute(template, '/knowledge')))).not.toContain('ItemList');
    expect(types(graphOf(renderRoute(template, '/links', CATALOG)))).not.toContain('ItemList');
  });

  it('Organization и sameAs не заводятся: адресов сообществ ещё нет', () => {
    for (const path of ['/', ...PRERENDER_PATHS]) {
      const raw = JSON.stringify(graphOf(renderRoute(template, path, CATALOG)));
      expect(raw, path).not.toContain('"Organization"');
      expect(raw, path).not.toContain('sameAs');
    }
  });

  it('несуществующий адрес описывает только себя', () => {
    expect(types(graphOf(renderNotFound(template)))).toEqual(['WebPage']);
  });

  it('закрывающий тег внутри данных не рвёт скрипт', () => {
    const nasty: KnowledgeEntry = {
      ...CATALOG[0],
      title: 'Миф про </script><script>alert(1)</script>',
    };
    const tag = scriptTag(routeGraph('/knowledge', [nasty]));
    expect(tag.match(/<\/script>/g)).toHaveLength(1);
    expect(tag).toContain('\\u003c/script');
  });

  it('граф несуществующего адреса не ссылается на подборки', () => {
    expect(JSON.stringify(notFoundGraph())).not.toContain('ItemList');
  });
});
