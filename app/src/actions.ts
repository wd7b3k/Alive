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

  return episode.data.id as string;
}
