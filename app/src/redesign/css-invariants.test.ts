import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../redesign.css', import.meta.url)), 'utf8');

type Rule = { selector: string; body: string };

/**
 * Разбирает только правила верхнего уровня.
 *
 * Внутренности `@media` сознательно пропускаются: там повтор селектора — норма, это и
 * есть переопределение под ширину. Опасен именно повтор на верхнем уровне, где два
 * одинаковых селектора выглядят как одно правило, а работает всегда последний.
 */
function topLevelRules(source: string): Rule[] {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  let depth = 0;
  let start = 0;
  let selector = '';
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === '{') {
      if (depth === 0) {
        selector = clean.slice(start, i).trim();
        start = i + 1;
      }
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        if (!selector.startsWith('@')) rules.push({ selector, body: clean.slice(start, i) });
        start = i + 1;
      }
    }
  }
  return rules;
}

const rules = topLevelRules(css);
const find = (selector: string) => rules.filter((rule) => rule.selector === selector);

describe('redesign.css инварианты', () => {
  /**
   * Этот тест написан после того, как один и тот же баг случился дважды: `.r-trigger-cell`
   * был объявлен на верхнем уровне два раза, вторая копия молча отменяла первую, и
   * выравнивание карточек Связок «не чинилось» при том, что правка была верной.
   * Дубликат не ошибка CSS — браузер выполнит последний, — поэтому его не поймает ни
   * линтер, ни глаз, ни скриншот. Только это.
   */
  it('не объявляет один селектор дважды на верхнем уровне', () => {
    const seen = new Map<string, number>();
    for (const rule of rules) seen.set(rule.selector, (seen.get(rule.selector) ?? 0) + 1);
    const duplicated = [...seen.entries()].filter(([, count]) => count > 1).map(([sel]) => sel);
    expect(duplicated).toEqual([]);
  });

  /**
   * Растягивать карточку до высоты ряда имеет право сетка, а не карточка. Пока
   * `height:100%` стоял на самой карточке, одиночная карточка «Фактов» на Главной
   * растягивалась на всю секцию и оставляла под текстом полосу пустоты.
   */
  it('растягивает карточки только внутри их сетки', () => {
    for (const selector of ['.r-knowledge-card', '.r-goal-card', '.r-awareness-card']) {
      const own = find(selector);
      expect(own.length, `${selector} должен быть объявлен один раз`).toBe(1);
      expect(own[0].body, `${selector} не должен растягивать себя сам`).not.toContain(
        'height:100%',
      );
    }
    expect(find('.r-knowledge-grid>.r-knowledge-card')[0]?.body).toContain('height:100%');
  });

  /**
   * Кнопка отправки не должна липнуть к последнему полю: между полями 13px, и 4px
   * перед кнопками читались как сбой вёрстки, а не как ритм.
   */
  /**
   * Одна и та же сетка наполняется по-разному: до входа это голые `<button>`, внутри
   * приложения — `<button class="r-trigger-card">`. Пока правило называет только класс,
   * публичная страница остаётся с дефолтными серыми кнопками браузера — и заметить это
   * можно только глазами на той самой странице, куда заходят реже всего.
   */
  it('стилизует карточки контекстов и без класса, и с классом', () => {
    const rule = topLevelRules(css).find(
      (r) => r.selector.includes('.r-trigger-card') && r.body.includes('min-height'),
    );
    expect(rule, 'нет базового правила для карточки контекста').toBeTruthy();
    expect(
      rule!.selector.includes('.r-trigger-grid>button'),
      'правило не покрывает голые кнопки в сетке — публичная страница останется без стилей',
    ).toBe(true);
  });

  it('оставляет воздух перед рядом кнопок формы', () => {
    const actions = find('.r-actions');
    expect(actions.length).toBe(1);
    const margin = /margin-top:(\d+)px/.exec(actions[0].body);
    expect(margin, '.r-actions обязан задавать margin-top').not.toBeNull();
    expect(Number(margin?.[1])).toBeGreaterThanOrEqual(13);
  });

  /**
   * У аватара фиксированная рамка и `overflow:hidden`; содержимое обязано её заполнять,
   * иначе картинка центрируется и приезжает искажённой.
   */
  it('заставляет содержимое аватара заполнять рамку', () => {
    expect(find('.r-avatar>*')[0]?.body).toContain('width:100%');
    expect(find('.r-avatar>*')[0]?.body).toContain('height:100%');
  });

  /**
   * Все кнопки продукта — это `.r-button` с вариантами. Если вариант потеряется,
   * кнопка станет системной серой, и это будет видно не сразу.
   */
  /**
   * Шкалы. До редизайна 2026-08-26 в файле было 23 значения border-radius, 32 размера
   * шрифта и отступы без всякой шкалы: соседние карточки скруглялись на 13, 14, 15, 17,
   * 20 и 21 px. Разница не читается как решение, но глаз её видит. Документ описывает,
   * как должно быть; поймать момент, когда стало иначе, может только тест.
   *
   * Значения внутри calc()/max()/min() исключены намеренно: там живут safe-area и
   * ширина контейнера, к шкале отступов они отношения не имеют.
   */
  const withoutFunctions = css.replace(
    /(calc|max|min|clamp|env)\([^()]*(?:\([^()]*\)[^()]*)*\)/g,
    '',
  );
  const valuesOf = (property: string) => {
    const found = new Set<number>();
    const declaration = new RegExp(`(?:^|[;{])\\s*${property}\\s*:([^;}]*)`, 'g');
    for (const match of withoutFunctions.matchAll(declaration)) {
      for (const value of match[1].matchAll(/(\d+(?:\.\d+)?)px/g)) found.add(Number(value[1]));
    }
    return [...found].sort((a, b) => a - b);
  };

  it('скругляет только по шкале радиусов', () => {
    const allowed = [8, 12, 16, 22, 28, 999];
    expect(valuesOf('border-radius').filter((v) => !allowed.includes(v))).toEqual([]);
  });

  it('набирает только по шкале кегля', () => {
    const allowed = [10, 11, 13, 15, 17, 20, 24, 29, 35, 44];
    expect(valuesOf('font-size').filter((v) => !allowed.includes(v))).toEqual([]);
  });

  it('отбивает только по шкале отступов', () => {
    const allowed = [0, 4, 8, 12, 16, 20, 24, 32, 40];
    const off: number[] = [];
    for (const property of ['padding', 'gap', 'column-gap', 'row-gap']) {
      off.push(...valuesOf(property).filter((v) => !allowed.includes(v)));
    }
    expect([...new Set(off)].sort((a, b) => a - b)).toEqual([]);
  });

  it('не оставляет выведенный лаймовый токен', () => {
    expect(css).not.toContain('--r-lime');
  });

  it('держит варианты кнопок в одном месте', () => {
    for (const selector of ['.r-button', '.r-button.primary', '.r-button.ghost']) {
      expect(find(selector).length, `${selector} должен быть объявлен один раз`).toBe(1);
    }
  });
});
