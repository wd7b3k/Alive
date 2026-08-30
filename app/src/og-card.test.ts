import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Карточка ссылки: что на ней написано и чего на ней быть не может.
 *
 * Картинка превью — самый неудобный для проверки текст продукта: его не видно в
 * поиске по коду, он не попадает ни в один обзор формулировок и правится реже всего.
 * При этом читают его люди, которым продукт прислали, — то есть те, кто о нём ничего
 * не знает. Ограничения `AGENTS.md` («Никаких медицинских обещаний», «Evidence-first»)
 * действуют на него ровно так же, как на интерфейс, и здесь это проверяется машиной.
 */
const svgPath = fileURLToPath(new URL('./assets/og-card.svg', import.meta.url));
const svg = readFileSync(svgPath, 'utf8');
const png = fileURLToPath(new URL('../public/og-card.png', import.meta.url));
const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');

/** Видимый текст карточки — без разметки и без комментариев внутри исходника. */
const words = svg
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

describe('карточка ссылки', () => {
  it('имеет размер, который берут мессенджеры', () => {
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(statSync(png).isFile()).toBe(true);
  });

  it('говорит, что это за сервис, а не показывает один знак', () => {
    for (const word of ['момент', 'состояние', 'сигарета', 'habitoff.ru']) {
      expect(words, word).toContain(word);
    }
    // Больше сотни знаков видимого текста: логотип на пустом фоне столько не набирает.
    expect(words.length).toBeGreaterThan(100);
  });

  it('не обещает вылечить, гарантировать отказ или продлить жизнь', () => {
    const forbidden = [
      'вылеч',
      'излеч',
      'гаранти',
      'навсегда',
      'обязательно бросишь',
      'бросишь курить',
      'продолжительность жизни',
      'проживёшь',
      'заменяет врача',
      'вместо врача',
      'без усилий',
      'без силы воли',
    ];
    for (const phrase of forbidden) expect(words, phrase).not.toContain(phrase);
  });

  it('не повторяет три утверждения, у которых нет источника', () => {
    // Те самые, что перечислены в llms.txt как неприписываемые продукту.
    expect(words).not.toContain('3–5 минут');
    expect(words).not.toContain('95');
    expect(words).not.toMatch(/кальян\s*=\s*/);
  });

  it('разметка ведёт на эту карточку и называет её размер', () => {
    expect(html).toContain(
      '<meta property="og:image" content="https://habitoff.ru/og-card.png" />',
    );
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
    expect(html).toMatch(/property="og:image:alt"/);
  });
});
