import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYTICS_EVENT_TYPES,
  PRODUCT_SEMANTICS,
  buildAnalyticsEvent,
  calculateFreedomMetrics,
  rankInterventions,
  selectAwareness,
} from './release4-domain.ts';

const cigarette = {
  product_type: 'cigarette',
  baseline: { cigarettes_per_day: 10 },
  defaults: { pack_price_rub: 200, pack_size: 20 },
};

test('freedom metrics use confirmed cigarette response and approved models', () => {
  const result = calculateFreedomMetrics({
    products: [cigarette],
    elapsedDays: 1,
    episodes: [{ id: 'e1', target_product: 'cigarette', outcome: 'successful_response' }],
    tobaccoEvents: [],
  });
  assert.equal(result.prevented.cigarette, 1);
  assert.equal(result.timeMinutes, 11);
  assert.equal(result.moneyRub, 10);
  assert.equal(result.healthMinutes, 20);
  assert.equal(result.models.health, 'cigarette-health-minutes-v1-2025-uk');
});

test('health minutes never leak to vape or hookah', () => {
  const result = calculateFreedomMetrics({
    products: [
      { product_type: 'vape', baseline: { puffs_per_day: 100 }, defaults: { claimed_puffs: 5000, consumable_price_rub: 1000 } },
      { product_type: 'hookah', baseline: { sessions_per_week: 7 }, defaults: { hookah_default_price_rub: 2000, hookah_duration_minutes: 60 } },
    ],
    elapsedDays: 1,
    episodes: [
      { id: 'v1', target_product: 'vape', outcome: 'successful_response' },
      { id: 'h1', target_product: 'hookah', outcome: 'successful_response' },
    ],
    tobaccoEvents: [],
  });
  assert.equal(result.healthMinutes, 0);
  assert.equal(PRODUCT_SEMANTICS.vape.healthMinutesCovered, false);
  assert.equal(PRODUCT_SEMANTICS.hookah.healthMinutesCovered, false);
  assert.deepEqual(result.coverage.health, ['cigarette']);
});

test('correction and deletion rebuild metrics from non-deleted raw facts', () => {
  const result = calculateFreedomMetrics({
    products: [cigarette],
    elapsedDays: 1,
    episodes: [
      { id: 'kept', target_product: 'cigarette', outcome: 'successful_response' },
      { id: 'deleted', target_product: 'cigarette', outcome: 'successful_response', deleted_at: '2026-08-17T00:00:00Z' },
    ],
    tobaccoEvents: [
      { product_type: 'cigarette', cigarette_quantity: 9 },
      { product_type: 'cigarette', cigarette_quantity: 100, deleted_at: '2026-08-17T00:00:00Z' },
    ],
  });
  assert.equal(result.prevented.cigarette, 1);
  assert.equal(result.healthMinutes, 20);
});

const replacements = [
  { code: 'mouth_reset', title: 'Освежить рот', instruction: 'Прополощи рот', category: 'ritual', need_codes: ['closure'], product_types: ['cigarette'], eligibility: {} },
  { code: 'walk', title: 'Короткая прогулка', instruction: 'Пройдись', category: 'movement', need_codes: ['switch'], product_types: ['cigarette', 'vape'], eligibility: {} },
  { code: 'nrt', title: 'НЗТ', instruction: 'По инструкции', category: 'nrt', need_codes: [], product_types: ['cigarette'], eligibility: {} },
];

function rank(overrides = {}) {
  return rankInterventions({
    replacements,
    contextRules: [{ trigger_code: 'after_meal', replacement_code: 'mouth_reset', product_type: 'cigarette', min_craving: null, max_craving: null, priority: 10, enabled: true }],
    preferences: [],
    learning: [],
    product: 'cigarette',
    triggerCode: 'after_meal',
    triggerTitle: 'После еды',
    craving: 7,
    settings: { foodEnabled: true, nrtEnabled: false },
    ...overrides,
  });
}

test('intervention ranking is deterministic, eligible and context-first', () => {
  const first = rank();
  const second = rank();
  assert.deepEqual(first, second);
  assert.equal(first[0].replacement.code, 'mouth_reset');
  assert.equal(first[0].explanationKind, 'context');
  assert.equal(first.some((item) => item.replacement.code === 'nrt'), false);
});

test('personal explanation appears only after sufficient real outcomes', () => {
  const weak = rank({ learning: [{ global_replacement_code: 'walk', product_type: 'cigarette', trigger_key: 'g:after_meal', attempts: 2, successful_responses: 2, helpfulness_sum: 8, helpfulness_count: 2 }] });
  assert.notEqual(weak.find((item) => item.replacement.code === 'walk').explanationKind, 'personal');

  const enough = rank({ learning: [{ global_replacement_code: 'walk', product_type: 'cigarette', trigger_key: 'g:after_meal', attempts: 3, successful_responses: 2, helpfulness_sum: 11, helpfulness_count: 3 }] });
  const walk = enough.find((item) => item.replacement.code === 'walk');
  assert.equal(walk.explanationKind, 'personal');
  assert.match(walk.explanation, /2 из 3/);
});

const content = [
  { code: 'a', content_type: 'факт', title_ru: 'A', hook_ru: 'A', explanation_ru: 'A', motivation_ru: 'A', caveat_ru: 'A', product_types: ['cigarette'], published: true, sort_order: 10 },
  { code: 'b', content_type: 'миф', title_ru: 'B', hook_ru: 'B', explanation_ru: 'B', motivation_ru: 'B', caveat_ru: 'B', product_types: ['cigarette'], published: true, sort_order: 20 },
];

test('context-specific learning outranks a larger generic sample', () => {
  const result = rank({
    learning: [
      { global_replacement_code: 'walk', product_type: 'cigarette', trigger_key: 'любой', attempts: 10, successful_responses: 9, helpfulness_sum: 40, helpfulness_count: 10 },
      { global_replacement_code: 'walk', product_type: 'cigarette', trigger_key: 'g:after_meal', attempts: 3, successful_responses: 2, helpfulness_sum: 11, helpfulness_count: 3 },
    ],
  });
  const walk = result.find((item) => item.replacement.code === 'walk');
  assert.equal(walk.explanationKind, 'personal');
  assert.match(walk.explanation, /2 из 3/);
});

test('awareness selection respects context and fatigue', () => {
  const selection = selectAwareness({
    content,
    contexts: [
      { content_code: 'a', trigger_code: 'after_meal', product_type: 'cigarette', moment: 'микроосознанность', priority: 10 },
      { content_code: 'b', trigger_code: 'after_meal', product_type: 'cigarette', moment: 'микроосознанность', priority: 20 },
    ],
    impressions: [{ content_code: 'a', shown_at: '2026-08-17T12:00:00Z' }],
    goals: [],
    product: 'cigarette',
    triggerCode: 'after_meal',
  });
  assert.equal(selection.kind, 'content');
  assert.equal(selection.content.code, 'b');
});

test('awareness uses active private goal without exposing it as medical content', () => {
  const selection = selectAwareness({
    content,
    contexts: [{ content_code: 'a', trigger_code: 'after_meal', product_type: 'cigarette', moment: 'микроосознанность', priority: 10 }],
    impressions: [{ content_code: 'a', shown_at: '2026-08-17T12:00:00Z' }],
    goals: [{ id: 'g1', title_ru: 'Моё Зачем', body_ru: 'Личный текст', active: true, priority: 5 }],
    product: 'cigarette',
    triggerCode: 'after_meal',
  });
  assert.equal(selection.kind, 'goal');
  assert.equal(selection.goal.id, 'g1');
});

test('analytics mapping allowlists structured fields and drops private text', () => {
  assert.ok(ANALYTICS_EVENT_TYPES.includes('use_episode_logged'));
  const event = buildAnalyticsEvent('outcome_saved', {
    product_type: 'cigarette',
    trigger_code: 'after_meal',
    outcome: 'successful_response',
    episode_kind: 'craving',
    funnel_stage: 'результат импульса',
    surface: 'веб',
    private_note: 'секрет',
    goal_body: 'личное Зачем',
    link_situation: 'личная Связка',
  });
  assert.equal(event.product_type, 'cigarette');
  assert.equal(event.funnel_stage, 'результат импульса');
  assert.equal(event.surface, 'веб');
  assert.equal(event.private_note, undefined);
  assert.equal(event.goal_body, undefined);
  assert.deepEqual(event.metadata, { episode_kind: 'craving' });
});

test('product semantics preserve different decision points', () => {
  assert.equal(PRODUCT_SEMANTICS.cigarette.decisionPoint, 'discrete_episode');
  assert.equal(PRODUCT_SEMANTICS.vape.decisionPoint, 'device_reach_and_interval');
  assert.equal(PRODUCT_SEMANTICS.hookah.decisionPoint, 'pre_session');
  assert.equal(PRODUCT_SEMANTICS.cigarette.healthMinutesCovered, true);
});
