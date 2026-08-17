import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export type AdminAnalyticsEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  funnel_stage: string | null;
  surface: string | null;
  product_type: 'cigarette' | 'hookah' | 'vape' | null;
  trigger_code: string | null;
  replacement_code: string | null;
  content_code: string | null;
  outcome: string | null;
  reason_code: string | null;
  duration_ms: number | null;
  numeric_value: number | null;
  occurred_at: string;
};

export type AdminSystemError = {
  id: string;
  surface: string;
  error_type: string;
  error_code: string | null;
  message_fingerprint: string | null;
  duration_ms: number | null;
  occurred_at: string;
  resolved_at: string | null;
};

export type AdminEvidenceClaim = {
  code: string;
  topic: string;
  evidence_level: string;
  last_reviewed_at: string | null;
  review_due_at: string | null;
  status: string;
};

export type AdminAwarenessContent = {
  code: string;
  content_type: 'факт' | 'миф';
  title_ru: string;
  claim_code: string | null;
  published: boolean;
};

export type AdminContentImpression = {
  content_code: string;
  useful: boolean | null;
  product_type: 'cigarette' | 'hookah' | 'vape' | null;
  trigger_code: string | null;
  shown_at: string;
};

export type AdminReason = {
  code: string;
  title_ru: string;
  category_ru: string;
  description_ru: string;
};

export type AdminDashboardData = {
  administratorName: string;
  events: AdminAnalyticsEvent[];
  errors: AdminSystemError[];
  claims: AdminEvidenceClaim[];
  content: AdminAwarenessContent[];
  impressions: AdminContentImpression[];
  reasons: AdminReason[];
  periodDays: number;
};

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error('Подключение к базе данных не настроено');
  return client;
}

export async function loadAdminDashboard(session: Session, periodDays = 30): Promise<AdminDashboardData> {
  const supabase = requireClient();
  const userId = session.user.id;
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();

  const profile = await supabase
    .from('profiles')
    .select('display_name,role,status')
    .eq('id', userId)
    .single();

  if (profile.error) throw new Error(`Не удалось проверить права: ${profile.error.message}`);
  if (!profile.data || profile.data.role !== 'admin' || profile.data.status !== 'active') {
    throw new Error('У этой учётной записи нет доступа к админскому разделу');
  }

  const [eventsRes, errorsRes, claimsRes, contentRes, impressionsRes, reasonsRes] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('id,user_id,event_type,funnel_stage,surface,product_type,trigger_code,replacement_code,content_code,outcome,reason_code,duration_ms,numeric_value,occurred_at')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(10_000),
    supabase
      .from('system_errors')
      .select('id,surface,error_type,error_code,message_fingerprint,duration_ms,occurred_at,resolved_at')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(2_000),
    supabase
      .from('evidence_claims')
      .select('code,topic,evidence_level,last_reviewed_at,review_due_at,status')
      .eq('status', 'проверено')
      .order('review_due_at'),
    supabase
      .from('awareness_content')
      .select('code,content_type,title_ru,claim_code,published')
      .eq('published', true)
      .order('sort_order'),
    supabase
      .from('content_impressions')
      .select('content_code,useful,product_type,trigger_code,shown_at')
      .gte('shown_at', since)
      .order('shown_at', { ascending: false })
      .limit(10_000),
    supabase
      .from('analytics_reason_catalog')
      .select('code,title_ru,category_ru,description_ru')
      .eq('active', true)
      .order('sort_order'),
  ]);

  const firstError = eventsRes.error || errorsRes.error || claimsRes.error || contentRes.error || impressionsRes.error || reasonsRes.error;
  if (firstError) throw new Error(`Не удалось собрать админскую аналитику: ${firstError.message}`);

  return {
    administratorName: profile.data.display_name,
    events: (eventsRes.data ?? []) as AdminAnalyticsEvent[],
    errors: (errorsRes.data ?? []) as AdminSystemError[],
    claims: (claimsRes.data ?? []) as AdminEvidenceClaim[],
    content: (contentRes.data ?? []) as AdminAwarenessContent[],
    impressions: (impressionsRes.data ?? []) as AdminContentImpression[],
    reasons: (reasonsRes.data ?? []) as AdminReason[],
    periodDays,
  };
}
