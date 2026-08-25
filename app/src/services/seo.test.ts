import { describe, expect, it } from 'vitest';

import { metaFor } from './seo';

describe('metaFor', () => {
  it('у каждого публичного раздела свой заголовок', () => {
    const titles = ['/', '/knowledge', '/links', '/meanings', '/experiment'].map(
      (p) => metaFor(p).title,
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('заголовок несёт запрос, а не только название продукта', () => {
    expect(metaFor('/').title.toLowerCase()).toContain('бросить курить');
    expect(metaFor('/knowledge').title.toLowerCase()).toContain('мифы');
  });

  it('закрывает от индекса личные разделы', () => {
    for (const path of ['/profile', '/health', '/path', '/together', '/login']) {
      expect(metaFor(path).noindex, path).toBe(true);
    }
  });

  it('оставляет публичные разделы открытыми', () => {
    for (const path of ['/', '/knowledge', '/links', '/meanings', '/experiment']) {
      expect(metaFor(path).noindex, path).toBeFalsy();
    }
  });

  it('незнакомый адрес получает описание главной, а не пустое', () => {
    expect(metaFor('/nope').description.length).toBeGreaterThan(50);
  });

  it('описания укладываются в то, что показывает выдача', () => {
    for (const path of ['/', '/knowledge', '/links', '/meanings', '/experiment']) {
      const { description } = metaFor(path);
      expect(description.length, path).toBeGreaterThan(70);
      expect(description.length, path).toBeLessThan(300);
    }
  });
});
