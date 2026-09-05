import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { codeFromPath, pathForCode } from '../domain/knowledge-address';
import { cardBody, cardMeta, cardPaths, renderCard, renderRoute } from './prerender';
import { cardGraph, knowledgeHubList } from './schema';
import { cards, cardByCode, pathFor } from './knowledge-catalog';

const template = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

function visible(html: string): string {
  const body = html.match(/<main class="r-prerender">([\s\S]*?)<\/main>/);
  if (!body) return '';
  return body[1]
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function graphOf(html: string): Record<string, any>[] {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return JSON.parse(block![1].replace(/\\u003c/g, '<'))['@graph'];
}

describe('адрес карточки', () => {
  /**
   * Решение владельца 05.09.2026: адрес карточки не меняется. Проверяется здесь, а не
   * обещанием, потому что цена переезда адреса — обнуление всего, что он набрал в
   * индексе, а заметить переезд по коду невозможно: страницы просто станут другими.
   */
  it('код превращается в адрес и обратно без потерь', () => {
    for (const card of cards()) {
      const path = pathForCode(card.code);
      expect(codeFromPath(path), card.code).toBe(card.code);
    }
  });

  it('соответствие «код → адрес» закреплено дословно', () => {
    // Три образца из разных групп: если правило подмены изменится, это увидят здесь.
    expect(pathForCode('calms_me')).toBe('/knowledge/calms-me');
    expect(pathForCode('one_does_not_count')).toBe('/knowledge/one-does-not-count');
    expect(pathForCode('oral_health')).toBe('/knowledge/oral-health');
  });

  it('в кодах каталога нет дефисов — иначе обратное преобразование неоднозначно', () => {
    for (const card of cards()) {
      expect(card.code, `${card.code}: дефис в коде ломает адрес`).not.toContain('-');
      expect(card.code).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('чужие адреса карточками не считаются', () => {
    for (const path of ['/knowledge', '/knowledge/', '/links/coffee', '/', '/knowledge/a/b']) {
      expect(cardByCode(codeFromPath(path) ?? ''), path).toBeUndefined();
    }
  });

  it('адресов ровно столько, сколько опубликованных карточек', () => {
    expect(cardPaths()).toHaveLength(cards().length);
    expect(new Set(cardPaths()).size).toBe(cards().length);
  });
});

describe('страница карточки', () => {
  const sample = cards()[0];

  it('несёт всё, ради чего страница заведена', () => {
    for (const card of cards()) {
      const text = visible(cardBody(card));
      expect(text, `${card.code}: нет утверждения`).toContain(card.claim);
      expect(text, `${card.code}: нет ответа`).toContain(card.known);
      expect(text, `${card.code}: нет источника`).toContain(card.source_title);
      expect(text, `${card.code}: нет даты сверки`).toContain(card.verified);
      expect(cardBody(card), `${card.code}: источник не ссылкой`).toContain(
        `href="${card.source_url}"`,
      );
      // Уровень доказательности и его границы — без них утверждение о здоровье
      // показывать нельзя, и это не зависит от того, кто смотрит.
      expect(text, `${card.code}: нет границ`).toMatch(/Насколько это надёжно/);
    }
  });

  it('у каждой страницы свои заголовок, описание и canonical', () => {
    const titles = new Set<string>();
    for (const card of cards()) {
      const html = renderCard(template, card);
      const title = html.match(/<title>(.*?)<\/title>/)![1];
      titles.add(title);
      expect(title).toContain(card.claim);
      expect(html).toContain(`<link rel="canonical" href="https://habitoff.ru${pathFor(card)}" />`);
      expect(cardMeta(card).description.length).toBeGreaterThan(20);
    }
    expect(titles.size, 'заголовки повторяются').toBe(cards().length);
  });

  it('ведёт обратно в раздел и на главную', () => {
    const html = cardBody(sample);
    expect(html).toContain('href="/knowledge"');
    expect(html).toContain('href="/"');
  });
});

describe('разметка не описывает того, чего нет на странице', () => {
  /**
   * Правило всей задачи. До 05.09.2026 `ItemList` на `/knowledge` объявлял шестнадцать
   * вопросов, и ноль из них присутствовали в видимом HTML: разметка описывала то, что
   * дорисовывает JavaScript. Для Google, который рендерит, это сходилось; для Яндекса и
   * краулеров моделей — нет.
   */
  it('Question на странице карточки повторяет её видимый текст', () => {
    for (const card of cards()) {
      const html = renderCard(template, card);
      const text = visible(html);
      const question = graphOf(html).find((node) => node['@type'] === 'Question');
      expect(question, card.code).toBeTruthy();
      expect(text, `${card.code}: name из разметки не найден в тексте`).toContain(question!.name);
      for (const piece of [card.known, card.changes, card.detail].filter(Boolean)) {
        expect(text, `${card.code}: часть ответа не найдена в тексте`).toContain(piece);
      }
      expect(text).toContain(question!.acceptedAnswer.citation.name.split(' · ')[0]);
    }
  });

  it('каждый элемент списка на хабе присутствует ссылкой в тексте', () => {
    const html = renderRoute(template, '/knowledge');
    const text = visible(html);
    const list = knowledgeHubList() as { itemListElement: Record<string, any>[] };
    for (const element of list.itemListElement) {
      expect(text, `${element.url}: заголовка нет в тексте`).toContain(element.name);
      expect(html, `${element.url}: нет ссылки`).toContain(
        `href="${new URL(element.url).pathname}"`,
      );
    }
  });

  it('хаб ссылается на все опубликованные карточки', () => {
    const html = renderRoute(template, '/knowledge');
    for (const card of cards()) {
      expect(html, card.code).toContain(`href="${pathFor(card)}"`);
    }
  });

  it('на странице карточки нет FAQPage и чужих подборок', () => {
    const types = graphOf(renderCard(template, cards()[0])).map((node) => node['@type']);
    expect(types).toEqual(['WebPage', 'BreadcrumbList', 'Question']);
  });

  it('хлебные крошки на карточке ведут через раздел', () => {
    const crumbs = cardGraph(cards()[0]).find(
      (node) => node['@type'] === 'BreadcrumbList',
    ) as Record<string, any>;
    expect(crumbs.itemListElement.map((item: Record<string, any>) => item.item)).toEqual([
      'https://habitoff.ru/',
      'https://habitoff.ru/knowledge',
      `https://habitoff.ru${pathFor(cards()[0])}`,
    ]);
  });
});
