import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  EVIDENCE_LEVELS,
  type EvidenceLevel,
  type EvidenceLevelCode,
} from './domain/evidence-levels';

export type ProductType = 'cigarette' | 'hookah' | 'vape';
export type EpisodeOutcome = 'open' | 'successful_response' | 'nicotine_used' | 'abandoned';

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed_at: string | null;
  /**
   * 'participant' | 'admin'. Ставится не приложением, а миграцией 20260817182500 по
   * закрытому allowlist в схеме private. Здесь роль решает только, показывать ли
   * ссылку на служебный раздел: доступ решает база.
   */
  role: string;
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
  /** Источник из общей библиографии. Пустой массив — честное состояние эвристики уровня C. */
  sources: EvidenceSource[];
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

/**
 * Карточка из общей библиотеки «Смыслов».
 *
 * Отличается от старого `meanings_catalog` тем, что несёт тип (цель / ценность /
 * направление), вопрос для размышления и контекстные теги — то есть то, что
 * позволяет разделу не быть списком одинаковых плиток.
 */
export type Goal = {
  code: string;
  goal_type: 'цель' | 'ценность' | 'направление';
  title_ru: string;
  body_ru: string;
  reflection_prompt_ru: string | null;
  context_tags: string[];
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
  goals: Goal[];
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
  awareness: AwarenessCard[];
};

// ---------------------------------------------------------------------------
// Доказательный слой и «Факты и Мифы»
// ---------------------------------------------------------------------------
// Всё это читается из таблиц, которые уже были в проде до того, как о них узнал
// репозиторий: facts_catalog, myths_catalog и колонки mechanism / evidence_level /
// evidence_scope / source_title / source_url на replacements_catalog. Права на чтение
// открывает 20260824120000, редакторский проход по тексту — 20260824130000,
// раскладку по экранам — 20260824140000.



// Уровни переехали в `domain/evidence-levels.ts` — модуль без зависимостей, потому что
// те же строки нужны статическим страницам карточек, а `data.ts` тянет клиент Supabase.
// Реэкспорт оставлен, чтобы не переписывать два десятка мест импорта.
export { EVIDENCE_LEVELS, type EvidenceLevel, type EvidenceLevelCode };

/**
 * Источник карточки — строка общей библиографии.
 *
 * До 20260825140000 ссылка лежала прямо на карточке, и один и тот же документ был
 * записан в трёх местах: на факте, на мифе и на замене. Теперь источник один, а
 * каталоги ссылаются на него внешним ключом: умершую ссылку чинят в одном месте, и
 * исправление доходит до всех карточек сразу.
 *
 * `title` — русская подпись, её и читает человек. `original` — как документ называется
 * на самом деле; нужен, чтобы источник можно было найти, если ссылка всё-таки умрёт.
 */
export type EvidenceSource = {
  title: string;
  original: string | null;
  url: string | null;
  publication: string | null;
  year: number | null;
};

type SourceRow = {
  title_original: string | null;
  source_label_ru: string | null;
  url: string | null;
  publication: string | null;
  publication_date: string | null;
};

const SOURCE_COLUMNS = 'evidence_sources(title_original,source_label_ru,url,publication,publication_date)';

function toSource(row: SourceRow | SourceRow[] | null | undefined): EvidenceSource[] {
  const one = Array.isArray(row) ? row[0] : row;
  if (!one) return [];
  const title = one.source_label_ru || one.title_original;
  if (!title) return [];
  return [
    {
      title,
      original: one.title_original,
      url: one.url,
      publication: one.publication,
      year: one.publication_date ? Number(one.publication_date.slice(0, 4)) || null : null,
    },
  ];
}

/**
 * Карточка слоя микроосознанности.
 *
 * Это не третий вариант «Фактов». Слой r1 отличается от `facts_catalog` тремя вещами,
 * и каждая из них — причина, по которой он существует отдельно: у карточки есть
 * `motivation_ru` — обращение к человеку, а не к читателю; она привязана к
 * подтверждённому утверждению (`evidence_claims.status = 'проверено'`), а не к
 * отдельной ссылке; и у неё есть момент доставки, а не раздел.
 *
 * Момент — единственное, что решает, где карточка появится. Раскладывать её по
 * экранам «на глаз» нельзя: `awareness_content_contexts` для того и заведена.
 */
export type AwarenessMoment = 'микроосознанность' | 'после эпизода' | 'путь' | 'библиотека';

export type AwarenessCard = {
  code: string;
  kind: 'факт' | 'миф';
  title: string;
  hook: string;
  explanation: string;
  motivation: string | null;
  caveat: string;
  productTypes: ProductType[];
  contexts: { moment: AwarenessMoment; triggerCode: string | null; productType: ProductType | null; priority: number }[];
  confidence: string | null;
  limitations: string | null;
  sources: EvidenceSource[];
};

/**
 * Одна карточка «Фактов и Мифов».
 *
 * `kind` — полярность. У мифа `claim_ru` — это утверждение, которому продукт
 * возражает, и оно не должно попасть на экран так, чтобы его можно было прочитать как
 * позицию Habitoff. У факта `claim_ru` — то, что продукт утверждает сам.
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
  evidence_sources: SourceRow | SourceRow[] | null;
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
  evidence_sources: SourceRow | SourceRow[] | null;
};

function levelCode(value: string | null | undefined): EvidenceLevelCode {
  return value === 'A' || value === 'B' ? value : 'C';
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
        `code,title,short_text,full_text,changes_ru,evidence_level,product_types,surfaces,sort_order,${SOURCE_COLUMNS}`,
      )
      .eq('published', true)
      .order('sort_order'),
    supabase
      .from('myths_catalog')
      .select(
        `code,title,short_reframe,explanation,changes_ru,evidence_level,product_types,surfaces,trigger_codes,sort_order,${SOURCE_COLUMNS}`,
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
    sources: toSource(row.evidence_sources),
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
    sources: toSource(row.evidence_sources),
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

type AwarenessRow = {
  code: string;
  content_type: 'факт' | 'миф';
  title_ru: string;
  hook_ru: string;
  explanation_ru: string;
  motivation_ru: string | null;
  caveat_ru: string;
  product_types: string[] | null;
  awareness_content_contexts:
    | { moment: string; trigger_code: string | null; product_type: string | null; priority: number }[]
    | null;
  evidence_claims:
    | {
        evidence_level: string | null;
        limitations_ru: string | null;
        evidence_claim_sources: { evidence_sources: SourceRow | SourceRow[] | null }[] | null;
      }
    | null;
};

const AWARENESS_MOMENTS: AwarenessMoment[] = [
  'микроосознанность',
  'после эпизода',
  'путь',
  'библиотека',
];

/**
 * Загружает слой микроосознанности вместе с моментами доставки и доказательной базой.
 *
 * Читается только подтверждённое: `evidence_claims.status = 'проверено'` — то же
 * условие, по которому `alive_record_awareness_exposure` соглашается зафиксировать
 * показ. Если фильтровать здесь мягче, чем в базе, интерфейс покажет карточку, а
 * запись показа упадёт с ошибкой — и расхождение обнаружится не здесь, а в журнале.
 */
export async function loadAwareness(): Promise<AwarenessCard[]> {
  const supabase = requireClient();
  const { data } = await supabase
    .from('awareness_content')
    .select(
      'code,content_type,title_ru,hook_ru,explanation_ru,motivation_ru,caveat_ru,product_types,sort_order,' +
        'awareness_content_contexts(moment,trigger_code,product_type,priority),' +
        `evidence_claims!inner(evidence_level,limitations_ru,status,evidence_claim_sources(${SOURCE_COLUMNS}))`,
    )
    .eq('published', true)
    .eq('evidence_claims.status', 'проверено')
    .order('sort_order');

  return ((data ?? []) as unknown as AwarenessRow[]).map<AwarenessCard>((row) => ({
    code: row.code,
    kind: row.content_type,
    title: row.title_ru,
    hook: row.hook_ru,
    explanation: row.explanation_ru,
    motivation: row.motivation_ru,
    caveat: row.caveat_ru,
    productTypes: (row.product_types ?? []) as ProductType[],
    contexts: (row.awareness_content_contexts ?? [])
      .filter((ctx) => (AWARENESS_MOMENTS as string[]).includes(ctx.moment))
      .map((ctx) => ({
        moment: ctx.moment as AwarenessMoment,
        triggerCode: ctx.trigger_code,
        productType: ctx.product_type as ProductType | null,
        priority: ctx.priority,
      })),
    confidence: row.evidence_claims?.evidence_level ?? null,
    limitations: row.evidence_claims?.limitations_ru || null,
    sources: (row.evidence_claims?.evidence_claim_sources ?? []).flatMap((link) =>
      toSource(link.evidence_sources),
    ),
  }));
}

/**
 * Фиксирует показ карточки один раз за запуск сценария.
 *
 * Идемпотентность обеспечивает база: `alive_record_awareness_exposure` держит
 * advisory-lock на паре «человек + запуск» и возвращает уже созданный показ вместо
 * второго. Поэтому повторный вызов при перерисовке безопасен, а на ошибку здесь
 * сознательно не реагируем: несделанная запись показа не повод не показать карточку.
 */
export async function recordAwarenessExposure(
  contentCode: string,
  productType: ProductType,
  triggerCode: string | null,
  flowId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.rpc('alive_record_awareness_exposure', {
    p_content_code: contentCode,
    p_product_type: productType,
    p_trigger_code: triggerCode,
    p_flow_id: flowId,
  });
}

// ---------------------------------------------------------------------------
// «Вместе» и здоровье продукта
// ---------------------------------------------------------------------------
// Обе величины считаются в базе функциями security definer и приезжают сюда готовыми.
// Прав читать чужие эпизоды у клиента нет, поэтому здесь физически нечего показать,
// кроме агрегата.

/**
 * Сводка «Вместе» — то, что возвращает get_together_summary (20260816211200).
 *
 * `baseline.suppressed` — не техническая деталь, а обещание: пока людей с посчитанным
 * исходным уровнем меньше `privacy_threshold`, разбивка не показывается вовсе. «Один
 * человек ниже своего baseline» в маленькой группе указывает на конкретного человека.
 */
export type TogetherSummary = {
  days: number;
  participants_total: number;
  active_period: number;
  active_today: number;
  episodes_period: number;
  replacement_attempts: number;
  successful_responses: number;
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
  privacy_threshold: number;
  generated_at: string;
};

export type ProductHealth = {
  period_days: number;
  people_total: number;
  people_new: number;
  people_active: number;
  people_returning: number;
  people_first_episode: number;
  episodes_total: number;
  episodes_resolved: number;
  resolved_share: number | null;
  people_improving: number;
  errors_total: number;
  error_surfaces: string;
};

/** Сводка по группе. Null, если функция недоступна — раздел тогда молчит, а не выдумывает. */
export async function loadTogetherSummary(days = 7): Promise<TogetherSummary | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_together_summary', { p_days: days });
  if (error || !data) return null;
  return data as TogetherSummary;
}

/** Здоровье продукта. База откажет вызывающему без прав — тогда возвращается null. */
/** Строка витрины метрик гипотез. `computable = false` — данных для метрики нет. */
export type HypothesisMetric = {
  hypothesis: string;
  metric: string;
  value: number | null;
  unit: string | null;
  observations: number;
  computable: boolean;
  note: string | null;
};

/**
 * Метрики гипотез за окно.
 *
 * Отдельный вызов, а не поле в сводке здоровья: это разные вопросы. «Живёт ли продукт» —
 * операционный, «подтверждается ли гипотеза» — исследовательский, и смешивать их на одном
 * экране значит принимать решение о продолжении эксперимента по числу ошибок.
 */
export async function loadHypothesisMetrics(days = 14): Promise<HypothesisMetric[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_hypothesis_metrics', { days });
  if (error || !data) return null;
  return (data as HypothesisMetric[]) ?? null;
}

export async function loadProductHealth(days = 30): Promise<ProductHealth | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_product_health', { days });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as ProductHealth) ?? null;
}

type ReplacementRow = Omit<Replacement, 'sources'> & {
  evidence_sources: SourceRow | SourceRow[] | null;
};

/**
 * Приводит строку каталога замен к доменной форме: встроенный источник разворачивается
 * в тот же тип, что и у карточек «Фактов». Один способ читать источник на весь продукт.
 */
function toReplacements(rows: unknown): Replacement[] {
  return ((rows ?? []) as ReplacementRow[]).map(({ evidence_sources, ...rest }) => ({
    ...rest,
    sources: toSource(evidence_sources),
  }));
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
    goalsRes,
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
    awareness,
  ] = await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_url,onboarding_completed_at,role').eq('id', userId).single(),
    supabase.from('user_settings').select('*').eq('user_id', userId).single(),
    supabase.from('user_nicotine_products').select('*').eq('user_id', userId).eq('enabled', true),
    supabase.from('triggers_catalog').select('code,title,description,product_types,sort_order').eq('published', true).order('sort_order'),
    supabase.from('needs_catalog').select('code,title,description,sort_order').eq('published', true).order('sort_order'),
    supabase.from('replacements_catalog').select('code,title,instruction,category,need_codes,product_types,eligibility,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,' + SOURCE_COLUMNS).eq('published', true).order('sort_order'),
    supabase.from('trigger_replacement_map').select('trigger_code,replacement_code,tier,priority').order('priority'),
    supabase.from('meanings_catalog').select('id,title,body,sort_order').eq('published', true).order('sort_order'),
    supabase.from('goals_catalog').select('code,goal_type,title_ru,body_ru,reflection_prompt_ru,context_tags,sort_order').eq('published', true).order('sort_order'),
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
    // Слой микроосознанности так же редакционен и так же необязателен: если запрос не
    // прошёл, человек теряет одну карточку на «Пути», а не персональную карту.
    loadAwareness().catch(() => []),
  ]);

  return {
    profile: unwrap(profileRes as never, 'profile') as Profile,
    settings: unwrap(settingsRes as never, 'settings') as UserSettings,
    products: (productsRes.data ?? []) as NicotineProduct[],
    triggers: (triggersRes.data ?? []) as Trigger[],
    needs: (needsRes.data ?? []) as Need[],
    replacements: toReplacements(replacementsRes.data),
    triggerReplacementMap: (mapRes.data ?? []) as TriggerReplacement[],
    meanings: (meaningsRes.data ?? []) as Meaning[],
    goals: (goalsRes.data ?? []) as Goal[],
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
    awareness,
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

  // Событие «настройка завершена» пишет сама база: триггер alive_record_onboarding_completed
  // (20260817172000). Дублировать его отсюда значило бы удваивать каждый шаг воронки.
}

export type GuidedEpisodeDraft = {
  product: ProductType;
  triggerCode: string;
  customTriggerText?: string;
  needCode: string;
  /** Null — человек не трогал ползунок. Это не то же самое, что «тяга ноль». */
  cravingBefore: number | null;
  cravingAfter: number | null;
  helpfulness: number | null;
  replacementCode: string | null;
  /** Коды замен в том порядке, в каком их показали. Пусто — экран ответа не открывался. */
  offeredReplacements?: string[];
  /** Подбор опирался на личную историю. Null — экран ответа не открывался. */
  offerPersonalized?: boolean | null;
  offerReason?: string | null;
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
    // Что человеку показали, а не только что он выбрал. Без этого H-ALIVE-002 —
    // «персонализированный подбор лучше общего каталога» — не считается никогда:
    // ранжирование живёт в клиенте и нигде не оставляет следа. См. ADR-0006.
    offered_replacements: draft.offeredReplacements ?? [],
    offer_personalized: draft.offerPersonalized ?? null,
    offer_reason: draft.offerReason ?? null,
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

  // Событие о завершённом эпизоде и о действии внутри него пишут триггеры
  // alive_record_episode_completed и alive_record_episode_action. Отсюда не пишем
  // ничего: два источника одного события дают двойную воронку.

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

export function eventHabitoffUnits(event: TobaccoEvent) {
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

/** Чем был подбор: личной историей или общим каталогом. */
export type OfferShape = { personalized: boolean; reason: 'personal_history' | 'catalog' };

/**
 * Опирался ли показанный подбор на личную историю.
 *
 * Определение узкое намеренно: в `pickReplacements` личный вес добавляется только тем
 * заменам, которые человек уже пробовал. Значит «персонализировано» — это ровно «среди
 * показанного есть то, что он уже пробовал». Более широкое определение («мы посмотрели
 * в историю») было бы правдой всегда и не разделяло бы ничего.
 */
export function describeOffer(data: Bootstrap, offered: Replacement[]): OfferShape {
  const tried = new Set(
    data.actions.map((action) => action.replacement_code).filter((code): code is string => Boolean(code)),
  );
  const personalized = offered.some((item) => tried.has(item.code));
  return { personalized, reason: personalized ? 'personal_history' : 'catalog' };
}

export type PublicCatalog = {
  triggers: Trigger[];
  needs: Need[];
  replacements: Replacement[];
  triggerReplacementMap: TriggerReplacement[];
  meanings: Meaning[];
  goals: Goal[];
  identityScripts: IdentityScript[];
  knowledge: Knowledge;
};

/**
 * Loads only the published editorial catalog — no personal data, no session needed.
 *
 * Used by the pre-login screens so a visitor can see what Habitoff actually is before
 * deciding to sign in. Anonymous read access is granted by migration
 * 20260822120000_v3_public_catalog_read_for_anon.sql and is limited to `published`
 * rows of these catalogs; every table holding personal data stays authenticated-only
 * and is asserted unreadable for `anon` by supabase/tests/local.
 */
export async function loadPublicCatalog(): Promise<PublicCatalog> {
  const supabase = requireClient();
  const [triggersRes, needsRes, replacementsRes, mapRes, meaningsRes, goalsRes, identityRes, knowledge] = await Promise.all([
    supabase.from('triggers_catalog').select('code,title,description,product_types,sort_order').eq('published', true).order('sort_order'),
    supabase.from('needs_catalog').select('code,title,description,sort_order').eq('published', true).order('sort_order'),
    supabase.from('replacements_catalog').select('code,title,instruction,category,need_codes,product_types,eligibility,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,' + SOURCE_COLUMNS).eq('published', true).order('sort_order'),
    supabase.from('trigger_replacement_map').select('trigger_code,replacement_code,tier,priority').order('priority'),
    supabase.from('meanings_catalog').select('id,title,body,sort_order').eq('published', true).order('sort_order'),
    supabase.from('goals_catalog').select('code,goal_type,title_ru,body_ru,reflection_prompt_ru,context_tags,sort_order').eq('published', true).order('sort_order'),
    supabase.from('identity_scripts_catalog').select('code,title,old_pattern,new_choice,sort_order').eq('published', true).order('sort_order'),
    loadKnowledge().catch(() => EMPTY_KNOWLEDGE),
  ]);

  return {
    triggers: (unwrap(triggersRes as never, 'triggers') as Trigger[]) ?? [],
    needs: (unwrap(needsRes as never, 'needs') as Need[]) ?? [],
    replacements: toReplacements(unwrap(replacementsRes as never, 'replacements')),
    triggerReplacementMap: (unwrap(mapRes as never, 'triggerReplacementMap') as TriggerReplacement[]) ?? [],
    meanings: (unwrap(meaningsRes as never, 'meanings') as Meaning[]) ?? [],
    goals: (unwrap(goalsRes as never, 'goals') as Goal[]) ?? [],
    identityScripts: (unwrap(identityRes as never, 'identityScripts') as IdentityScript[]) ?? [],
    knowledge,
  };
}
