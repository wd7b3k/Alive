import { describe, expect, it } from 'vitest';

import { parseProviders, providersFromSettings } from './auth-providers';

describe('providersFromSettings', () => {
  it('берёт только включённое', () => {
    const list = providersFromSettings({ google: true, apple: false, github: false });
    expect(list.map((p) => p.id)).toEqual(['google']);
  });

  it('не делает кнопкой то, что кнопкой не показывается', () => {
    const list = providersFromSettings({
      google: true,
      email: true,
      phone: true,
      anonymous_users: true,
    });
    expect(list.map((p) => p.id)).toEqual(['google']);
  });

  it('ставит Google первым, что бы ни пришло', () => {
    const list = providersFromSettings({ 'custom:yandex': true, apple: true, google: true });
    expect(list[0].id).toBe('google');
  });

  it('показывает незнакомого провайдера, а не прячет вход', () => {
    const list = providersFromSettings({ 'custom:okru': true });
    expect(list.map((p) => p.id)).toEqual(['custom:okru']);
    expect(list[0].label).toBe('okru');
  });

  it('называет российских провайдеров по-русски', () => {
    const list = providersFromSettings({ 'custom:yandex': true, 'custom:vk': true });
    expect(list.map((p) => p.label)).toEqual(['Яндекс', 'VK ID']);
  });

  it('возвращает пусто, когда включать нечего — вызывающий оставит Google', () => {
    expect(providersFromSettings({})).toEqual([]);
    expect(providersFromSettings(undefined)).toEqual([]);
    expect(providersFromSettings({ google: false })).toEqual([]);
  });

  it('порядок не зависит от порядка ключей в ответе', () => {
    const a = providersFromSettings({ apple: true, google: true, 'custom:yandex': true });
    const b = providersFromSettings({ 'custom:yandex': true, google: true, apple: true });
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });
});

describe('parseProviders (ручной список)', () => {
  it('падает обратно на Google, когда список пуст или из мусора', () => {
    expect(parseProviders(undefined).map((p) => p.id)).toEqual(['google']);
    expect(parseProviders('').map((p) => p.id)).toEqual(['google']);
    expect(parseProviders(' , , ').map((p) => p.id)).toEqual(['google']);
  });

  it('сохраняет заданный порядок — первая кнопка главная', () => {
    expect(parseProviders('custom:yandex,google').map((p) => p.id)).toEqual([
      'custom:yandex',
      'google',
    ]);
  });

  it('терпит пробелы и повторы', () => {
    expect(parseProviders(' google , custom:yandex , google ').map((p) => p.id)).toEqual([
      'google',
      'custom:yandex',
    ]);
  });
});
