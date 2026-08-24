import type { Session } from '@supabase/supabase-js';
import type { ProductType } from './data';
import { getSupabase } from './supabase';

export type QuickUseDraft = {
  product: ProductType;
  triggerCode?: string;
  customTriggerText?: string;
  note?: string;
  cigaretteQuantity?: number;
  hookahSessionCount?: number;
  hookahDurationMinutes?: number;
  vapePuffs?: number;
  vapeDeviceType?: 'disposable' | 'pod' | 'refillable';
  costActualRub?: number;
};

export async function saveQuickUse(session: Session, draft: QuickUseDraft) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase не настроен');
  const userId = session.user.id;
  const completedAt = new Date().toISOString();
  const triggerCode = draft.triggerCode && draft.triggerCode !== 'other' ? draft.triggerCode : null;

  const episode = await supabase.from('episodes').insert({
    user_id: userId,
    target_product: draft.product,
    trigger_code: triggerCode,
    custom_trigger_text: draft.triggerCode === 'other' ? draft.customTriggerText || 'Другое' : null,
    outcome: 'nicotine_used',
    private_note: draft.note || null,
    completed_at: completedAt,
  }).select('id').single();
  if (episode.error || !episode.data) throw new Error(episode.error?.message || 'Не удалось сохранить эпизод');

  const event = await supabase.from('tobacco_events').insert({
    user_id: userId,
    episode_id: episode.data.id,
    product_type: draft.product,
    cigarette_quantity: draft.product === 'cigarette' ? draft.cigaretteQuantity ?? 1 : null,
    hookah_session_count: draft.product === 'hookah' ? draft.hookahSessionCount ?? 1 : null,
    hookah_duration_minutes: draft.product === 'hookah' ? draft.hookahDurationMinutes ?? null : null,
    vape_puffs: draft.product === 'vape' ? draft.vapePuffs ?? 10 : null,
    vape_device_type: draft.product === 'vape' ? draft.vapeDeviceType ?? null : null,
    cost_actual_rub: draft.costActualRub ?? null,
  });
  if (event.error) throw new Error(event.error.message);

  // Событие об употреблении пишет триггер alive_record_tobacco_event (20260817172000).
  // Отсюда не пишем ничего — иначе каждое употребление попало бы в воронку дважды.

  return episode.data.id as string;
}

// Implements PRIVACY_AND_DATA.md §10 ("пользователь должен иметь возможность
// экспортировать свои данные") / REQUIREMENTS.md gate #9. RLS already guarantees each
// query below only ever returns the caller's own rows (FR-V3-013/014) — this function
// does not add its own authorization, it relies on the same policies verified by
// supabase/tests/local/. Deliberately unlimited/unfiltered (unlike the bootstrap view's
// last-300/last-N-days windows) — an export must be complete, not an operational slice.
//
// This is data-layer only: no UI affordance (download button, confirmation screen) is
// wired up yet. Adding one is a separate, deliberately smaller change so it can be
// reviewed on its own before touching the account-deletion-adjacent UI.
export async function exportMyData(session: Session) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase не настроен');
  const userId = session.user.id;

  const [
    profile,
    settings,
    products,
    episodes,
    episodeActions,
    tobaccoEvents,
    meanings,
    links,
    checkins,
    supportState,
    ugcSubmissions,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('user_nicotine_products').select('*').eq('user_id', userId),
    supabase.from('episodes').select('*').eq('user_id', userId),
    supabase.from('episode_actions').select('*').eq('user_id', userId),
    supabase.from('tobacco_events').select('*').eq('user_id', userId),
    supabase.from('user_meanings').select('*').eq('user_id', userId),
    supabase.from('user_links').select('*').eq('user_id', userId),
    supabase.from('daily_checkins').select('*').eq('user_id', userId),
    supabase.from('daily_support_state').select('*').eq('user_id', userId),
    supabase.from('ugc_submissions').select('*').eq('source_user_id', userId),
  ]);

  const firstError = [
    profile, settings, products, episodes, episodeActions, tobaccoEvents,
    meanings, links, checkins, supportState, ugcSubmissions,
  ].find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    user_settings: settings.data,
    nicotine_products: products.data,
    episodes: episodes.data,
    episode_actions: episodeActions.data,
    tobacco_events: tobaccoEvents.data,
    user_meanings: meanings.data,
    user_links: links.data,
    daily_checkins: checkins.data,
    daily_support_state: supportState.data,
    ugc_submissions: ugcSubmissions.data,
  };
}

// Calls the `delete-account` Edge Function (supabase/functions/delete-account/).
// Deliberately does NOT delete anything client-side or via a public RPC — see that
// function's header comment for why the previous public SECURITY DEFINER RPC was
// removed (RISK-V3-002 / Security Advisor finding) and why this replaces it.
// Not wired to a UI button in this change — see exportMyData's comment above for why.
export async function deleteMyAccount(session: Session) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase не настроен');
  void session; // identity is re-verified server-side inside the Edge Function itself
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error('Не удалось удалить аккаунт');
  return true;
}
