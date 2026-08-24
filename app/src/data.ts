import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export type ProductType = 'cigarette' | 'hookah' | 'vape';
export type EpisodeOutcome = 'open' | 'successful_response' | 'nicotine_used' | 'abandoned';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed_at: string | null;
};

export type UserSettings = {
  user_id: string;
  food_replacements_enabled: boolean;
  nrt_enabled: boolean;
  fruit_cutoff_time: string;
  goal_text: string | null;
  evening_checkin_enabled: boolean;
};

export type NicotineProduct = {
  user_id: string;
  product_type: ProductType;
  role: 'target_dependency' | 'cessation_bridge';
  enabled: boolean;
  baseline: Record<string, unknown>;
  defaults: Record<string, unknown>;
};

export type Trigger = {
  code: string;
  title: string;
  description: string;
  product_types: ProductType[];
  sort_order: number;
};

export type Need = {
  code: string;
  title: string;
  description: string;
  sort_order: number;
};

export type Replacement = {
  code: string;
  title: string;
  instruction: string;
  category: string;
  need_codes: string[];
  product_types: ProductType[];
  eligibility: Record<string, unknown>;
  sort_order: number;
  icon: string | null;
  duration: string | null;
  summary: string | null;
  safety: string | null;
  // Production has carried these since before the repo knew about them, and nothing
  // displayed them until «Факты и Мифы». `mechanism` is why the action works,
  // `evidence_level` how well established that is, `evidence_scope` where the evidence
  // stops. Nullable because the majority of the catalog is honestly level C with no
  // citation, and an empty badge is the correct rendering of that.
  mechanism: string | null;
  evidence_level: string | null;
  evidence_scope: string | null;
  source_title: string | null;
  source_url: string | null;
};

export type TriggerReplacement = {
  trigger_code: string;
  replacement_code: string;
  tier: 'fast' | 'deeper' | 'meaning' | 'safe';
  priority: number;
};

export type Meaning = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
};

export type UserMeaning = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type UserLink = {
  id: string;
  user_id: string;
  title: string;
  situation: string;
  need_code: string | null;
  impulse: string | null;
  habitual_response: string | null;
  preferred_replacement_code: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type IdentityScript = {
  code: string;
  title: string;
  old_pattern: string;
  new_choice: string;
  sort_order: number;
};

export type Support = {
  code: string;
  support_type: 'daily' | 'success' | 'slip' | 'meaning';
  body: string;
  sort_order: number;
};

export type Reward = {
  code: string;
  metric: string;
  threshold: number;
  title: string;
  description: string;
  sort_order: number;
};

export type Episode = {
  id: string;
  user_id: string;
  target_product: ProductType;
  trigger_code: string | null;
  custom_trigger_text: string | null;
  need_code: string | null;
  craving_before: number | null;
  craving_after: number | null;
  outcome: EpisodeOutcome | null;
  helpfulness: number | null;
  private_note: string | null;
  started_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

export type EpisodeAction = {
  id: string;
  user_id: string;
  episode_id: string;
  action_type: string;
  replacement_code: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
};

export type TobaccoEvent = {
  id: string;
  user_id: string;
  episode_id: string | null;
  product_type: ProductType;
  cigarette_quantity: number | null;
  hookah_session_count: number | null;
  hookah_duration_minutes: number | null;
  vape_puffs: number | null;
  vape_device_type: 'disposable' | 'pod' | 'refillable' | null;
  cost_actual_rub: number | null;
  occurred_at: string;
  deleted_at: string | null;
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  checkin_date: string;
  irritability: number | null;
  energy: number | null;
  recovery: number | null;
  owned_moment: string | null;
  strongest_link: string | null;
  tomorrow_plan: string | null;
};

export type Bootstrap = {
  profile: Profile;
  settings: UserSettings;
  products: NicotineProduct[];
  triggers: Trigger[];
  needs: Need[];
  replacements: Replacement[];
  triggerReplacementMap: TriggerReplacement[];
  meanings: Meaning[];
  userMeanings: UserMeaning[];
  userLinks: UserLink[];
  identityScripts: IdentityScript[];
  supports: Support[];
  rewards: Reward[];
  episodes: Episode[];
  actions: EpisodeAction[];
  tobaccoEvents: TobaccoEvent[];
  todayCheckin: DailyCheckin | null;
  knowledge: Knowledge;
};

// ---------------------------------------------------------------------------
// Доказательный слой и «Факты и Мифы»
// ---------------------------------------------------------------------------
// Всё это читается из таблиц, которые уже были в проде до того, как о них узнал
// репозиторий: facts_catalog, myths_catalog и колонки mechanism / evidence_level /
// evidence_scope / source_title / source_url на replacements_catalog. Права на чтение
// открывает 20260824120000, редакторский проход по тексту — 20260824130000,
// раскладку по экранам — 20260824140000.

export type EvidenceLevelCode = 'A' | 'B' | 'C';

/**
 * Что означает буква — и, отдельно, чего она не утверждает.
 *
 * Два поля, а не одно: бейдж, показывающий только силу доказательства, приглашает
 * прочитать больше, чем было измерено. `limit_ru` — та половина, которая удерживает
 * бейдж честным, и интерфейс не должен показывать одно без доступа к другому.
 *
 * Определения живут в коде, а не в таблице. В базе на карточках стоит голая буква, и
 * заводить ради трёх строк ещё один справочник — значит добавить в прод четвёртую
 * сущность там, где уже есть три словаря уровней. Текст меняется вместе с
 * интерфейсом, который его показывает, и приезжает тем же релизом.
 */
export type EvidenceLevel = {
  code: EvidenceLevelCode;
  rank: number;
  label_ru: string;
  claim_ru: string;
  limit_ru: string;
};

export const EVIDENCE_LEVELS: readonly EvidenceLevel[] = [
  {
    code: 'A',
    rank: 1,
    label_ru: 'Обзор или руководство',
    claim_ru:
      'Вывод систематического обзора или клинического руководства — самый надёжный уровень, доступный по этой теме.',
    limit_ru:
      'Надёжно установленное среднее по многим людям. Это не обещание конкретного результата лично тебе.',
  },
  {
    code: 'B',
    rank: 2,
    label_ru: 'Отдельные исследования',
    claim_ru:
      'Исследования есть, но они об отдельном эффекте или о состоянии в моменте, а не о самом отказе от курения.',
    limit_ru: 'Не доказывает, что это поможет бросить. Долгосрочный эффект не установлен.',
  },
  {
    code: 'C',
    rank: 3,
    label_ru: 'Эвристика ALIVE',
    claim_ru: 'Приём или наблюдение, собранное из практики и здравого смысла продукта.',
    limit_ru:
      'Исследованием не проверено. Работает или нет — покажет твоя собственная статистика в разделе «Путь».',
  },
];

/**
 * Источник карточки.
 *
 * Ссылка лежит прямо на строке каталога — так устроен весь контент в проде, включая
 * замены. Отдельная нормализованная библиография была бы аккуратнее, но она развела
 * бы репозиторий и базу ещё на одну сущность ради выигрыша, которого при одном
 * источнике на карточку просто нет.
 */
export type EvidenceSource = {
  title: string;
  url: string | null;
};

/**
 * Одна карточка «Фактов и Мифов».
 *
 * `kind` — полярность. У мифа `claim_ru` — это утверждение, которому продукт
 * возражает, и оно не должно попасть на экран так, чтобы его можно было прочитать как
 * позицию ALIVE. У факта `claim_ru` — то, что продукт утверждает сам.
 */
export type KnowledgeCard = {
  code: string;
  kind: 'fact' | 'myth';
  /** Заголовок: у факта — утверждение, у мифа — само убеждение. */
  claim_ru: string;
  /** Что известно. */
  known_ru: string;
  /** Что это меняет для тебя, сегодня. */
  changes_ru: string;
  /** Механизм, детали и границы — то, что скрыто до раскрытия карточки. */
  detail_ru: string;
  evidence_level: EvidenceLevelCode;
  product_types: ProductType[];
  surfaces: KnowledgeSurface[];
  sort_order: number;
  sources: EvidenceSource[];
};

export type KnowledgeSurface = 'flow' | 'links' | 'today' | 'public';

export type KnowledgeTriggerLink = {
  knowledge_code: string;
  trigger_code: string;
  sort_order: number;
};

export type Knowledge = {
  levels: readonly EvidenceLevel[];
  cards: KnowledgeCard[];
  cardTriggers: KnowledgeTriggerLink[];
};

/**
 * Состояние, к которому откатываемся, если слой не загрузился.
 *
 * Пустое, а не частичное: каждый селектор трактует «нет данных» как «ничего не
 * показывать», поэтому неудачный запрос стоит читателю бейджа и никогда не блокирует
 * экран, за которым он пришёл. Уровни остаются — они не из сети.
 */
export const EMPTY_KNOWLEDGE: Knowledge = {
  levels: EVIDENCE_LEVELS,
  cards: [],
  cardTriggers: [],
};

type FactRow = {
  code: string;
  title: string;
  short_text: string;
  full_text: string;
  changes_ru: string;
  evidence_level: string;
  product_types: string[] | null;
  surfaces: string[] | null;
  sort_order: number;
  source_title: string | null;
  source_url: string | null;
};

type MythRow = {
  code: string;
  title: string;
  short_reframe: string;
  explanation: string;
  changes_ru: string;
  evidence_level: string;
  product_types: string[] | null;
  surfaces: string[] | null;
  trigger_codes: string[] | null;
  sort_order: number;
  source_title: string | null;
  source_url: string | null;
};

function levelCode(value: string | null | undefined): EvidenceLevelCode {
  return value === 'A' || value === 'B' ? value : 'C';
}

function sourceOf(title: string | null, url: string | null): EvidenceSource[] {
  if (!title) return [];
  return [{ title, url }];
}

function surfacesOf(value: string[] | null): KnowledgeSurface[] {
  const known: KnowledgeSurface[] = ['flow', 'links', 'today', 'public'];
  return (value ?? []).filter((item): item is KnowledgeSurface =>
    known.includes(item as KnowledgeSurface),
  );
}

/**
 * Читает «Факты и Мифы» из двух редакционных таблиц.
 *
 * Персональных данных здесь нет, обе таблицы открыты и для anon, поэтому вызов один и
 * тот же до и после входа. Обе таблицы приводятся к общей форме карточки прямо здесь:
 * дальше по коду разница между фактом и мифом — это одно поле `kind`, а не две ветки.
 */
export async function loadKnowledge(): Promise<Knowledge> {
  const supabase = requireClient();
  const [factsRes, mythsRes] = await Promise.all([
    supabase
      .from('facts_catalog')
      .select(
        'code,title,short_text,full_text,changes_ru,evidence_level,product_types,surfaces,sort_order,source_title,source_url',
      )
      .eq('published', true)
      .order('sort_order'),
    supabase
      .from('myths_catalog')
      .select(
        'code,title,short_reframe,explanation,changes_ru,evidence_level,product_types,surfaces,trigger_codes,sort_order,source_title,source_url',
      )
      .eq('published', true)
      .order('sort_order'),
  ]);

  const facts = ((factsRes.data ?? []) as FactRow[]).map<KnowledgeCard>((row) => ({
    code: row.code,
    kind: 'fact',
    claim_ru: row.title,
    known_ru: row.short_text,
    changes_ru: row.changes_ru,
    detail_ru: row.full_text,
    evidence_level: levelCode(row.evidence_level),
    product_types: (row.product_types ?? []) as ProductType[],
    surfaces: surfacesOf(row.surfaces),
    sort_order: row.sort_order,
    sources: sourceOf(row.source_title, row.source_url),
  }));

  const mythRows = (mythsRes.data ?? []) as MythRow[];
  const myths = mythRows.map<KnowledgeCard>((row) => ({
    code: row.code,
    kind: 'myth',
    claim_ru: row.title,
    known_ru: row.short_reframe,
    changes_ru: row.changes_ru,
    detail_ru: row.explanation,
    evidence_level: levelCode(row.evidence_level),
    product_types: (row.product_types ?? []) as ProductType[],
    surfaces: surfacesOf(row.surfaces),
    sort_order: row.sort_order,
    sources: sourceOf(row.source_title, row.source_url),
  }));

  // Привязка карточки к триггеру живёт в массиве на строке мифа. Массив не умеет
  // иметь внешний ключ, поэтому 20260824130000 отдельно проверяет, что ни один код
  // в нём не висит в пустоту — иначе карточка просто перестала бы находиться, и
  // заметить это было бы нечем.
  const cardTriggers: KnowledgeTriggerLink[] = mythRows.flatMap((row) =>
    (row.trigger_codes ?? []).map((trigger_code, index) => ({
      knowledge_code: row.code,
      trigger_code,
      sort_order: index,
    })),
  );

  return {
    levels: EVIDENCE_LEVELS,
    cards: [...facts, ...myths].sort((a, b) => a.sort_order - b.sort_order),
    cardTriggers,
  };
}

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase не настроен');
  return supabase;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${label}: пустой ответ`);
  return result.data;
}

export async function loadBootstrap(session: Session): Promise<Bootstrap> {
  const supabase = requireClient();
  const userId = session.user.id;
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [
    profileRes,
    settingsRes,
    productsRes,
    triggersRes,
    needsRes,
    replacementsRes,
    mapRes,
    meaningsRes,
    userMeaningsRes,
    userLinksRes,
    identityRes,
    supportsRes,
    rewardsRes,
    episodesRes,
    actionsRes,
    tobaccoRes,
    checkinRes,
    knowledge,
  ] = await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url,onboarding_completed_at').eq('id', userId).single(),
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('user_nicotine_products').select('*').eq('user_id', userId).eq('enabled', true),
    supabase.from('triggers_catalog').select('code,title,description,product_types,sort_order').eq('published', true).order('sort_order'),
    supabase.from('needs_catalog').select('code,title,description,sort_order').eq('published', true).order('sort_order'),
    supabase.from('replacements_catalog').select('code,title,instruction,category,need_codes,product_types,eligibility,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,source_title,source_url').eq('published', true).order('sort_order'),
    supabase.from('trigger_replacement_map').select('trigger_code,replacement_code,tier,priority').order('priority'),
    supabase.from('meanings_catalog').select('id,title,body,sort_order').eq('published', true).order('sort_order'),
    supabase.from('user_meanings').select('id,user_id,title,body,active,sort_order,created_at').eq('user_id', userId).is('deleted_at', null).order('sort_order'),
    supabase.from('user_links').select('id,user_id,title,situation,need_code,impulse,habitual_response,preferred_replacement_code,active,sort_order,created_at').eq('user_id', userId).is('deleted_at', null).order('sort_order'),
    supabase.from('identity_scripts_catalog').select('code,title,old_pattern,new_choice,sort_order').eq('published', true).order('sort_order'),
    supabase.from('supports_catalog').select('code,support_type,body,sort_order').eq('published', true).order('sort_order'),
    supabase.from('rewards_catalog').select('code,metric,threshold,title,description,sort_order').eq('published', true).order('sort_order'),
    supabase.from('episodes').select('id,user_id,target_product,trigger_code,custom_trigger_text,need_code,craving_before,craving_after,outcome,helpfulness,private_note,started_at,completed_at,deleted_at').eq('user_id', userId).is('deleted_at', null).gte('started_at', since).order('started_at', { ascending: false }).limit(300),
    supabase.from('episode_actions').select('id,user_id,episode_id,action_type,replacement_code,payload,occurred_at').eq('user_id', userId).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(500),
    supabase.from('tobacco_events').select('id,user_id,episode_id,product_type,cigarette_quantity,hookah_session_count,hookah_duration_minutes,vape_puffs,vape_device_type,cost_actual_rub,occurred_at,deleted_at').eq('user_id', userId).is('deleted_at', null).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(500),
    supabase.from('daily_checkins').select('id,user_id,checkin_date,irritability,energy,recovery,owned_moment,strongest_link,tomorrow_plan').eq('user_id', userId).eq('checkin_date', today).maybeSingle(),
    // The knowledge layer is editorial and never personal, so it rides along with the
    // rest of the bootstrap. It resolves to EMPTY_KNOWLEDGE on failure: losing an
    // evidence badge is acceptable, losing the whole personal map because a catalog
    // query failed is not.
    loadKnowledge().catch(() => EMPTY_KNOWLEDGE),
  ]);

  return {
    profile: unwrap(profileRes as never, 'profile') as Profile,
    settings: unwrap(settingsRes as never, 'settings') as UserSettings,
    products: (productsRes.data ?? []) as NicotineProduct[],
    triggers: (triggersRes.data ?? []) as Trigger[],
    needs: (needsRes.data ?? []) as Need[],
    replacements: (replacementsRes.data ?? []) as Replacement[],
    triggerReplacementMap: (mapRes.data ?? []) as TriggerReplacement[],
    meanings: (meaningsRes.data ?? []) as Meaning[],
    userMeanings: (userMeaningsRes.data ?? []) as UserMeaning[],
    userLinks: (userLinksRes.data ?? []) as UserLink[],
    identityScripts: (identityRes.data ?? []) as IdentityScript[],
    supports: (supportsRes.data ?? []) as Support[],
    rewards: (rewardsRes.data ?? []) as Reward[],
    episodes: (episodesRes.data ?? []) as Episode[],
    actions: (actionsRes.data ?? []) as EpisodeAction[],
    tobaccoEvents: (tobaccoRes.data ?? []) as TobaccoEvent[],
    todayCheckin: (checkinRes.data ?? null) as DailyCheckin | null,
    knowledge,
  };
}

export type OnboardingDraft = {
  goalText: string;
  products: Array<{
    productType: ProductType;
    role: 'target_dependency' | 'cessation_bridge';
    baseline: Record<string, unknown>;
    defaults: Record<string, unknown>;
  }>;
};

export async function saveOnboarding(session: Session, draft: OnboardingDraft) {
  const supabase = requireClient();
  const userId = session.user.id;
  const now = new Date().toISOString();

  const settings = await supabase.from('user_settings').upsert({
    user_id: userId,
    goal_text: draft.goalText || null,
  });
  if (settings.error) throw new Error(settings.error.message);

  const removeOld = await supabase.from('user_nicotine_products').delete().eq('user_id', userId);
  if (removeOld.error) throw new Error(removeOld.error.message);

  if (draft.products.length) {
    const productRows = draft.products.map((item) => ({
      user_id: userId,
      product_type: item.productType,
      role: item.role,
      baseline: item.baseline,
      defaults: item.defaults,
      enabled: true,
    }));
    const insertProducts = await supabase.from('user_nicotine_products').insert(productRows);
    if (insertProducts.error) throw new Error(insertProducts.error.message);
  }

  const profile = await supabase.from('profiles').update({ onboarding_completed_at: now }).eq('id', userId);
  if (profile.error) throw new Error(profile.error.message);
}

export type GuidedEpisodeDraft = {
  product: ProductType;
  triggerCode: string;
  customTriggerText?: string;
  needCode: string;
  cravingBefore: number;
  cravingAfter: number | null;
  helpfulness: number | null;
  replacementCode: string | null;
  outcome: 'successful_response' | 'nicotine_used' | 'abandoned';
  note?: string;
  tobacco?: {
    cigaretteQuantity?: number;
    hookahSessionCount?: number;
    hookahDurationMinutes?: number;
    vapePuffs?: number;
    vapeDeviceType?: 'disposable' | 'pod' | 'refillable';
    costActualRub?: number;
  };
};

export async function saveGuidedEpisode(session: Session, draft: GuidedEpisodeDraft): Promise<string> {
  const supabase = requireClient();
  const userId = session.user.id;
  const completedAt = new Date().toISOString();
  const episodeRes = await supabase.from('episodes').insert({
    user_id: userId,
    target_product: draft.product,
    trigger_code: draft.triggerCode === 'other' ? null : draft.triggerCode,
    custom_trigger_text: draft.triggerCode === 'other' ? draft.customTriggerText || 'Другое' : null,
    need_code: draft.needCode || null,
    craving_before: draft.cravingBefore,
    craving_after: draft.cravingAfter,
    helpfulness: draft.helpfulness,
    outcome: draft.outcome,
    private_note: draft.note || null,
    completed_at: completedAt,
  }).select('id').single();
  if (episodeRes.error || !episodeRes.data) throw new Error(episodeRes.error?.message || 'Не удалось сохранить эпизод');
  const episodeId = episodeRes.data.id as string;

  if (draft.replacementCode) {
    const replacement = await supabase.from('episode_actions').insert({
      user_id: userId,
      episode_id: episodeId,
      action_type: draft.replacementCode.startsWith('nrt_') ? 'nrt' : 'replacement',
      replacement_code: draft.replacementCode,
      payload: {},
    });
    if (replacement.error) throw new Error(replacement.error.message);
  }

  if (draft.outcome === 'nicotine_used') {
    const tobacco = draft.tobacco ?? {};
    const event = await supabase.from('tobacco_events').insert({
      user_id: userId,
      episode_id: episodeId,
      product_type: draft.product,
      cigarette_quantity: draft.product === 'cigarette' ? tobacco.cigaretteQuantity ?? 1 : null,
      hookah_session_count: draft.product === 'hookah' ? tobacco.hookahSessionCount ?? 1 : null,
      hookah_duration_minutes: draft.product === 'hookah' ? tobacco.hookahDurationMinutes ?? null : null,
      vape_puffs: draft.product === 'vape' ? tobacco.vapePuffs ?? 10 : null,
      vape_device_type: draft.product === 'vape' ? tobacco.vapeDeviceType ?? null : null,
      cost_actual_rub: tobacco.costActualRub ?? null,
    });
    if (event.error) throw new Error(event.error.message);
  }

  return episodeId;
}

export async function deleteEpisode(session: Session, episodeId: string) {
  const supabase = requireClient();
  const userId = session.user.id;
  const deletedAt = new Date().toISOString();
  const episode = await supabase.from('episodes').update({ deleted_at: deletedAt }).eq('id', episodeId).eq('user_id', userId);
  if (episode.error) throw new Error(episode.error.message);
  const tobacco = await supabase.from('tobacco_events').update({ deleted_at: deletedAt }).eq('episode_id', episodeId).eq('user_id', userId);
  if (tobacco.error) throw new Error(tobacco.error.message);
}

export async function saveCheckin(session: Session, payload: Omit<DailyCheckin, 'id' | 'user_id'>) {
  const supabase = requireClient();
  const userId = session.user.id;
  const result = await supabase.from('daily_checkins').upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,checkin_date' });
  if (result.error) throw new Error(result.error.message);
}

export async function addMeaning(session: Session, title: string, body: string) {
  const supabase = requireClient();
  const result = await supabase.from('user_meanings').insert({
    user_id: session.user.id,
    title,
    body,
    active: true,
    sort_order: 100,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function updateMeaning(session: Session, id: string, patch: Partial<Pick<UserMeaning, 'title' | 'body' | 'active'>>) {
  const supabase = requireClient();
  const result = await supabase.from('user_meanings').update(patch).eq('id', id).eq('user_id', session.user.id);
  if (result.error) throw new Error(result.error.message);
}

export async function deleteMeaning(session: Session, id: string) {
  const supabase = requireClient();
  const result = await supabase.from('user_meanings').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
  if (result.error) throw new Error(result.error.message);
}

export async function submitMeaning(session: Session, meaning: UserMeaning) {
  const supabase = requireClient();
  const result = await supabase.from('ugc_submissions').insert({
    source_user_id: session.user.id,
    source_type: 'meaning',
    source_entity_id: meaning.id,
    content_snapshot: { title: meaning.title, body: meaning.body },
    attribution_allowed: false,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function addLink(session: Session, payload: Omit<UserLink, 'id' | 'user_id' | 'active' | 'sort_order' | 'created_at'>) {
  const supabase = requireClient();
  const result = await supabase.from('user_links').insert({
    ...payload,
    user_id: session.user.id,
    active: true,
    sort_order: 100,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function deleteLink(session: Session, id: string) {
  const supabase = requireClient();
  const result = await supabase.from('user_links').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
  if (result.error) throw new Error(result.error.message);
}

export async function submitLink(session: Session, link: UserLink) {
  const supabase = requireClient();
  const result = await supabase.from('ugc_submissions').insert({
    source_user_id: session.user.id,
    source_type: 'link',
    source_entity_id: link.id,
    content_snapshot: {
      title: link.title,
      situation: link.situation,
      need_code: link.need_code,
      impulse: link.impulse,
      habitual_response: link.habitual_response,
      preferred_replacement_code: link.preferred_replacement_code,
    },
    attribution_allowed: false,
  });
  if (result.error) throw new Error(result.error.message);
}

export function productLabel(product: ProductType) {
  if (product === 'cigarette') return 'Сигареты';
  if (product === 'hookah') return 'Кальян';
  return 'Электронка';
}

export function eventAliveUnits(event: TobaccoEvent) {
  if (event.product_type === 'cigarette') return Number(event.cigarette_quantity ?? 0);
  if (event.product_type === 'hookah') return Number(event.hookah_session_count ?? 0) * 10;
  return Number(event.vape_puffs ?? 0) * 0.1;
}

export function baselineDailyUnits(products: NicotineProduct[]) {
  return products.reduce((sum, product) => {
    const baseline = product.baseline ?? {};
    if (product.product_type === 'cigarette') return sum + Number(baseline.cigarettes_per_day ?? 0);
    if (product.product_type === 'hookah') return sum + (Number(baseline.sessions_per_week ?? 0) / 7) * 10;
    return sum + Number(baseline.puffs_per_day ?? 0) * 0.1;
  }, 0);
}

export function baselineDailyCost(products: NicotineProduct[]) {
  return products.reduce((sum, product) => {
    const baseline = product.baseline ?? {};
    const defaults = product.defaults ?? {};
    if (product.product_type === 'cigarette') {
      const daily = Number(baseline.cigarettes_per_day ?? 0);
      const packPrice = Number(defaults.pack_price_rub ?? baseline.pack_price_rub ?? 0);
      const packSize = Number(defaults.pack_size ?? baseline.pack_size ?? 20) || 20;
      return sum + (daily / packSize) * packPrice;
    }
    if (product.product_type === 'hookah') {
      const weekly = Number(baseline.sessions_per_week ?? 0);
      const cost = Number(defaults.hookah_default_price_rub ?? baseline.typical_cost_rub ?? 2500);
      return sum + (weekly / 7) * cost;
    }
    const puffs = Number(baseline.puffs_per_day ?? 0);
    const claimed = Number(defaults.claimed_puffs ?? 0);
    const price = Number(defaults.consumable_price_rub ?? 0);
    return sum + (claimed > 0 ? (puffs / claimed) * price : 0);
  }, 0);
}

export function pickReplacements(data: Bootstrap, product: ProductType, triggerCode: string, needCode: string) {
  const byCode = new Map(data.replacements.map((item) => [item.code, item]));
  const mapped = data.triggerReplacementMap
    .filter((item) => item.trigger_code === triggerCode)
    .sort((a, b) => a.priority - b.priority)
    .map((item) => byCode.get(item.replacement_code))
    .filter((item): item is Replacement => Boolean(item));

  const hour = new Date().getHours();
  const cutoff = Number((data.settings.fruit_cutoff_time || '20:00').split(':')[0]);
  const eligible = (item: Replacement) => {
    if (!item.product_types.includes(product)) return false;
    if (!data.settings.food_replacements_enabled && item.category === 'food') return false;
    if (!data.settings.nrt_enabled && item.category === 'nrt') return false;
    if (item.code === 'fruit_portion' && hour >= cutoff) return false;
    if (item.category === 'nrt' && product !== 'cigarette') return false;
    return true;
  };

  const score = (item: Replacement) => {
    let value = 0;
    if (item.need_codes.includes(needCode)) value += 20;
    const uses = data.actions.filter((action) => action.replacement_code === item.code);
    const episodeById = new Map(data.episodes.map((episode) => [episode.id, episode]));
    const useful = uses
      .map((action) => episodeById.get(action.episode_id))
      .filter((episode): episode is Episode => Boolean(episode));
    if (useful.length) {
      const avg = useful.reduce((sum, episode) => sum + Number(episode.helpfulness ?? 0), 0) / useful.length;
      value += avg * 2;
    }
    return value;
  };

  const candidates = [...mapped, ...data.replacements.filter((item) => item.need_codes.includes(needCode)), ...data.replacements]
    .filter(eligible)
    .filter((item, index, array) => array.findIndex((other) => other.code === item.code) === index)
    .sort((a, b) => score(b) - score(a));

  return candidates.slice(0, 3);
}

export type PublicCatalog = {
  triggers: Trigger[];
  needs: Need[];
  replacements: Replacement[];
  triggerReplacementMap: TriggerReplacement[];
  meanings: Meaning[];
  identityScripts: IdentityScript[];
  knowledge: Knowledge;
};

/**
 * Loads only the published editorial catalog — no personal data, no session needed.
 *
 * Used by the pre-login screens so a visitor can see what ALIVE actually is before
 * deciding to sign in. Anonymous read access is granted by migration
 * 20260822120000_v3_public_catalog_read_for_anon.sql and is limited to `published`
 * rows of these catalogs; every table holding personal data stays authenticated-only
 * and is asserted unreadable for `anon` by supabase/tests/local.
 */
export async function loadPublicCatalog(): Promise<PublicCatalog> {
  const supabase = requireClient();
  const [triggersRes, needsRes, replacementsRes, mapRes, meaningsRes, identityRes, knowledge] = await Promise.all([
    supabase.from('triggers_catalog').select('code,title,description,product_types,sort_order').eq('published', true).order('sort_order'),
    supabase.from('needs_catalog').select('code,title,description,sort_order').eq('published', true).order('sort_order'),
    supabase.from('replacements_catalog').select('code,title,instruction,category,need_codes,product_types,eligibility,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,source_title,source_url').eq('published', true).order('sort_order'),
    supabase.from('trigger_replacement_map').select('trigger_code,replacement_code,tier,priority').order('priority'),
    supabase.from('meanings_catalog').select('id,title,body,sort_order').eq('published', true).order('sort_order'),
    supabase.from('identity_scripts_catalog').select('code,title,old_pattern,new_choice,sort_order').eq('published', true).order('sort_order'),
    loadKnowledge().catch(() => EMPTY_KNOWLEDGE),
  ]);

  return {
    triggers: (unwrap(triggersRes as never, 'triggers') as Trigger[]) ?? [],
    needs: (unwrap(needsRes as never, 'needs') as Need[]) ?? [],
    replacements: (unwrap(replacementsRes as never, 'replacements') as Replacement[]) ?? [],
    triggerReplacementMap: (unwrap(mapRes as never, 'triggerReplacementMap') as TriggerReplacement[]) ?? [],
    meanings: (unwrap(meaningsRes as never, 'meanings') as Meaning[]) ?? [],
    identityScripts: (unwrap(identityRes as never, 'identityScripts') as IdentityScript[]) ?? [],
    knowledge,
  };
}
