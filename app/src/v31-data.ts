import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import type { Bootstrap, ProductType, Replacement } from './data';

export type EvidenceLevel = 'A' | 'B' | 'C';

export type Fact = {
  code: string;
  title: string;
  short_text: string;
  full_text: string;
  category: string;
  benefit: boolean;
  evidence_level: EvidenceLevel;
  evidence_kind: string;
  source_title: string;
  source_url: string;
  doi: string | null;
  sample_size: number | null;
  product_types: ProductType[];
  min_years: number | null;
  max_years: number | null;
  min_pack_years: number | null;
  max_pack_years: number | null;
  context_tags: string[];
  sort_order: number;
  last_verified_at: string;
};

export type Myth = {
  code: string;
  title: string;
  short_reframe: string;
  explanation: string;
  mechanism: string;
  evidence_level: EvidenceLevel;
  evidence_scope: string | null;
  source_title: string;
  source_url: string;
  doi: string | null;
  trigger_codes: string[];
  need_codes: string[];
  product_types: ProductType[];
  context_tags: string[];
  replacement_codes: string[];
  sort_order: number;
  last_verified_at: string;
};

export type MythState = {
  myth_code: string;
  relevance: 'unknown' | 'relevant' | 'not_relevant';
  seen_count: number;
  helpful_count: number;
  last_shown_at: string | null;
  dismissed_until: string | null;
};

export type Knowledge = {
  facts: Fact[];
  myths: Myth[];
  mythState: MythState[];
};

export type TogetherSummary = {
  days: number;
  participants_total: number;
  active_period: number;
  active_today: number;
  episodes_period: number;
  replacement_attempts: number;
  successful_responses: number;
  privacy_threshold: number;
  generated_at: string;
  baseline: {
    evaluable: number;
    below: number | null;
    near: number | null;
    above: number | null;
    median_delta_pct: number | null;
    suppressed: boolean;
  };
  mechanisms: Array<{
    mechanism: string;
    uses: number;
    users: number;
    avg_helpfulness: number | null;
  }>;
};

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase не настроен');
  return supabase;
}

export async function loadKnowledge(session: Session): Promise<Knowledge> {
  const supabase = client();
  const [factsRes, mythsRes, stateRes] = await Promise.all([
    supabase.from('facts_catalog')
      .select('code,title,short_text,full_text,category,benefit,evidence_level,evidence_kind,source_title,source_url,doi,sample_size,product_types,min_years,max_years,min_pack_years,max_pack_years,context_tags,sort_order,last_verified_at')
      .eq('published', true).order('sort_order'),
    supabase.from('myths_catalog')
      .select('code,title,short_reframe,explanation,mechanism,evidence_level,evidence_scope,source_title,source_url,doi,trigger_codes,need_codes,product_types,context_tags,replacement_codes,sort_order,last_verified_at')
      .eq('published', true).order('sort_order'),
    supabase.from('user_myth_state')
      .select('myth_code,relevance,seen_count,helpful_count,last_shown_at,dismissed_until')
      .eq('user_id', session.user.id),
  ]);
  if (factsRes.error) throw new Error(`Факты: ${factsRes.error.message}`);
  if (mythsRes.error) throw new Error(`Мифы: ${mythsRes.error.message}`);
  if (stateRes.error) throw new Error(`Мифы пользователя: ${stateRes.error.message}`);
  return {
    facts: (factsRes.data ?? []) as Fact[],
    myths: (mythsRes.data ?? []) as Myth[],
    mythState: (stateRes.data ?? []) as MythState[],
  };
}

export async function setMythRelevance(session: Session, mythCode: string, relevance: MythState['relevance']) {
  const supabase = client();
  const result = await supabase.from('user_myth_state').upsert({
    user_id: session.user.id,
    myth_code: mythCode,
    relevance,
  }, { onConflict: 'user_id,myth_code' });
  if (result.error) throw new Error(result.error.message);
}

export async function markMythShown(session: Session, current: MythState | undefined, mythCode: string) {
  const supabase = client();
  const result = await supabase.from('user_myth_state').upsert({
    user_id: session.user.id,
    myth_code: mythCode,
    relevance: current?.relevance ?? 'unknown',
    seen_count: (current?.seen_count ?? 0) + 1,
    helpful_count: current?.helpful_count ?? 0,
    last_shown_at: new Date().toISOString(),
    dismissed_until: current?.dismissed_until ?? null,
  }, { onConflict: 'user_id,myth_code' });
  if (result.error) throw new Error(result.error.message);
}

export async function loadTogether(days = 7): Promise<TogetherSummary> {
  const supabase = client();
  const result = await supabase.rpc('get_together_summary', { p_days: days });
  if (result.error) throw new Error(result.error.message);
  return result.data as TogetherSummary;
}

export function replacementMechanism(item: Replacement): string {
  const raw = item.eligibility?.mechanism;
  if (typeof raw === 'string' && raw) return raw;
  const fallback: Record<string, string> = {
    nrt: 'evidence_treatment', breath: 'breathing', movement: 'movement', food: 'food',
    orienting: 'attention', observation: 'attention', journal: 'reflection', contact: 'social',
    meaning: 'meaning', drink: 'drink', reward: 'reward', environment: 'context_change',
    music: 'sensory', rest: 'pause', ritual: 'ritual', grounding: 'grounding', oral: 'oral',
    manual: 'manual', focus: 'focus', pause: 'pause',
  };
  return fallback[item.category] ?? item.category ?? 'other';
}

function numericEligibility(item: Replacement, key: string, fallback: number) {
  const value = item.eligibility?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function candidateScore(data: Bootstrap, item: Replacement, product: ProductType, triggerCode: string, needCode: string, craving: number) {
  if (!item.product_types.includes(product)) return -10000;
  let score = 0;
  if (item.need_codes.includes(needCode)) score += 35;
  const mapped = data.triggerReplacementMap.find((m) => m.trigger_code === triggerCode && m.replacement_code === item.code);
  if (mapped) score += Math.max(0, 38 - mapped.priority * 2);

  const min = numericEligibility(item, 'intensity_min', 1);
  const max = numericEligibility(item, 'intensity_max', 10);
  if (craving >= min && craving <= max) score += 5;

  const actions = data.actions.filter((a) => a.replacement_code === item.code);
  const completed = actions.map((a) => data.episodes.find((e) => e.id === a.episode_id)).filter(Boolean);
  if (completed.length) {
    const helpful = completed.map((e) => e?.helpfulness).filter((v): v is number => typeof v === 'number');
    const delta = completed
      .filter((e) => typeof e?.craving_before === 'number' && typeof e?.craving_after === 'number')
      .map((e) => Number(e?.craving_before) - Number(e?.craving_after));
    if (helpful.length) score += helpful.reduce((a, b) => a + b, 0) / helpful.length * 5;
    if (delta.length) score += Math.max(-5, Math.min(12, delta.reduce((a, b) => a + b, 0) / delta.length * 2));
    const successful = completed.filter((e) => e?.outcome === 'successful_response').length;
    score += (successful / completed.length) * 10;
  }

  const recentUses = actions.filter((a) => Date.now() - new Date(a.occurred_at).getTime() < 24 * 3600_000).length;
  score -= recentUses * 5;

  const evidence = String(item.eligibility?.evidence_level ?? 'C');
  if (evidence === 'A') score += craving >= 7 ? 8 : 3;
  if (evidence === 'B') score += 3;
  return score;
}

export function pickDiverseReplacements(data: Bootstrap, product: ProductType, triggerCode: string, needCode: string, craving: number): Replacement[] {
  const ranked = data.replacements
    .map((item) => ({ item, score: candidateScore(data, item, product, triggerCode, needCode, craving) }))
    .filter((x) => x.score > -1000)
    .sort((a, b) => b.score - a.score || a.item.sort_order - b.item.sort_order);

  const picked: Replacement[] = [];
  const mechanisms = new Set<string>();
  for (const row of ranked) {
    const mechanism = replacementMechanism(row.item);
    if (mechanisms.has(mechanism)) continue;
    picked.push(row.item);
    mechanisms.add(mechanism);
    if (picked.length === 3) return picked;
  }
  for (const row of ranked) {
    if (picked.some((x) => x.code === row.item.code)) continue;
    picked.push(row.item);
    if (picked.length === 3) break;
  }
  return picked;
}

export function contextualMyth(knowledge: Knowledge, product: ProductType, triggerCode: string, needCode: string): Myth | null {
  const stateMap = new Map(knowledge.mythState.map((s) => [s.myth_code, s]));
  const now = Date.now();
  const candidates = knowledge.myths
    .filter((m) => m.product_types.includes(product))
    .filter((m) => {
      const state = stateMap.get(m.code);
      if (state?.relevance === 'not_relevant') return false;
      if (state?.dismissed_until && new Date(state.dismissed_until).getTime() > now) return false;
      return true;
    })
    .map((myth) => {
      const state = stateMap.get(myth.code);
      let score = 0;
      if (myth.trigger_codes.includes(triggerCode)) score += 12;
      if (myth.need_codes.includes(needCode)) score += 8;
      if (state?.relevance === 'relevant') score += 5;
      score -= Math.min(8, state?.seen_count ?? 0);
      if (state?.last_shown_at && now - new Date(state.last_shown_at).getTime() < 48 * 3600_000) score -= 20;
      return { myth, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.myth.sort_order - b.myth.sort_order);
  return candidates[0]?.myth ?? null;
}

export function factForMoment(knowledge: Knowledge, product: ProductType, recentCodes: string[] = []): Fact | null {
  const candidates = knowledge.facts.filter((f) => f.product_types.includes(product) && !recentCodes.includes(f.code));
  if (!candidates.length) return knowledge.facts.find((f) => f.product_types.includes(product)) ?? null;
  // Balanced deterministic rotation: risks and benefits alternate by day, while avoiding recently shown cards.
  const day = Math.floor(Date.now() / 86_400_000);
  const wantBenefit = day % 2 === 1;
  const balanced = candidates.filter((f) => f.benefit === wantBenefit);
  const pool = balanced.length ? balanced : candidates;
  return pool[day % pool.length] ?? null;
}

export function smokingExposure(data: Bootstrap) {
  const product = data.products.find((p) => p.product_type === 'cigarette');
  if (!product) return { startYear: null, years: null, packYears: null };
  const cigs = Number(product.baseline.cigarettes_per_day ?? 0);
  const startYear = Number(product.baseline.start_year ?? 0);
  const year = new Date().getFullYear();
  const validStart = startYear >= 1900 && startYear <= year ? startYear : null;
  const years = validStart ? Math.max(0, year - validStart) : null;
  const packYears = years !== null && cigs > 0 ? years * cigs / 20 : null;
  return { startYear: validStart, years, packYears };
}
