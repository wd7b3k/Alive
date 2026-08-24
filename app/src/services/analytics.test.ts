import { describe, expect, it } from 'vitest';
import { sanitizeMetadata } from './analytics';

/**
 * Здесь проверяется ровно одно обещание, и оно не про удобство, а про приватность:
 * в журнал событий не должен попасть текст, написанный человеком.
 *
 * Продукт просит писать приватные заметки, названия собственных триггеров и
 * формулировки целей. Всё это лежит в тех же объектах, из которых собираются события,
 * и однажды кто-нибудь передаст такой объект в metadata целиком — не по злому умыслу,
 * а потому что так короче. Фильтр стоит именно на этот случай.
 */
describe('sanitizeMetadata', () => {
  it('пропускает коды, числа и флаги', () => {
    expect(sanitizeMetadata({ step: 2, code: 'coffee', repeated: true })).toEqual({
      step: 2,
      code: 'coffee',
      repeated: true,
    });
  });

  it('выбрасывает длинные строки — это и есть текст человека', () => {
    const note = 'Сегодня сорвался после разговора с отцом, было тяжело и я вышел курить';
    expect(sanitizeMetadata({ note })).toEqual({});
    // Граница: 64 символа проходят, 65 уже нет.
    expect(sanitizeMetadata({ a: 'x'.repeat(64) })).toEqual({ a: 'x'.repeat(64) });
    expect(sanitizeMetadata({ a: 'x'.repeat(65) })).toEqual({});
  });

  it('выбрасывает вложенные объекты и массивы целиком', () => {
    expect(
      sanitizeMetadata({
        episode: { private_note: 'секрет', craving_before: 8 },
        codes: ['a', 'b'],
        ok: 1,
      }),
    ).toEqual({ ok: 1 });
  });

  it('не пропускает NaN и Infinity, которые в jsonb превратились бы в null', () => {
    expect(sanitizeMetadata({ a: Number.NaN, b: Number.POSITIVE_INFINITY, c: 0 })).toEqual({
      c: 0,
    });
  });

  it('ограничивает число ключей, чтобы событие не стало дампом состояния', () => {
    const wide: Record<string, unknown> = {};
    for (let i = 0; i < 40; i += 1) wide[`k${i}`] = i;
    expect(Object.keys(sanitizeMetadata(wide)).length).toBe(12);
  });

  it('пустая строка не занимает место в событии', () => {
    expect(sanitizeMetadata({ a: '', b: 'ok' })).toEqual({ b: 'ok' });
  });

  it('без metadata возвращает пустой объект, а не undefined', () => {
    expect(sanitizeMetadata(undefined)).toEqual({});
  });
});
