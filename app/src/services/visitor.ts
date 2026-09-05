import { buildInfo } from '../env';
import { getSupabase } from '../supabase';

/**
 * Посетитель и сессия.
 *
 * Зачем: до сегодняшнего дня продукт не мог записать ни одного события до входа.
 * Из-за этого первый шаг воронки — «зашёл на сайт → зарегистрировался» — не считался
 * ничем. Счётчик видит визит и не знает, чем он кончился; база видит регистрацию и не
 * знает, откуда человек пришёл. Связывает их одна случайная строка в браузере.
 *
 * Что это **не** делает: не опознаёт человека, не читает адрес, не сохраняет IP.
 * Идентификатор посетителя — случайный, живёт в этом браузере и никуда больше не ведёт.
 * После регистрации он привязывается к аккаунту один раз — ради ответа на вопрос
 * «какие источники приводят людей, которые доходят до третьего эпизода», и ни для чего ещё.
 */

const VISITOR_KEY = 'habitoff:visitor:v1';
const SESSION_KEY = 'habitoff:session:v1';
const ATTRIBUTED_KEY = 'habitoff:visitor-attributed:v1';
/**
 * Пройденные этапы воронки — по одному ключу на человека.
 *
 * Первая редакция хранила всё одной строкой без имени человека, и это была ошибка с
 * дорогим следствием: второй человек в том же браузере не попадал в воронку вовсе. Не
 * «его цель не ушла» — его не было ни в целях, ни в собственном слое. Одна семья, один
 * ноутбук, один аккаунт на двоих — и половина участников пилота невидима.
 *
 * Ключ v2 включает идентификатор: у вошедшего — его `user_id`, у ещё не вошедшего —
 * идентификатор посетителя. Выход отметку не переносит, потому что переносить нечего:
 * у следующего человека другой ключ.
 */
const FUNNEL_PREFIX = 'habitoff:funnel:v2:';
/** Ключ первой редакции. Хранит имена этапов без человека и потому ничего не значит. */
const FUNNEL_KEY_V1 = 'habitoff:funnel:v1';
/** Пауза, после которой заход считается новым. Тридцать минут — общепринятая граница. */
const SESSION_IDLE_MS = 30 * 60 * 1000;

const SEARCH_HOSTS = [
  'yandex.',
  'google.',
  'bing.com',
  'duckduckgo.com',
  'mail.ru',
  'rambler.ru',
  'yahoo.',
];
const SOCIAL_HOSTS = [
  'vk.com',
  't.me',
  'telegram.',
  'ok.ru',
  'dzen.ru',
  'youtube.',
  'instagram.',
  'facebook.',
  'twitter.',
  'x.com',
  'pinterest.',
  'reddit.',
];

/** Любое хранилище может бросить: приватное окно, запрет на данные сайта, чужой домен. */
function readStore(store: Storage | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStore(store: Storage | undefined, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    /* Не смогли запомнить — значит, этот заход будет считаться отдельным. Не повод падать. */
  }
}

function dropStore(store: Storage | undefined, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    /* Не смогли убрать — не повод падать: это уборка, а не работа. */
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
  }
}

export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  let id = readStore(window.localStorage, VISITOR_KEY);
  if (!id) {
    id = newId();
    writeStore(window.localStorage, VISITOR_KEY, id);
  }
  return id;
}

/**
 * Отметить этап воронки пройденным ЭТИМ человеком. Возвращает `true` только в первый раз.
 *
 * Отметка существует ради одного — цели в кабинете. Цель означает «человек дошёл», а не
 * «компонент отрисовался»: без неё `onboarded` уходила бы при каждом открытии приложения
 * после настройки, и конверсия выросла бы в разы в сторону, которая выглядит как успех.
 *
 * Собственный слой этой отметкой НЕ управляется. Событие пишется всегда, а повторы
 * снимаются запросом — `distinct on (человек, этап)`. Так и должно быть: браузер знает
 * про свой `localStorage`, а про то, сколько раз человек дошёл до вехи, знает база.
 *
 * `subject` — тот, чей это путь: `user_id` у вошедшего, идентификатор посетителя у ещё
 * не вошедшего. Пусто — берётся посетитель.
 *
 * Хранилище может быть недоступно (приватное окно, запрет данных сайта). Тогда функция
 * честно отвечает `true` каждый раз: посчитать цель дважды лучше, чем не посчитать ни
 * разу.
 */
export function markFunnelStageOnce(stage: string, subject?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const owner = subject || getVisitorId();
  // Ни аккаунта, ни посетителя — значит хранилище недоступно целиком. Отмечать негде,
  // и молчать в этом случае значило бы потерять цель совсем.
  if (!owner) return true;

  const key = `${FUNNEL_PREFIX}${owner}`;
  const reached = (readStore(window.localStorage, key) ?? '').split(',').filter(Boolean);
  if (reached.includes(stage)) return false;
  reached.push(stage);
  writeStore(window.localStorage, key, reached.join(','));
  // Ключ первой редакции больше ничего не значит: он хранил этапы без человека.
  // Убирается при первой же отметке, чтобы не остался в браузерах навсегда.
  dropStore(window.localStorage, FUNNEL_KEY_V1);
  return true;
}

/**
 * Идентификатор захода. Новый — после получаса без действий, а не после закрытия вкладки:
 * человек в момент тяги открывает продукт и закрывает его через минуту, и три таких
 * открытия подряд — это один заход, а не три.
 */
export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = readStore(window.sessionStorage, SESSION_KEY);
  const now = Date.now();
  if (raw) {
    const [id, lastSeen] = raw.split('|');
    if (id && Number(lastSeen) > now - SESSION_IDLE_MS) {
      writeStore(window.sessionStorage, SESSION_KEY, `${id}|${now}`);
      return id;
    }
  }
  const id = newId();
  writeStore(window.sessionStorage, SESSION_KEY, `${id}|${now}`);
  return id;
}

/**
 * Какой это фронт. Не «на чём открыт» — это `platformLabel` — а «чей это клиент вообще».
 * Пока фронт один, разница незаметна; с появлением телеграм-бота и мобильного приложения
 * ошибки всех трёх сложатся в одну кучу, если их нечем различать. Значение совпадает с
 * `id` строки в `ops.components`, и по нему раздел мониторинга относит сигнал к фронту.
 */
export const CLIENT_ID = 'web';

export function platformLabel(): string {
  if (typeof window === 'undefined') return 'unknown';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(window.navigator.userAgent);
  return `${mobile ? 'mobile' : 'desktop'}${standalone ? '-installed' : '-web'}`;
}

export function appVersion(): string {
  return buildInfo.commit
    ? `${buildInfo.version}+${buildInfo.commit.slice(0, 7)}`
    : buildInfo.version;
}

type Attribution = {
  source_kind: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_host?: string;
  landing_path: string;
};

/**
 * Разбор источника делается один раз, при первом визите. Второй заход реферера уже
 * не помнит, а метки в адресе к тому времени обычно стёрты навигацией.
 */
export function readAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
    utm_term: params.get('utm_term') ?? undefined,
  };

  let referrerHost: string | undefined;
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== window.location.hostname) referrerHost = host;
    }
  } catch {
    referrerHost = undefined;
  }

  const host = referrerHost ?? '';
  let kind = 'direct';
  if (utm.utm_source || utm.utm_campaign) kind = 'campaign';
  else if (host && SEARCH_HOSTS.some((entry) => host.includes(entry))) kind = 'search';
  else if (host && SOCIAL_HOSTS.some((entry) => host.includes(entry))) kind = 'social';
  else if (host) kind = 'referral';

  return {
    source_kind: kind,
    ...utm,
    referrer_host: referrerHost,
    landing_path: window.location.pathname.slice(0, 128),
  };
}

/** Идентификатор клиента Метрики появляется позже первого кадра — её скрипт грузится асинхронно. */
function metrikaClientId(counterId: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const ym = (window as { ym?: (...args: unknown[]) => void }).ym;
    if (!ym || !counterId) return resolve(undefined);
    const timer = setTimeout(() => resolve(undefined), 3000);
    try {
      ym(Number(counterId), 'getClientID', (id: string) => {
        clearTimeout(timer);
        resolve(id || undefined);
      });
    } catch {
      clearTimeout(timer);
      resolve(undefined);
    }
  });
}

let touched = false;

/**
 * Отметить визит. Вызывается один раз при запуске приложения, ничего не ждёт и никогда
 * не бросает: аналитика, уронившая первый кадр, — худший возможный размен.
 */
export function touchVisitor(metrikaCounterId = ''): void {
  if (touched || typeof window === 'undefined') return;
  touched = true;

  const supabase = getSupabase();
  const visitor = getVisitorId();
  if (!supabase || !visitor) return;

  const isFirstTime = !readStore(window.localStorage, ATTRIBUTED_KEY);
  const attribution = isFirstTime ? readAttribution() : null;
  if (isFirstTime) writeStore(window.localStorage, ATTRIBUTED_KEY, '1');

  void metrikaClientId(metrikaCounterId).then((clientId) => {
    void supabase
      .rpc('alive_touch_visitor', {
        p_visitor: visitor,
        p_source_kind: attribution?.source_kind ?? null,
        p_utm_source: attribution?.utm_source ?? null,
        p_utm_medium: attribution?.utm_medium ?? null,
        p_utm_campaign: attribution?.utm_campaign ?? null,
        p_utm_content: attribution?.utm_content ?? null,
        p_utm_term: attribution?.utm_term ?? null,
        p_referrer_host: attribution?.referrer_host ?? null,
        p_landing_path: attribution?.landing_path ?? null,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        p_language: window.navigator.language ?? null,
        p_metrika_client_id: clientId ?? null,
      })
      .then(undefined, () => {
        /* Молча: см. правило в analytics.ts. */
      });
  });
}

/** Связать этот браузер с только что зарегистрировавшимся человеком. Ровно один раз. */
export function claimVisitor(): void {
  const supabase = getSupabase();
  const visitor = getVisitorId();
  if (!supabase || !visitor) return;
  void supabase.rpc('alive_claim_visitor', { p_visitor: visitor }).then(undefined, () => {});
}
