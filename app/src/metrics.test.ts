import { describe, expect, it } from 'vitest';
import {
  EMPTY_KNOWLEDGE,
  baselineDailyCost,
  baselineDailyUnits,
  eventAliveUnits,
  type Bootstrap,
  type NicotineProduct,
  type TobaccoEvent,
} from './data';
import { dailyUnits, replacementStats, statsForDays, triggerStats } from './domain/metrics';

const products: NicotineProduct[] = [
  {
    user_id: 'u1',
    product_type: 'cigarette',
    role: 'target_dependency',
    enabled: true,
    baseline: { cigarettes_per_day: 10 },
    defaults: { pack_price_rub: 220, pack_size: 20 },
  },
  {
    user_id: 'u1',
    product_type: 'hookah',
    role: 'target_dependency',
    enabled: true,
    baseline: { sessions_per_week: 7 },
    defaults: { hookah_default_price_rub: 1400 },
  },
  {
    user_id: 'u1',
    product_type: 'vape',
    role: 'target_dependency',
    enabled: true,
    baseline: { puffs_per_day: 100 },
    defaults: { claimed_puffs: 1000, consumable_price_rub: 500 },
  },
];

const today = new Date().toISOString();
const yesterday = new Date(Date.now() - 86_400_000).toISOString();
const bootstrap: Bootstrap = {
  profile: { id: 'u1', display_name: 'Test', avatar_url: null, onboarding_completed_at: today },
  settings: {
    user_id: 'u1',
    food_replacements_enabled: true,
    nrt_enabled: true,
    fruit_cutoff_time: '20:00',
    goal_text: null,
    evening_checkin_enabled: true,
  },
  products,
  triggers: [
    {
      code: 'coffee',
      title: 'Кофе',
      description: 'После еды',
      product_types: ['cigarette'],
      sort_order: 1,
    },
    {
      code: 'stress',
      title: 'Стресс',
      description: 'Напряжение',
      product_types: ['cigarette', 'vape'],
      sort_order: 2,
    },
  ],
  needs: [],
  replacements: [
    {
      code: 'breath',
      title: 'Дыхание',
      instruction: '',
      category: 'physical',
      need_codes: [],
      product_types: ['cigarette', 'vape'],
      eligibility: {},
      sort_order: 1,
      icon: null,
      duration: null,
      summary: null,
      safety: null,
      mechanism: null,
      evidence_level: null,
      evidence_scope: null,
      source_title: null,
      source_url: null,
    },
  ],
  triggerReplacementMap: [],
  meanings: [],
  userMeanings: [],
  userLinks: [],
  identityScripts: [],
  supports: [],
  rewards: [],
  episodes: [
    {
      id: 'e1',
      user_id: 'u1',
      target_product: 'cigarette',
      trigger_code: 'coffee',
      custom_trigger_text: null,
      need_code: null,
      craving_before: 8,
      craving_after: 4,
      outcome: 'successful_response',
      helpfulness: 4,
      private_note: null,
      started_at: today,
      completed_at: today,
      deleted_at: null,
    },
    {
      id: 'e2',
      user_id: 'u1',
      target_product: 'cigarette',
      trigger_code: 'stress',
      custom_trigger_text: null,
      need_code: null,
      craving_before: 7,
      craving_after: 7,
      outcome: 'nicotine_used',
      helpfulness: 2,
      private_note: null,
      started_at: yesterday,
      completed_at: yesterday,
      deleted_at: null,
    },
  ],
  actions: [
    {
      id: 'a1',
      user_id: 'u1',
      episode_id: 'e1',
      action_type: 'replacement',
      replacement_code: 'breath',
      payload: {},
      occurred_at: today,
    },
    {
      id: 'a2',
      user_id: 'u1',
      episode_id: 'e2',
      action_type: 'replacement',
      replacement_code: 'breath',
      payload: {},
      occurred_at: yesterday,
    },
  ],
  tobaccoEvents: [
    {
      id: 't1',
      user_id: 'u1',
      episode_id: 'e2',
      product_type: 'cigarette',
      cigarette_quantity: 1,
      hookah_session_count: null,
      hookah_duration_minutes: null,
      vape_puffs: null,
      vape_device_type: null,
      cost_actual_rub: 11,
      occurred_at: yesterday,
      deleted_at: null,
    },
  ],
  todayCheckin: null,
  knowledge: EMPTY_KNOWLEDGE,
};

describe('business metrics', () => {
  it('normalizes product events and baseline costs consistently', () => {
    expect(eventAliveUnits(bootstrap.tobaccoEvents[0] as TobaccoEvent)).toBe(1);
    expect(baselineDailyUnits(products)).toBeCloseTo(30);
    expect(baselineDailyCost(products)).toBeCloseTo(1560);
  });

  it('builds period stats from non-deleted episodes and events', () => {
    const week = statsForDays(bootstrap, 7);
    expect(week).toMatchObject({
      successfulResponses: 1,
      nicotineEpisodes: 1,
      cigarettes: 1,
      activeDays: 2,
    });
    expect(week.freedomFund).toBeGreaterThan(0);
    expect(dailyUnits(bootstrap, 2)).toHaveLength(2);
  });

  it('aggregates trigger and replacement effectiveness', () => {
    expect(
      triggerStats(bootstrap).find((item) => item.trigger.code === 'coffee')?.successRate,
    ).toBe(100);
    const ranked = replacementStats(bootstrap);
    expect(ranked[0]).toMatchObject({ code: 'breath', uses: 2, avgHelpfulness: 3 });
  });
});
