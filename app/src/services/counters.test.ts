// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Счётчики: проверяются аргументы, а не факт вызова.
 *
 * До 05.09.2026 единственной проверкой счётчиков было «есть ли строка `mc.yandex.ru` в
 * бандле». Она не доказывает ничего: строка там всегда, даже когда идентификатор пуст,
 * инициализации нет и хит не уходит. Ровно так счётчик и простоял выключенным — код
 * был, переменные пустые, всё выглядело работающим.
 *
 * Поэтому здесь подменяются `window.ym` и `window.dataLayer`, и утверждения — про то,
 * с какими именно аргументами их позвали: вебвизор выключен, отправка первого просмотра
 * отложена, у GA автоматический просмотр выключен, а адрес страницы передан. И
 * обратное: при пустом идентификаторе не уходит вообще ничего.
 */

const env = vi.hoisted(() => ({
  yandexMetrikaId: '',
  googleAnalyticsId: '',
  supabaseUrl: '',
  supabasePublishableKey: '',
  appOrigin: 'https://habitoff.ru',
  isConfigured: false,
}));

vi.mock('../env', () => ({
  publicEnv: env,
  buildInfo: { version: '3.2.0', commit: 'abcdef1' },
}));

type Call = unknown[];

/** Свежий модуль на каждый тест: `initCounters` защищён флагом «уже запускался». */
async function freshCounters(metrika: string, ga: string) {
  env.yandexMetrikaId = metrika;
  env.googleAnalyticsId = ga;
  document.head.innerHTML = '';
  const ym = vi.fn();
  // `window.ym` ставится до инициализации: модуль подставляет заглушку только если
  // ничего нет, поэтому наш шпион переживает init и видит все вызовы.
  (window as unknown as { ym?: unknown }).ym = ym;
  (window as unknown as { dataLayer?: unknown[] }).dataLayer = [];
  (window as unknown as { gtag?: unknown }).gtag = undefined;
  vi.resetModules();
  const module = await import('./counters');
  return {
    ym,
    module,
    dataLayer: () =>
      ((window as unknown as { dataLayer: unknown[] }).dataLayer ?? []).map((entry) =>
        Array.from(entry as ArrayLike<unknown>),
      ) as Call[],
    scripts: () => [...document.head.querySelectorAll('script')].map((tag) => tag.src),
  };
}

describe('Яндекс Метрика', () => {
  it('инициализируется с выключенным вебвизором и отложенным первым просмотром', async () => {
    const counters = await freshCounters('111983810', '');
    counters.module.initCounters();

    const init = counters.ym.mock.calls.find((call) => call[1] === 'init');
    expect(init, 'вызова init не было вовсе').toBeTruthy();
    expect(init![0]).toBe(111983810);
    const options = init![2] as Record<string, unknown>;
    // Вебвизор — не настройка вкусов, а граница обещания продукта. См. ADR-0015.
    expect(options.webvisor).toBe(false);
    // Отложенный просмотр: в одностраничном приложении автоматический увидел бы
    // только первый экран за сессию.
    expect(options.defer).toBe(true);
    expect(options.ssr).toBe(true);
  });

  it('подключает тег с номером счётчика', async () => {
    const counters = await freshCounters('111983810', '');
    counters.module.initCounters();
    expect(counters.scripts().some((src) => src.includes('mc.yandex.ru/metrika/tag.js'))).toBe(
      true,
    );
    expect(counters.scripts().some((src) => src.includes('id=111983810'))).toBe(true);
  });

  it('отправляет просмотр с переданным путём', async () => {
    const counters = await freshCounters('111983810', '');
    counters.module.initCounters();
    counters.ym.mockClear();
    counters.module.trackPageView('/knowledge');

    const hit = counters.ym.mock.calls.find((call) => call[1] === 'hit');
    expect(hit, 'хит не ушёл').toBeTruthy();
    expect(hit![0]).toBe(111983810);
    expect(hit![2]).toBe('/knowledge');
  });

  it('отправляет цель под её именем', async () => {
    const counters = await freshCounters('111983810', '');
    counters.module.initCounters();
    counters.ym.mockClear();
    counters.module.trackGoal('signed_up');

    const goal = counters.ym.mock.calls.find((call) => call[1] === 'reachGoal');
    expect(goal, 'цель не ушла').toBeTruthy();
    expect(goal![2]).toBe('signed_up');
  });
});

describe('Google Analytics', () => {
  it('настраивается с выключенным автоматическим просмотром', async () => {
    const counters = await freshCounters('', 'G-YB35G45MFW');
    counters.module.initCounters();

    const config = counters.dataLayer().find((call) => call[0] === 'config');
    expect(config, 'вызова config не было').toBeTruthy();
    expect(config![1]).toBe('G-YB35G45MFW');
    expect((config![2] as Record<string, unknown>).send_page_view).toBe(false);
  });

  it('отправляет просмотр с полным адресом страницы', async () => {
    const counters = await freshCounters('', 'G-YB35G45MFW');
    counters.module.initCounters();
    counters.module.trackPageView('/together');

    const view = counters
      .dataLayer()
      .find((call) => call[0] === 'event' && call[1] === 'page_view');
    expect(view, 'просмотр не ушёл').toBeTruthy();
    const params = view![2] as Record<string, unknown>;
    // GA4 наполняет отчёт по страницам из page_location; page_path остался от
    // Universal Analytics и сам по себе ничего не даёт.
    expect(String(params.page_location)).toContain('/together');
  });

  it('отправляет цель событием с её именем', async () => {
    const counters = await freshCounters('', 'G-YB35G45MFW');
    counters.module.initCounters();
    counters.module.trackGoal('first_episode');

    const goal = counters
      .dataLayer()
      .find((call) => call[0] === 'event' && call[1] === 'first_episode');
    expect(goal, 'цель не ушла').toBeTruthy();
  });
});

describe('пустой идентификатор', () => {
  it('не подключает скриптов и не отправляет ничего', async () => {
    // Сервис обязан работать в песочнице и локально, ничего никуда не отправляя.
    const counters = await freshCounters('', '');
    counters.module.initCounters();
    counters.module.trackPageView('/');
    counters.module.trackGoal('onboarded');

    expect(counters.scripts()).toEqual([]);
    expect(counters.ym).not.toHaveBeenCalled();
    expect(counters.dataLayer()).toEqual([]);
  });
});

describe('дата включения счётчиков', () => {
  it('записана и не позже первого визита с идентификатором клиента Метрики', async () => {
    const counters = await freshCounters('', '');
    // 30.08.2026 12:19 UTC — первый посетитель с непустым metrika_client_id в
    // analytics_visitors на боевой базе. Получить этот идентификатор можно только у
    // загрузившегося счётчика, значит раньше этого дня данных нет и быть не может.
    expect(counters.module.COUNTERS_LIVE_SINCE).toBe('2026-08-30');
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
