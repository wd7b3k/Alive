import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { affinity, relatedCards } from './knowledge-related';
import { cardByCode, cards, pathFor } from './knowledge-catalog';
import { cardBody } from './prerender';

const graph = relatedCards(cards());
const codes = cards().map((card) => card.code);

describe('связи между карточками', () => {
  /**
   * До вечера 05.09.2026 со страницы карточки вели только хаб, главная и «Связки» —
   * получилась звезда: 38 листьев, между которыми пусто. Вес расходился только сверху
   * вниз, а связь между разобранными вопросами роботу не была видна вовсе.
   */
  it('у каждой карточки от трёх до пяти соседей', () => {
    for (const code of codes) {
      const neighbours = graph.get(code) ?? [];
      expect(neighbours.length, `${code}: соседей ${neighbours.length}`).toBeGreaterThanOrEqual(3);
      expect(neighbours.length, `${code}: соседей ${neighbours.length}`).toBeLessThanOrEqual(5);
    }
  });

  it('связь не бывает односторонней', () => {
    // Односторонняя ссылка — это и есть ссылочная каша: робот видит путь туда и не
    // видит обратно, человек попадает в тупик.
    const oneWay: string[] = [];
    for (const code of codes) {
      for (const other of graph.get(code) ?? []) {
        if (!(graph.get(other) ?? []).includes(code)) oneWay.push(`${code} → ${other}`);
      }
    }
    expect(oneWay).toEqual([]);
  });

  it('карточка не ссылается на себя и не повторяет соседа', () => {
    for (const code of codes) {
      const neighbours = graph.get(code) ?? [];
      expect(neighbours, code).not.toContain(code);
      expect(new Set(neighbours).size, `${code}: повтор в списке`).toBe(neighbours.length);
    }
  });

  it('ссылки ведут только на опубликованные карточки', () => {
    for (const code of codes) {
      for (const other of graph.get(code) ?? []) {
        expect(cardByCode(other), `${code} → ${other}: карточки нет в выгрузке`).toBeTruthy();
      }
    }
  });

  it('граф связный: из любой карточки достижима любая', () => {
    // Без связности граф распадается на кучки по темам, и обход снова упирается в хаб.
    const seen = new Set([codes[0]]);
    const stack = [codes[0]];
    while (stack.length) {
      for (const next of graph.get(stack.pop()!) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    expect(seen.size, `достижимо ${seen.size} из ${codes.length}`).toBe(codes.length);
  });

  it('результат детерминирован: та же выгрузка даёт тот же граф', () => {
    // Иначе каждая сборка переписывала бы 38 страниц и выглядела бы изменением там,
    // где ничего не менялось.
    const again = relatedCards(cards());
    for (const code of codes) expect(again.get(code), code).toEqual(graph.get(code));
  });

  it('сначала идёт самый близкий сосед, а не случайный', () => {
    for (const code of codes) {
      const self = cardByCode(code)!;
      const scores = (graph.get(code) ?? []).map((other) => affinity(self, cardByCode(other)!));
      const sorted = [...scores].sort((a, b) => b - a);
      expect(scores, code).toEqual(sorted);
    }
  });

  it('близость учитывает общие метки, а не только продукт', () => {
    const withTags = cards().find((card) => card.tags.length > 0)!;
    const same = cards().find(
      (card) => card.code !== withTags.code && card.tags.some((tag) => withTags.tags.includes(tag)),
    );
    if (same) expect(affinity(withTags, same)).toBeGreaterThan(1);
  });
});

describe('страница карточки', () => {
  it('показывает соседей ссылками', () => {
    for (const card of cards()) {
      const html = cardBody(card);
      const neighbours = graph.get(card.code) ?? [];
      expect(html, `${card.code}: нет заголовка блока`).toContain('Рядом об этом же');
      for (const other of neighbours) {
        expect(html, `${card.code} → ${other}`).toContain(`href="${pathFor(cardByCode(other)!)}"`);
      }
    }
  });

  it('ссылка на источник идёт без nofollow', () => {
    /**
     * `nofollow` придуман для ссылок, за которые страница не ручается: платных,
     * пользовательских, непроверенных. Здесь ровно наоборот — ссылка на источник и есть
     * то единственное, чем этот продукт отличается от пересказов без ссылок в той же
     * нише. `nofollow` на ней сообщал бы поисковику «я за это не отвечаю».
     */
    for (const card of cards()) {
      const html = cardBody(card);
      expect(html, `${card.code}: nofollow вернулся`).not.toContain('nofollow');
      expect(html, `${card.code}: источник не ссылкой`).toContain(
        `<a href="${card.source_url}" rel="noopener">`,
      );
    }
  });

  it('правило не зашито в общий компонент ссылки', () => {
    // Если `nofollow` появится в атрибуте `rel` в пререндере или в разметке приложения,
    // он вернётся на страницы при следующей правке — и никто этого не заметит.
    //
    // Проверяется именно атрибут, а не файл целиком: слово `nofollow` встречается в
    // комментариях, объясняющих, почему его здесь нет, и запрет на упоминание запретил
    // бы объяснение вместе с ошибкой.
    for (const file of ['./prerender.ts', './seo.ts', '../redesign/shared.tsx']) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
      const inRel = [...source.matchAll(/rel=["'`][^"'`]*nofollow/g)];
      expect(
        inRel.map((match) => match[0]),
        `${file}: nofollow в атрибуте rel`,
      ).toEqual([]);
    }
  });
});
