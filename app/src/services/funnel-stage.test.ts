// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Договор вехи: событие пишется всегда, цель уходит один раз.
 *
 * Разделение появилось после ошибки, прожившей день. Отметка «веха пройдена» спрашивалась
 * до записи события — и всё, что она гасила, гасилось целиком: второй человек в том же
 * браузере не попадал ни в кабинет, ни в собственный слой. Гарантии разные, и источники
 * у них разные: цель один раз на человека знает браузер, а сколько раз человек дошёл до
 * вехи — знает база, и повторы снимает запросом.
 *
 * Тест держит именно это разделение. Негативный контроль: вернуть в `trackStage` ранний
 * выход по отметке — и «пишет событие каждый раз» покраснеет.
 */

const inserted: { table: string; row: Record<string, unknown> }[] = [];

vi.mock('../env', () => ({
  publicEnv: {
    supabaseUrl: 'https://example.invalid',
    supabasePublishableKey: 'test',
    appOrigin: 'https://habitoff.ru',
    isConfigured: true,
    yandexMetrikaId: '',
    googleAnalyticsId: '',
  },
  buildInfo: { version: '3.2.0', commit: 'abcdef1' },
}));

vi.mock('../supabase', () => ({
  getSupabase: () => ({
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          inserted.push({ table, row });
          return Promise.resolve({ error: null });
        },
      };
    },
    rpc: () => Promise.resolve({ error: null }),
  }),
}));

const goals: string[] = [];

vi.mock('./counters', async () => {
  const actual = await vi.importActual<typeof import('./counters')>('./counters');
  return {
    ...actual,
    trackGoal: (goal: string) => {
      goals.push(goal);
    },
  };
});

const ANNA = '11111111-1111-1111-1111-111111111111';
const BORIS = '22222222-2222-2222-2222-222222222222';

async function fresh() {
  vi.resetModules();
  window.localStorage.clear();
  inserted.length = 0;
  goals.length = 0;
  return import('./analytics');
}

beforeEach(() => {
  vi.restoreAllMocks();
});

function stageRows() {
  return inserted.filter(
    (entry) => entry.table === 'analytics_events' && entry.row.event_type === 'funnel_stage',
  );
}

describe('веха воронки', () => {
  it('пишет событие каждый раз, даже когда веха уже отмечена', async () => {
    const { trackStage } = await fresh();
    trackStage(ANNA, 'onboarded', 'setup');
    trackStage(ANNA, 'onboarded', 'setup');
    trackStage(ANNA, 'onboarded', 'setup');
    // Повторы снимает запрос `distinct on (человек, этап)`, а не клиент: браузер не
    // знает, что уже писала база, и решать это здесь значит терять строки навсегда.
    expect(stageRows()).toHaveLength(3);
    expect(stageRows()[0].row.funnel_stage).toBe('onboarded');
  });

  it('отправляет цель один раз на человека', async () => {
    const { trackStage } = await fresh();
    trackStage(ANNA, 'onboarded', 'setup');
    trackStage(ANNA, 'onboarded', 'setup');
    expect(goals).toEqual(['onboarded']);
  });

  it('второй человек в том же браузере получает и строку, и цель', async () => {
    const { trackStage } = await fresh();
    trackStage(ANNA, 'onboarded', 'setup');
    trackStage(BORIS, 'onboarded', 'setup');
    expect(stageRows()).toHaveLength(2);
    expect(stageRows().map((entry) => entry.row.user_id)).toEqual([ANNA, BORIS]);
    // Обе цели — по одной на человека. До исправления вторая не уходила вовсе.
    expect(goals).toEqual(['onboarded', 'onboarded']);
  });

  it('разные вехи одного человека не гасят друг друга', async () => {
    const { trackStage } = await fresh();
    trackStage(ANNA, 'first_episode', 'guided_flow');
    trackStage(ANNA, 'episode_with_result', 'guided_flow');
    expect(goals).toEqual(['first_episode', 'episode_with_result']);
  });

  it('без человека строку не пишет: политика базы требует auth.uid()', async () => {
    const { trackStage } = await fresh();
    trackStage(null, 'onboarded', 'setup');
    expect(stageRows()).toHaveLength(0);
    // Цель при этом уходит: она про браузер и кабинет, а не про строку в базе.
    expect(goals).toEqual(['onboarded']);
  });
});

describe('цель без записи', () => {
  it('уходит один раз и считается по посетителю', async () => {
    const { reachStageGoal } = await fresh();
    reachStageGoal('landing');
    reachStageGoal('landing');
    expect(goals).toEqual(['auth_started']);
    expect(stageRows()).toHaveLength(0);
  });
});
