import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Guided } from './RedesignApp';
import { EMPTY_KNOWLEDGE, type Bootstrap, type Episode, type ProductType } from './data';

let n = 0;
function ep(product: ProductType, trigger: string, need: string): Episode {
  n += 1;
  return {
    id: `e${n}`,
    user_id: 'u1',
    target_product: product,
    trigger_code: trigger,
    custom_trigger_text: null,
    need_code: need,
    craving_before: 7,
    craving_after: 3,
    outcome: 'successful_response',
    helpfulness: 4,
    private_note: null,
    started_at: new Date(Date.UTC(2026, 7, 1, 0, n)).toISOString(),
    completed_at: null,
    deleted_at: null,
  };
}
const base: Bootstrap = {
  profile: {
    id: 'u1',
    display_name: 'T',
    avatar_url: null,
    role: 'participant',
    onboarding_completed_at: null,
  },
  settings: {
    user_id: 'u1',
    food_replacements_enabled: true,
    nrt_enabled: true,
    fruit_cutoff_time: '20:00',
    goal_text: null,
    evening_checkin_enabled: true,
  },
  products: [
    {
      user_id: 'u1',
      product_type: 'cigarette',
      role: 'target_dependency',
      enabled: true,
      baseline: {},
      defaults: {},
    },
  ],
  triggers: [
    'coffee',
    'boredom',
    'tension',
    'driving',
    'evening',
    'morning',
    'phone',
    'social',
  ].map((code, i) => ({
    code,
    title: `T-${code}`,
    description: 'd',
    product_types: ['cigarette'] as ProductType[],
    sort_order: i,
  })),
  needs: [
    { code: 'pause', title: 'Пауза', description: 'd', sort_order: 1 },
    { code: 'switch', title: 'Переключение', description: 'd', sort_order: 2 },
  ],
  replacements: [
    {
      code: 'breath',
      title: 'Дыхание',
      instruction: 'i',
      category: 'physical',
      need_codes: ['pause'],
      product_types: ['cigarette'],
      eligibility: {},
      sort_order: 1,
      icon: null,
      duration: null,
      summary: null,
      safety: null,
      mechanism: null,
      evidence_level: null,
      evidence_scope: null,
      sources: [],
    },
  ],
  triggerReplacementMap: [
    { trigger_code: 'coffee', replacement_code: 'breath', tier: 'fast', priority: 1 },
  ],
  meanings: [],
  goals: [],
  userMeanings: [],
  userLinks: [],
  identityScripts: [],
  supports: [],
  rewards: [],
  episodes: [],
  actions: [],
  tobaccoEvents: [],
  todayCheckin: null,
  knowledge: EMPTY_KNOWLEDGE,
  awareness: [],
};
const session = { user: { id: 'u1' } } as never;
const noop = () => {};
const asyncNoop = async () => {};

function render(data: Bootstrap, trigger?: string) {
  return renderToStaticMarkup(
    <Guided
      session={session}
      data={data}
      close={noop}
      saved={asyncNoop}
      initialTrigger={trigger}
    />,
  );
}

/**
 * Проверка сокращённых путей сценария тяги рендером, а не пересказом кода.
 *
 * Смысл именно в последнем тесте: сокращать сценарий можно только до шага результата.
 * Он источник данных для H-ALIVE-001 (successful response rate, target usage vs
 * baseline, craving delta), и если однажды кто-то сведёт «ответ» и «результат» на один
 * экран ради ещё одного сэкономленного тапа, метрики перестанут собираться молча.
 */
describe('Guided — короткие пути', () => {
  it('новичок видит полную сетку контекстов и не видит шортлист', () => {
    const html = render(base);
    expect(html).toContain('В каком контексте включилась тяга?');
    expect(html).not.toContain('Чаще всего у тебя включается здесь');
    expect(html).toContain('T-social');
  });

  it('с историей контексты сортируются: частые сверху', () => {
    const data = {
      ...base,
      episodes: [
        ep('cigarette', 'coffee', 'pause'),
        ep('cigarette', 'coffee', 'pause'),
        ep('cigarette', 'boredom', 'switch'),
        ep('cigarette', 'tension', 'switch'),
      ],
    };
    const html = render(data);
    expect(html).toContain('Чаще всего у тебя включается здесь');
    expect(html).toContain('Остальные контексты');
    expect(html.indexOf('T-coffee')).toBeLessThan(html.indexOf('T-social'));
  });

  it('контекст с Главной + уверенная потребность открывают сразу экран ответа', () => {
    const episodes = Array.from({ length: 5 }, () => ep('cigarette', 'coffee', 'pause'));
    const html = render({ ...base, episodes }, 'coffee');
    expect(html).toContain('Три варианта под этот момент');
    expect(html).toContain('Другая потребность');
    expect(html).toContain('Сила тяги');
    expect(html).toContain('Дыхание');
  });

  it('контекст с Главной без истории открывает экран потребности', () => {
    const html = render(base, 'coffee');
    expect(html).toContain('Что ты на самом деле сейчас ищешь?');
  });
  it('короткий путь не проглатывает шаг результата', () => {
    const episodes = Array.from({ length: 5 }, () => ep('cigarette', 'coffee', 'pause'));
    const html = render({ ...base, episodes }, 'coffee');
    expect(html).toContain('Три варианта под этот момент');
    expect(html).not.toContain('Сохранить эпизод');
    expect(html).not.toContain('Автоматизм прерван');
  });
});
