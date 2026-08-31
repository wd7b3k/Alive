import { getSupabase } from '../../supabase';

/**
 * Единственная дверь раздела к данным.
 *
 * Считает всё база — пять функций с проверкой роли внутри. Здесь только вызов и типы.
 * Ни одного порога и ни одной оценки на клиенте: «сервис работает» обязано означать
 * одно и то же в вебе, в боте и в мобильном приложении, а значит вычисляться в одном
 * месте. Экран умеет только раскрасить и назвать по-русски.
 */

/** Статус части или проверки. Порядок серьёзности задаёт база, не экран. */
export type ServiceStatus = 'ok' | 'warn' | 'stale' | 'silent' | 'fail' | 'planned';

/** Общий вердикт. `unknown` — мониторинг молчит: это не «работает» и не «лежит». */
export type Verdict = 'ok' | 'degraded' | 'unknown' | 'down';

export type Layer = 'frontend' | 'backend' | 'platform';

export type Summary = {
  status: Verdict;
  worst_component: string | null;
  window_hours: number;
  generated_at: string;
  /** С какого момента измерения считаются настоящими. Граница живёт в ops.settings. */
  observations_since: string;
  components_live: number;
  components_failing: number;
  components_warning: number;
  components_silent: number;
  components_planned: number;
  checks_total: number;
  checks_unregistered: number;
  uptime_pct: number | null;
  /** Сколько наблюдений было. Меньше порога — процент не считается вовсе. */
  uptime_samples: number;
};

export type Component = {
  component_id: string;
  layer: Layer;
  title: string;
  hint: string;
  lifecycle: 'live' | 'planned' | 'retired';
  critical: boolean;
  status: ServiceStatus;
  checks_total: number;
  checks_failing: number;
  checks_warning: number;
  checks_silent: number;
  worst_check: string | null;
  last_seen: string | null;
  uptime_pct: number | null;
  latency_p95_ms: number | null;
  uptime_samples: number;
};

export type Check = {
  component_id: string | null;
  component_title: string | null;
  layer: Layer | null;
  check_name: string;
  target: string | null;
  title: string;
  hint: string;
  unit: string | null;
  status: ServiceStatus;
  value: number | null;
  latency_ms: number | null;
  note: string | null;
  observed_at: string | null;
  age_seconds: number | null;
  period_seconds: number | null;
  samples: number;
  uptime_pct: number | null;
};

export type Surface = {
  component_id: string;
  title: string;
  hint: string;
  lifecycle: 'live' | 'planned' | 'retired';
  status: ServiceStatus;
  signals: number;
  errors: number;
  errors_per_100: number | null;
  last_signal_at: string | null;
  versions: number;
  latest_version: string | null;
  note: string | null;
};

export type Incident = {
  check_name: string;
  title: string;
  component_title: string | null;
  target: string | null;
  status: 'fail' | 'warn';
  started_at: string;
  ended_at: string;
  samples: number;
  note: string | null;
};

export type ServiceSnapshot = {
  summary: Summary | null;
  components: Component[];
  checks: Check[];
  surfaces: Surface[];
  incidents: Incident[];
};

async function call<T>(name: string, args: Record<string, unknown>): Promise<T[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/**
 * Случаи считаются в сутках, всё остальное — в часах. Окно одно: смотреть состояние за
 * час, а список поломок за неделю — значит объяснять текущий отказ вчерашним.
 */
export function incidentDays(hours: number): number {
  return Math.max(1, Math.round(hours / 24));
}

/**
 * Пять запросов уходят разом. Последовательно это пять кругов ожидания на экране,
 * который открывают в момент, когда что-то уже не работает.
 */
export async function loadServiceHealth(hours: number): Promise<ServiceSnapshot> {
  const [summary, components, checks, surfaces, incidents] = await Promise.all([
    call<Summary>('admin_service_summary', { p_hours: hours }),
    call<Component>('admin_service_health', { p_hours: hours }),
    call<Check>('admin_service_checks', { p_hours: hours }),
    call<Surface>('admin_service_surfaces', { p_hours: hours }),
    call<Incident>('admin_service_incidents', { p_days: incidentDays(hours) }),
  ]);
  return { summary: summary[0] ?? null, components, checks, surfaces, incidents };
}
