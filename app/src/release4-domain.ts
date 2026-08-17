export type ProductType = 'cigarette' | 'vape' | 'hookah';

export type ProductConfig = {
  product_type: ProductType;
  baseline: Record<string, unknown>;
  defaults: Record<string, unknown>;
};

export type MetricEpisode = {
  id: string;
  target_product: ProductType;
  outcome: 'open' | 'successful_response' | 'nicotine_used' | 'abandoned' | null;
  deleted_at?: string | null;
};

export type MetricTobaccoEvent = {
  product_type: ProductType;
  cigarette_quantity?: number | null;
  hookah_session_count?: number | null;
  hookah_duration_minutes?: number | null;
  vape_puffs?: number | null;
  cost_actual_rub?: number | null;
  deleted_at?: string | null;
};

export type FreedomMetrics = {
  timeMinutes: number;
  moneyRub: number;
  healthMinutes: number;
  prevented: Record<ProductType, number>;
  coverage: {
    time: ProductType[];
    money: ProductType[];
    health: ProductType[];
  };
  models: {
    time: 'confirmed-baseline-v1';
    money: 'confirmed-baseline-v1';
    health: 'cigarette-health-minutes-v1-2025-uk';
  };
};

const CIGARETTE_RITUAL_MINUTES_DEFAULT = 11;
const CIGARETTE_HEALTH_MINUTES = 20;
const VAPE_PUFFS_PER_CONFIRMED_INTERVAL = 10;

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function baselineQuantity(product: ProductConfig, elapsedDays: number) {
  if (product.product_type === 'cigarette') {
    return finite(product.baseline.cigarettes_per_day) * elapsedDays;
  }
  if (product.product_type === 'hookah') {
    return finite(product.baseline.sessions_per_week) * elapsedDays / 7;
  }
  return finite(product.baseline.puffs_per_day) * elapsedDays;
}

function actualQuantity(product: ProductType, events: MetricTobaccoEvent[]) {
  return events
    .filter((event) => !event.deleted_at && event.product_type === product)
    .reduce((sum, event) => {
      if (product === 'cigarette') return sum + finite(event.cigarette_quantity);
      if (product === 'hookah') return sum + finite(event.hookah_session_count);
      return sum + finite(event.vape_puffs);
    }, 0);
}

function quantityPerSuccessfulEpisode(product: ProductConfig) {
  if (product.product_type === 'vape') {
    return finite(product.defaults.puffs_per_interval, VAPE_PUFFS_PER_CONFIRMED_INTERVAL);
  }
  return 1;
}

function timePerQuantity(product: ProductConfig): number | null {
  if (product.product_type === 'cigarette') {
    return finite(product.defaults.ritual_minutes, CIGARETTE_RITUAL_MINUTES_DEFAULT);
  }
  if (product.product_type === 'hookah') {
    const value = finite(product.defaults.hookah_duration_minutes || product.baseline.typical_duration_minutes);
    return value > 0 ? value : null;
  }
  const value = finite(product.defaults.interval_duration_minutes);
  return value > 0 ? value / quantityPerSuccessfulEpisode(product) : null;
}

function moneyPerQuantity(product: ProductConfig): number | null {
  if (product.product_type === 'cigarette') {
    const price = finite(product.defaults.pack_price_rub || product.baseline.pack_price_rub);
    const size = finite(product.defaults.pack_size || product.baseline.pack_size, 20) || 20;
    return price > 0 ? price / size : null;
  }
  if (product.product_type === 'hookah') {
    const value = finite(product.defaults.hookah_default_price_rub || product.baseline.typical_cost_rub);
    return value > 0 ? value : null;
  }
  const price = finite(product.defaults.consumable_price_rub);
  const claimedPuffs = finite(product.defaults.claimed_puffs);
  return price > 0 && claimedPuffs > 0 ? price / claimedPuffs : null;
}

export function calculateFreedomMetrics(input: {
  products: ProductConfig[];
  episodes: MetricEpisode[];
  tobaccoEvents: MetricTobaccoEvent[];
  elapsedDays: number;
}): FreedomMetrics {
  const elapsedDays = Math.max(0, finite(input.elapsedDays));
  const prevented: Record<ProductType, number> = { cigarette: 0, vape: 0, hookah: 0 };
  const coverage: FreedomMetrics['coverage'] = { time: [], money: [], health: ['cigarette'] };
  let timeMinutes = 0;
  let moneyRub = 0;

  for (const product of input.products) {
    const successes = input.episodes.filter(
      (episode) => !episode.deleted_at
        && episode.target_product === product.product_type
        && episode.outcome === 'successful_response',
    ).length;
    const confirmedQuantity = successes * quantityPerSuccessfulEpisode(product);
    const availableAgainstBaseline = Math.max(
      0,
      baselineQuantity(product, elapsedDays) - actualQuantity(product.product_type, input.tobaccoEvents),
    );
    const quantity = Math.min(confirmedQuantity, availableAgainstBaseline);
    prevented[product.product_type] = quantity;

    const time = timePerQuantity(product);
    if (time !== null) {
      coverage.time.push(product.product_type);
      timeMinutes += quantity * time;
    }

    const money = moneyPerQuantity(product);
    if (money !== null) {
      coverage.money.push(product.product_type);
      moneyRub += quantity * money;
    }
  }

  return {
    timeMinutes,
    moneyRub,
    healthMinutes: prevented.cigarette * CIGARETTE_HEALTH_MINUTES,
    prevented,
    coverage,
    models: {
      time: 'confirmed-baseline-v1',
      money: 'confirmed-baseline-v1',
      health: 'cigarette-health-minutes-v1-2025-uk',
    },
  };
}

export type RankedReplacement = {
  code: string;
  title: string;
  instruction: string;
  category: string;
  need_codes: string[];
  product_types: ProductType[];
  eligibility: Record<string, unknown>;
  duration?: string | null;
  summary?: string | null;
  safety?: string | null;
};

export type ContextRule = {
  trigger_code: string | null;
  replacement_code: string;
  product_type: ProductType | null;
  min_craving: number | null;
  max_craving: number | null;
  priority: number;
  enabled: boolean;
};

export type ReplacementPreference = {
  replacement_code: string;
  preference: 'prefer' | 'avoid' | 'neutral';
};

export type ReplacementLearning = {
  global_replacement_code: string | null;
  product_type: ProductType;
  trigger_key: string;
  attempts: number;
  successful_responses: number;
  helpfulness_sum: number;
  helpfulness_count: number;
};

export type RankedIntervention = {
  replacement: RankedReplacement;
  score: number;
  explanation: string;
  explanationKind: 'personal' | 'prepared' | 'context' | 'generic';
};

export function rankInterventions(input: {
  replacements: RankedReplacement[];
  contextRules: ContextRule[];
  preferences: ReplacementPreference[];
  learning: ReplacementLearning[];
  product: ProductType;
  triggerCode: string;
  triggerTitle: string;
  needCode?: string | null;
  craving: number;
  preparedReplacementCode?: string | null;
  settings: {
    foodEnabled: boolean;
    nrtEnabled: boolean;
  };
  limit?: number;
}): RankedIntervention[] {
  const preference = new Map(input.preferences.map((item) => [item.replacement_code, item.preference]));
  const eligible = input.replacements.filter((replacement) => {
    if (!replacement.product_types.includes(input.product)) return false;
    if (!input.settings.foodEnabled && replacement.category === 'food') return false;
    if (!input.settings.nrtEnabled && replacement.category === 'nrt') return false;
    if (replacement.category === 'nrt' && input.product !== 'cigarette') return false;
    if (replacement.eligibility.disabled === true) return false;
    return preference.get(replacement.code) !== 'avoid';
  });

  return eligible.map((replacement) => {
    let score = 0;
    let explanation = 'Доступно сейчас и подходит выбранному продукту.';
    let explanationKind: RankedIntervention['explanationKind'] = 'generic';

    const rule = input.contextRules
      .filter((item) => item.enabled
        && item.replacement_code === replacement.code
        && (!item.trigger_code || item.trigger_code === input.triggerCode)
        && (!item.product_type || item.product_type === input.product)
        && (item.min_craving === null || input.craving >= item.min_craving)
        && (item.max_craving === null || input.craving <= item.max_craving))
      .sort((a, b) => a.priority - b.priority)[0];

    if (rule) {
      score += 1000 - rule.priority;
      explanation = 'Подходит к контексту «' + input.triggerTitle + '».';
      explanationKind = 'context';
    }
    if (input.needCode && replacement.need_codes.includes(input.needCode)) score += 120;
    if (preference.get(replacement.code) === 'prefer') score += 180;

    if (input.preparedReplacementCode === replacement.code) {
      score += 320;
      explanation = 'Ты заранее выбрал это как первый ответ для похожего момента.';
      explanationKind = 'prepared';
    }

    const learning = input.learning
      .filter((item) => item.global_replacement_code === replacement.code
        && item.product_type === input.product
        && (item.trigger_key === 'g:' + input.triggerCode || item.trigger_key === 'любой'))
      .sort((a, b) => {
        const exactKey = 'g:' + input.triggerCode;
        const contextPriority = Number(b.trigger_key === exactKey) - Number(a.trigger_key === exactKey);
        return contextPriority || b.attempts - a.attempts;
      })[0];

    if (learning && learning.attempts >= 3) {
      const successRate = learning.successful_responses / learning.attempts;
      const helpfulness = learning.helpfulness_count > 0
        ? learning.helpfulness_sum / learning.helpfulness_count
        : 0;
      score += successRate * 300 + helpfulness * 20;
      explanation = 'В похожих эпизодах это помогло ' + learning.successful_responses + ' из ' + learning.attempts + ' раз.';
      explanationKind = 'personal';
    }

    return { replacement, score, explanation, explanationKind };
  }).sort((left, right) =>
    right.score - left.score
    || left.replacement.code.localeCompare(right.replacement.code)
  ).slice(0, input.limit ?? 3);
}

export type AwarenessContent = {
  code: string;
  content_type: 'факт' | 'миф';
  title_ru: string;
  hook_ru: string;
  explanation_ru: string;
  motivation_ru: string;
  caveat_ru: string;
  claim_code: string;
  product_types: ProductType[];
  published: boolean;
  sort_order: number;
};

export type AwarenessContext = {
  content_code: string;
  trigger_code: string | null;
  product_type: ProductType | null;
  moment: string;
  priority: number;
};

export type AwarenessImpression = {
  content_code: string;
  shown_at: string;
};

export type PersonalGoal = {
  id: string;
  title_ru: string;
  body_ru: string;
  active: boolean;
  priority: number;
};

export type AwarenessSelection =
  | { kind: 'content'; content: AwarenessContent }
  | { kind: 'goal'; goal: PersonalGoal }
  | null;

export function selectAwareness(input: {
  content: AwarenessContent[];
  contexts: AwarenessContext[];
  impressions: AwarenessImpression[];
  goals: PersonalGoal[];
  product: ProductType;
  triggerCode: string;
  moment?: string;
  fatigueWindow?: number;
}): AwarenessSelection {
  const moment = input.moment ?? 'микроосознанность';
  const recentCodes = new Set(
    [...input.impressions]
      .sort((a, b) => b.shown_at.localeCompare(a.shown_at))
      .slice(0, input.fatigueWindow ?? 3)
      .map((item) => item.content_code),
  );
  const priority = new Map<string, number>();
  input.contexts
    .filter((context) => context.moment === moment
      && (!context.trigger_code || context.trigger_code === input.triggerCode)
      && (!context.product_type || context.product_type === input.product))
    .forEach((context) => {
      const current = priority.get(context.content_code);
      if (current === undefined || context.priority < current) priority.set(context.content_code, context.priority);
    });

  const candidates = input.content
    .filter((item) => item.published
      && item.product_types.includes(input.product)
      && priority.has(item.code))
    .sort((a, b) => (priority.get(a.code) ?? 9999) - (priority.get(b.code) ?? 9999)
      || a.sort_order - b.sort_order
      || a.code.localeCompare(b.code));

  const fresh = candidates.find((item) => !recentCodes.has(item.code));
  if (fresh) return { kind: 'content', content: fresh };

  const goal = input.goals
    .filter((item) => item.active)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
  if (goal) return { kind: 'goal', goal };

  if (candidates.length) {
    const shownAt = new Map(input.impressions.map((item) => [item.content_code, item.shown_at]));
    const oldest = [...candidates].sort((a, b) =>
      (shownAt.get(a.code) ?? '').localeCompare(shownAt.get(b.code) ?? '')
      || a.code.localeCompare(b.code)
    )[0];
    return { kind: 'content', content: oldest };
  }
  return null;
}

export const ANALYTICS_EVENT_TYPES = [
  'craving_flow_opened',
  'product_selected',
  'context_selected',
  'first_useful_response',
  'awareness_shown',
  'awareness_feedback',
  'intervention_shown',
  'intervention_selected',
  'intervention_completed',
  'outcome_saved',
  'flow_abandoned',
  'freedom_metrics_visible',
  'use_episode_logged',
] as const;

export type AnalyticsEventType = typeof ANALYTICS_EVENT_TYPES[number];

export function buildAnalyticsEvent(type: AnalyticsEventType, input: Record<string, unknown>) {
  const directKeys = [
    'product_type',
    'trigger_code',
    'replacement_code',
    'content_code',
    'outcome',
    'reason_code',
    'duration_ms',
    'numeric_value',
    'episode_id',
    'funnel_stage',
    'surface',
  ];
  const metadataKeys = [
    'stage',
    'source',
    'model_version',
    'coverage',
    'ranking_reason',
    'episode_kind',
    'flow_id',
  ];
  const event: Record<string, unknown> = { event_type: type };
  for (const key of directKeys) {
    if (input[key] !== undefined && input[key] !== null) event[key] = input[key];
  }
  const metadata: Record<string, unknown> = {};
  for (const key of metadataKeys) {
    if (input[key] !== undefined && input[key] !== null) metadata[key] = input[key];
  }
  event.metadata = metadata;
  return event;
}

export const PRODUCT_SEMANTICS = {
  cigarette: {
    decisionPoint: 'discrete_episode',
    outcomeUnit: 'cigarette',
    healthMinutesCovered: true,
  },
  vape: {
    decisionPoint: 'device_reach_and_interval',
    outcomeUnit: 'puffs_or_interval',
    healthMinutesCovered: false,
  },
  hookah: {
    decisionPoint: 'pre_session',
    outcomeUnit: 'session',
    healthMinutesCovered: false,
  },
} as const satisfies Record<ProductType, {
  decisionPoint: string;
  outcomeUnit: string;
  healthMinutesCovered: boolean;
}>;
