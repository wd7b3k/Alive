import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Правила применения знака, проверяемые машиной.
 *
 * Двухцветное написание — `Habit` цветом текста, `off` цветом наблюдения — существует
 * только в `brand-logo-full.svg`. Набранное живым текстом, оно перестаёт быть знаком:
 * теряет двухцветность при копировании, разъезжается на подставленном шрифте (Inter
 * продукт не грузит) и превращается в подделку логотипа средствами вёрстки.
 *
 * Отсюда два запрета, и оба ловятся здесь, а не на ревью. Обоснование — BRANDBOOK §3.
 */

const src = dirname(fileURLToPath(import.meta.url));

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sources(full, found);
    } else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) {
      found.push(full);
    }
  }
  return found;
}

const files = sources(src).map((path) => ({ path, code: readFileSync(path, 'utf8') }));

describe('применение знака', () => {
  /**
   * Имя, стоящее отдельно, — это знак, а не текст. В надзаголовке оно к тому же
   * получило бы цвет надзаголовка целиком, то есть `off` перестал бы быть жёлтым.
   */
  it('не ставит имя отдельной подписью в надзаголовок', () => {
    const guilty = files
      .filter(({ code }) => /className="r-kicker[^"]*">\s*Habitoff\s*</.test(code))
      .map(({ path }) => path.slice(src.length + 1));
    expect(guilty, 'имя целиком в r-kicker: поставь <img> знака').toEqual([]);
  });

  /**
   * Двухцветный логотип, собранный из span-ов, — самая частая форма подделки знака.
   * Ищем «Habit» и «off» как соседние подписи в разметке.
   */
  it('не собирает двухцветный логотип из разметки', () => {
    const fake = /Habit\s*<\/(span|b|strong|em)>\s*<\1[^>]*>\s*off/i;
    const guilty = files
      .filter(({ code }) => fake.test(code))
      .map(({ path }) => path.slice(src.length + 1));
    expect(guilty, 'знак не набирается текстом — только brand-logo-full.svg').toEqual([]);
  });
});
