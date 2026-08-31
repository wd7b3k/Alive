import type { ProductType } from '../data';
import { getSupabase } from '../supabase';
import { CLIENT_ID, appVersion, getSessionId, getVisitorId, platformLabel } from './visitor';

/**
 * Запись продуктовых событий.
 *
 * Зачем это вообще есть: сейчас на вопрос «работает ли продукт» ответить нечем.
 * Сколько людей дошло до первого разобранного эпизода, где обрывается сценарий тяги,
 * какая замена реально помогает — всё это решается наугад. Таблица событий в базе
 * построена ещё в августе и стоит пустая: приложение в неё не пишет.
 *
 * Три правила, и все три — про то, чтобы измерение не навредило.
 *
 * 1. Ничего не ждёт. Ни один вызов отсюда не await'ится в интерфейсе и не может
 *    задержать экран. Человек в момент тяги ждёт кнопку, а не сетевой запрос
 *    аналитики.
 *
 * 2. Ничего не ломает. Любая ошибка гасится здесь. Аналитика, уронившая сценарий
 *    отказа от курения, — худший возможный размен.
 *
 * 3. Никакого свободного текста. В событие попадают только коды из каталогов, числа и
 *    короткие технические строки. Приватная заметка, произвольный ввод, название
 *    собственного триггера человека сюда не попадают — не по договорённости, а потому
 *    что sanitizeMetadata их выбрасывает.
 */

export type FunnelStage =
  'landing' | 'signed_in' | 'onboarded' | 'first_episode' | 'repeat_episode';

export type AnalyticsEvent = {
  /** Что произошло. Короткий стабильный код, snake_case. */
  event_type: string;
  funnel_stage?: FunnelStage;
  /** Экран: 'today' | 'links' | 'flow' | 'knowledge' | 'together' | ... */
  surface?: string;
  product_type?: ProductType;
  trigger_code?: string;
  replacement_code?: string;
  outcome?: string;
  reason_code?: string;
  duration_ms?: number;
  numeric_value?: number;
  metadata?: Record<string, unknown>;
  episode_id?: string;
  action_id?: string;
  tobacco_event_id?: string;
};

/**
 * Общий контекст: кто, в каком заходе, на какой сборке. Собирается здесь, а не на месте
 * вызова — иначе половина событий приедет без версии, и «сломалось после релиза» снова
 * станет ощущением вместо факта.
 */
function ambient() {
  return {
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    app_version: appVersion(),
    platform: platformLabel(),
    client_ts: new Date().toISOString(),
  };
}

/** Длиннее этого строка в metadata считается текстом человека и выбрасывается. */
const MAX_METADATA_STRING = 64;
/** Больше этого числа ключей — почти наверняка кто-то сложил в событие целый объект. */
const MAX_METADATA_KEYS = 12;

/**
 * Оставляет только то, что заведомо не является текстом человека.
 *
 * Пропускаются короткие строки, числа и булевы значения. Всё остальное — вложенные
 * объекты, массивы, длинные строки — выбрасывается молча: событие с потерянным полем
 * лучше, чем событие с чужой заметкой внутри.
 */
export function sanitizeMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!input) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(output).length >= MAX_METADATA_KEYS) break;
    if (typeof value === 'number' && Number.isFinite(value)) output[key] = value;
    else if (typeof value === 'boolean') output[key] = value;
    else if (typeof value === 'string' && value.length > 0 && value.length <= MAX_METADATA_STRING) {
      output[key] = value;
    }
  }
  return output;
}

/**
 * Кладёт одно событие. Ничего не возвращает и никогда не бросает.
 *
 * `userId` передаётся явно, а не вычитывается из сессии внутри: политика в базе требует
 * `auth.uid() = user_id`, и вызов без пользователя всё равно был бы отклонён. Явный
 * аргумент делает это видимым на месте вызова.
 */
export function trackEvent(userId: string | null | undefined, event: AnalyticsEvent): void {
  if (!userId) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const row = {
    ...ambient(),
    user_id: userId,
    event_type: event.event_type,
    funnel_stage: event.funnel_stage ?? null,
    surface: event.surface ?? null,
    product_type: event.product_type ?? null,
    trigger_code: event.trigger_code ?? null,
    replacement_code: event.replacement_code ?? null,
    outcome: event.outcome ?? null,
    reason_code: event.reason_code ?? null,
    duration_ms: event.duration_ms ?? null,
    numeric_value: event.numeric_value ?? null,
    metadata: sanitizeMetadata(event.metadata),
    episode_id: event.episode_id ?? null,
    action_id: event.action_id ?? null,
    tobacco_event_id: event.tobacco_event_id ?? null,
  };

  void supabase
    .from('analytics_events')
    .insert(row)
    .then(undefined, () => {
      // Молча. См. правило 2 выше.
    });
}

/**
 * Кладёт запись об ошибке.
 *
 * Работает и без сессии: до входа приложение тоже ломается, и именно эти поломки дороже
 * всего — человек уходит, не начав, и об этом никто не узнаёт.
 *
 * Отпечаток, а не текст: сообщение об ошибке умеет утаскивать за собой пользовательские
 * данные (значение поля, кусок ввода), отпечаток — нет, а сгруппировать по нему можно
 * так же хорошо.
 */
export function trackError(input: {
  userId?: string | null;
  surface: string;
  errorType: string;
  errorCode?: string | null;
  fingerprint?: string | null;
  durationMs?: number | null;
}): void {
  const supabase = getSupabase();
  if (!supabase) return;
  void supabase
    .from('system_errors')
    .insert({
      user_id: input.userId ?? null,
      // `client` — чей это фронт, `surface` — где внутри него сломалось. Пока фронт один,
      // это один и тот же вопрос; с появлением бота они разойдутся, и без метки всплеск
      // ошибок будет невозможно отнести к виновнику.
      client: CLIENT_ID,
      surface: input.surface.slice(0, 64),
      error_type: input.errorType.slice(0, 64),
      error_code: input.errorCode ? input.errorCode.slice(0, 64) : null,
      message_fingerprint: input.fingerprint ? input.fingerprint.slice(0, 64) : null,
      duration_ms: input.durationMs ?? null,
    })
    .then(undefined, () => {
      // Молча.
    });
}

/**
 * Событие от того, кто ещё не вошёл.
 *
 * Идёт через функцию в базе, а не прямой вставкой: политика на `analytics_events`
 * требует `auth.uid() = user_id`, и обойти её вставкой невозможно — что правильно.
 * Функция приписывает такому событию `user_id = null` независимо от того, что прислал
 * клиент, поэтому открытая наружу точка записи не может назвать человека.
 */
export function trackAnonEvent(event: {
  event_type: string;
  surface?: string;
  funnel_stage?: FunnelStage;
  metadata?: Record<string, unknown>;
}): void {
  const supabase = getSupabase();
  const context = ambient();
  if (!supabase || !context.visitor_id) return;

  void supabase
    .rpc('alive_record_anon_event', {
      p_visitor: context.visitor_id,
      p_session: context.session_id,
      p_event_type: event.event_type,
      p_surface: event.surface ?? null,
      p_funnel_stage: event.funnel_stage ?? null,
      p_app_version: context.app_version,
      p_platform: context.platform,
      p_metadata: sanitizeMetadata(event.metadata),
    })
    .then(undefined, () => {
      // Молча. См. правило 2 выше.
    });
}
