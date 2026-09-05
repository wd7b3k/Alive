// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Отметка «веха пройдена»: цель уходит один раз на человека.
 *
 * Без неё `onboarded` уходила бы при каждом открытии приложения после настройки, а
 * `signed_in` — при каждом восстановлении сессии, то есть на каждой загрузке страницы.
 * Конверсия в кабинете выросла бы в разы, и выросла бы в сторону, которая выглядит как
 * успех: цель растёт, воронка «улучшается», а не изменилось ничего.
 *
 * Отдельно проверяется отказ хранилища. В приватном окне и при запрете данных сайта
 * `localStorage` бросает; тогда веха отмечается заново каждый раз, и это осознанный
 * размен — посчитать цель дважды лучше, чем не посчитать ни разу.
 */

vi.mock('../env', () => ({
  publicEnv: {
    supabaseUrl: '',
    supabasePublishableKey: '',
    appOrigin: 'https://habitoff.ru',
    isConfigured: false,
    yandexMetrikaId: '',
    googleAnalyticsId: '',
  },
  buildInfo: { version: '3.2.0', commit: 'abcdef1' },
}));

async function fresh() {
  vi.resetModules();
  window.localStorage.clear();
  return import('./visitor');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('отметка пройденной вехи', () => {
  it('первый раз — да, второй — нет', async () => {
    const { markFunnelStageOnce } = await fresh();
    expect(markFunnelStageOnce('onboarded')).toBe(true);
    expect(markFunnelStageOnce('onboarded')).toBe(false);
    expect(markFunnelStageOnce('onboarded')).toBe(false);
  });

  it('вехи не мешают друг другу', async () => {
    const { markFunnelStageOnce } = await fresh();
    expect(markFunnelStageOnce('signed_in')).toBe(true);
    expect(markFunnelStageOnce('first_episode')).toBe(true);
    expect(markFunnelStageOnce('signed_in')).toBe(false);
    expect(markFunnelStageOnce('first_episode')).toBe(false);
  });

  it('переживает перезагрузку страницы', async () => {
    const first = await fresh();
    expect(first.markFunnelStageOnce('repeat_episode')).toBe(true);
    // Новый модуль без очистки хранилища — это и есть следующая загрузка страницы.
    vi.resetModules();
    const second = await import('./visitor');
    expect(second.markFunnelStageOnce('repeat_episode')).toBe(false);
  });

  it('хранит все вехи одним ключом, а не ключом на веху', async () => {
    const { markFunnelStageOnce } = await fresh();
    markFunnelStageOnce('signed_in');
    markFunnelStageOnce('onboarded');
    const ours = Object.keys(window.localStorage).filter((key) => key.includes('funnel'));
    expect(ours).toEqual(['habitoff:funnel:v1']);
    expect(window.localStorage.getItem('habitoff:funnel:v1')).toBe('signed_in,onboarded');
  });

  it('при недоступном хранилище отмечает заново, а не молчит', async () => {
    const { markFunnelStageOnce } = await fresh();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('приватное окно');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('приватное окно');
    });
    expect(markFunnelStageOnce('onboarded')).toBe(true);
    expect(markFunnelStageOnce('onboarded')).toBe(true);
  });
});
