import { getSupabase } from '../../supabase';

/**
 * Единственная дверь модуля к данным. Ни один экран не ходит в базу мимо этого файла:
 * иначе через месяц «активный участник» будет считаться двумя разными запросами.
 *
 * Считает всё база — шесть функций с проверкой роли внутри. Здесь только вызов и типы.
 */

export type CoreMetricRow = {
  week: string;
  participants_with_result: number;
  new_participants: number;
  median_baseline_ratio: number | null;
  ratio_observations: number;
  computable: boolean;
  note: string | null;
};

export type FunnelRow = {
  step_no: number;
  step: string;
  people: number;
  conversion_pct: number | null;
  median_hours: number | null;
  computable: boolean;
  note: string | null;
};

export type FlowStepRow = {
  step_no: number;
  views: number;
  people: number;
  median_seconds: number | null;
  drop_off_pct: number | null;
};

export type RetentionRow = {
  cohort_week: string;
  cohort_size: number;
  horizon_days: number;
  retained: number | null;
  retained_pct: number | null;
};

export type SourceRow = {
  source_kind: string;
  detail: string;
  visitors: number;
  signups: number;
  reached_result: number;
  note: string | null;
};

export type StateRow = {
  state: string;
  probable_direction: string;
  participants: number;
  note: string | null;
};

export type AnalyticsSnapshot = {
  core: CoreMetricRow[];
  funnel: FunnelRow[];
  flow: FlowStepRow[];
  retention: RetentionRow[];
  sources: SourceRow[];
  states: StateRow[];
};

async function call<T>(name: string, args: Record<string, unknown>): Promise<T[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/**
 * Шесть запросов уходят разом. Последовательно это шесть кругов ожидания на экране,
 * который открывают, чтобы посмотреть числа, а не посидеть.
 */
export async function loadAnalytics(days: number, weeks: number): Promise<AnalyticsSnapshot> {
  const [core, funnel, flow, retention, sources, states] = await Promise.all([
    call<CoreMetricRow>('admin_core_metrics', { weeks }),
    call<FunnelRow>('admin_funnel', { days }),
    call<FlowStepRow>('admin_flow_steps', { days }),
    call<RetentionRow>('admin_retention', { weeks }),
    call<SourceRow>('admin_sources', { days }),
    call<StateRow>('admin_user_states', {}),
  ]);
  return { core, funnel, flow, retention, sources, states };
}
