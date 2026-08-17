import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  buildAnalyticsEvent,
  type AnalyticsEventType,
  type AwarenessContent,
  type AwarenessContext,
  type AwarenessImpression,
  type ContextRule,
  type PersonalGoal,
  type ReplacementLearning,
  type ReplacementPreference,
} from './release4-domain';

export type Release4Data = {
  r1Ready: boolean;
  contextRules: ContextRule[];
  replacementPreferences: ReplacementPreference[];
  replacementLearning: ReplacementLearning[];
  awarenessContent: AwarenessContent[];
  awarenessContexts: AwarenessContext[];
  awarenessImpressions: AwarenessImpression[];
  personalGoals: PersonalGoal[];
};

const EMPTY_RELEASE4_DATA: Release4Data = {
  r1Ready: false,
  contextRules: [],
  replacementPreferences: [],
  replacementLearning: [],
  awarenessContent: [],
  awarenessContexts: [],
  awarenessImpressions: [],
  personalGoals: [],
};

type OptionalResult<T> = {
  data: T[] | null;
  error: unknown;
};

type RowsResult<T> = {
  rows: T[];
  ok: boolean;
};

async function optionalRows<T>(query: unknown): Promise<RowsResult<T>> {
  try {
    const result = await (query as PromiseLike<OptionalResult<T>>);
    return { rows: result.error ? [] : result.data ?? [], ok: !result.error };
  } catch {
    return { rows: [], ok: false };
  }
}

export async function loadRelease4Data(session: Session): Promise<Release4Data> {
  const supabase = getSupabase();
  if (!supabase) return EMPTY_RELEASE4_DATA;
  const userId = session.user.id;

  const [
    contextRulesResult,
    preferenceResult,
    learningResult,
    contentResult,
    contextsResult,
    impressionsResult,
    goalsResult,
  ] = await Promise.all([
    optionalRows<ContextRule>(
      supabase.from('intervention_context_rules')
        .select('trigger_code,replacement_code,product_type,min_craving,max_craving,priority,enabled')
        .eq('enabled', true)
        .order('priority'),
    ),
    optionalRows<{ replacement_code: string; enabled: boolean; pinned: boolean }>(
      supabase.from('user_replacement_preferences')
        .select('replacement_code,enabled,pinned')
        .eq('user_id', userId),
    ),
    optionalRows<ReplacementLearning>(
      supabase.from('user_replacement_stats')
        .select('global_replacement_code,product_type,trigger_key,attempts,successful_responses,helpfulness_sum,helpfulness_count')
        .eq('user_id', userId),
    ),
    optionalRows<AwarenessContent>(
      supabase.from('awareness_content')
        .select('code,content_type,title_ru,hook_ru,explanation_ru,motivation_ru,caveat_ru,claim_code,product_types,published,sort_order,evidence_claims!inner(status)')
        .eq('published', true)
        .not('claim_code', 'is', null)
        .eq('evidence_claims.status', 'проверено')
        .order('sort_order'),
    ),
    optionalRows<AwarenessContext>(
      supabase.from('awareness_content_contexts')
        .select('content_code,trigger_code,product_type,moment,priority')
        .eq('moment', 'микроосознанность')
        .order('priority'),
    ),
    optionalRows<AwarenessImpression>(
      supabase.from('content_impressions')
        .select('content_code,shown_at')
        .eq('user_id', userId)
        .order('shown_at', { ascending: false })
        .limit(12),
    ),
    optionalRows<PersonalGoal>(
      supabase.from('user_goals')
        .select('id,title_ru,body_ru,active,priority')
        .eq('user_id', userId)
        .eq('active', true)
        .is('deleted_at', null)
        .order('priority', { ascending: false }),
    ),
  ]);

  const replacementPreferences: ReplacementPreference[] = preferenceResult.rows.map((row) => ({
    replacement_code: row.replacement_code,
    preference: !row.enabled ? 'avoid' : row.pinned ? 'prefer' : 'neutral',
  }));

  return {
    r1Ready: [
      contextRulesResult,
      preferenceResult,
      learningResult,
      contentResult,
      contextsResult,
      impressionsResult,
      goalsResult,
    ].every((result) => result.ok),
    contextRules: contextRulesResult.rows,
    replacementPreferences,
    replacementLearning: learningResult.rows,
    awarenessContent: contentResult.rows,
    awarenessContexts: contextsResult.rows,
    awarenessImpressions: impressionsResult.rows,
    personalGoals: goalsResult.rows,
  };
}

export async function trackRelease4Event(
  session: Session,
  type: AnalyticsEventType,
  input: Record<string, unknown>,
) {
  const supabase = getSupabase();
  if (!supabase) return false;
  const event = buildAnalyticsEvent(type, input);
  const result = await supabase.from('analytics_events').insert({
    user_id: session.user.id,
    ...event,
  });
  return !result.error;
}

export async function recordAwarenessShown(
  session: Session,
  input: {
    contentCode: string;
    productType: 'cigarette' | 'vape' | 'hookah';
    triggerCode: string;
    flowId: string;
  },
) {
  const supabase = getSupabase();
  if (!supabase) return false;
  const impression = await supabase.from('content_impressions').insert({
    user_id: session.user.id,
    content_code: input.contentCode,
    moment: 'микроосознанность',
    product_type: input.productType,
    trigger_code: input.triggerCode,
  });
  if (impression.error) return false;
  return trackRelease4Event(session, 'awareness_shown', {
    funnel_stage: 'микроосознанность',
    surface: 'веб',
    product_type: input.productType,
    trigger_code: input.triggerCode,
    content_code: input.contentCode,
    flow_id: input.flowId,
  });
}
