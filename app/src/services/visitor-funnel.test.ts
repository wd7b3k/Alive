// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Отметка «веха пройдена» — по человеку, а не по браузеру.
 *
 * Первая редакция хранила вехи одной строкой без имени человека. Следствие обнаружилось
 * не сразу и стоило бы дорого: второй человек в том же браузере не попадал в воронку
 * вовсе — ни целью, ни собственной строкой, потому что отметку спрашивали до записи
 * события. Одна семья, один ноутбук, аккаунт на двоих — и половина пилота невидима.
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

const ANNA = '11111111-1111-1111-1111-111111111111';
const BORIS = '22222222-2222-2222-2222-222222222222';

describe('отметка пройденной вехи', () => {
  it('первый раз — да, второй — нет', async () => {
    const { markFunnelStageOnce } = await fresh();
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(true);
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(false);
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(false);
  });

  it('второй человек в том же браузере проходит свою веху', async () => {
    // Та самая ошибка. Аня прошла настройку на общем ноутбуке, вышла, вошёл Борис —
    // и его цель не должна утонуть в её отметке.
    const { markFunnelStageOnce } = await fresh();
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(true);
    expect(markFunnelStageOnce('onboarded', BORIS)).toBe(true);
    // И при этом каждый по-прежнему проходит свою веху ровно один раз.
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(false);
    expect(markFunnelStageOnce('onboarded', BORIS)).toBe(false);
  });

  it('вехи не мешают друг другу', async () => {
    const { markFunnelStageOnce } = await fresh();
    expect(markFunnelStageOnce('signed_in', ANNA)).toBe(true);
    expect(markFunnelStageOnce('first_episode', ANNA)).toBe(true);
    expect(markFunnelStageOnce('signed_in', ANNA)).toBe(false);
    expect(markFunnelStageOnce('first_episode', ANNA)).toBe(false);
  });

  it('переживает перезагрузку страницы', async () => {
    const first = await fresh();
    expect(first.markFunnelStageOnce('repeat_episode', ANNA)).toBe(true);
    // Новый модуль без очистки хранилища — это и есть следующая загрузка страницы.
    vi.resetModules();
    const second = await import('./visitor');
    expect(second.markFunnelStageOnce('repeat_episode', ANNA)).toBe(false);
  });

  it('без человека считает по посетителю — это веха ещё не вошедшего', async () => {
    const { markFunnelStageOnce, getVisitorId } = await fresh();
    expect(markFunnelStageOnce('landing')).toBe(true);
    expect(markFunnelStageOnce('landing')).toBe(false);
    // Ключ гостя — идентификатор посетителя, и он не пересекается с ключами людей.
    expect(window.localStorage.getItem(`habitoff:funnel:v2:${getVisitorId()}`)).toBe('landing');
  });

  it('ключ на человека, а не на этап', async () => {
    const { markFunnelStageOnce } = await fresh();
    markFunnelStageOnce('signed_in', ANNA);
    markFunnelStageOnce('onboarded', ANNA);
    markFunnelStageOnce('signed_in', BORIS);
    expect(window.localStorage.getItem(`habitoff:funnel:v2:${ANNA}`)).toBe('signed_in,onboarded');
    expect(window.localStorage.getItem(`habitoff:funnel:v2:${BORIS}`)).toBe('signed_in');
  });

  it('убирает ключ первой редакции: он хранил этапы без человека', async () => {
    const { markFunnelStageOnce } = await fresh();
    window.localStorage.setItem('habitoff:funnel:v1', 'onboarded,signed_in');
    markFunnelStageOnce('signed_in', ANNA);
    expect(window.localStorage.getItem('habitoff:funnel:v1')).toBeNull();
  });

  it('при недоступном хранилище отмечает заново, а не молчит', async () => {
    const { markFunnelStageOnce } = await fresh();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('приватное окно');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('приватное окно');
    });
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(true);
    expect(markFunnelStageOnce('onboarded', ANNA)).toBe(true);
  });
});
