import { describe, expect, it } from 'vitest';
import { EMPTY_KNOWLEDGE, pickReplacements, type Bootstrap, type Replacement } from './data';

function replacement(
  code: string,
  category: string,
  needCodes: string[],
  productTypes: Array<'cigarette' | 'hookah' | 'vape'>,
): Replacement {
  return {
    code,
    title: code,
    instruction: code,
    category,
    need_codes: needCodes,
    product_types: productTypes,
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
  };
}

const bootstrap: Bootstrap = {
  profile: {
    id: 'u1',
    display_name: 'Test',
    avatar_url: null,
    onboarding_completed_at: '2026-08-18T00:00:00.000Z',
  },
  settings: {
    user_id: 'u1',
    food_replacements_enabled: false,
    nrt_enabled: true,
    fruit_cutoff_time: '20:00',
    goal_text: null,
    evening_checkin_enabled: true,
  },
  products: [],
  triggers: [],
  needs: [],
  replacements: [
    replacement('breath', 'physical', ['calm'], ['cigarette', 'vape']),
    replacement('fruit_portion', 'food', ['calm'], ['cigarette']),
    replacement('nrt_patch', 'nrt', ['calm'], ['cigarette']),
    replacement('journal', 'sensory', ['focus'], ['cigarette']),
  ],
  triggerReplacementMap: [
    { trigger_code: 'coffee', replacement_code: 'fruit_portion', tier: 'fast', priority: 1 },
    { trigger_code: 'coffee', replacement_code: 'breath', tier: 'deeper', priority: 2 },
  ],
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
      need_code: 'calm',
      craving_before: 8,
      craving_after: 3,
      outcome: 'successful_response',
      helpfulness: 5,
      private_note: null,
      started_at: '2026-08-18T00:00:00.000Z',
      completed_at: '2026-08-18T00:00:00.000Z',
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
      occurred_at: '2026-08-18T00:00:00.000Z',
    },
  ],
  tobaccoEvents: [],
  todayCheckin: null,
  knowledge: EMPTY_KNOWLEDGE,
};

describe('pickReplacements', () => {
  it('keeps only replacements allowed by settings and product', () => {
    const picked = pickReplacements(bootstrap, 'cigarette', 'coffee', 'calm');
    expect(picked).toHaveLength(3);
    expect(picked.map((item) => item.code)).toContain('breath');
    expect(picked.map((item) => item.code)).toContain('nrt_patch');
    expect(picked.map((item) => item.code)).not.toContain('fruit_portion');
    expect(picked.every((item) => item.product_types.includes('cigarette'))).toBe(true);
  });

  it('prioritizes a mapped replacement with successful history', () => {
    expect(pickReplacements(bootstrap, 'cigarette', 'coffee', 'calm')[0]?.code).toBe('breath');
  });
});
