import { publicEnv } from './env';

/**
 * Какими способами можно войти.
 *
 * Список спрашивается у самого Supabase — там же, где владелец включает провайдера.
 * Так и было с Google: он настраивался в одном месте и начинал работать, и добавлять
 * ради второго способа переменную окружения в Cloudflare было бы лишним шагом, о
 * котором легко забыть и потом полдня искать, почему кнопки нет.
 *
 * `VITE_AUTH_PROVIDERS` остаётся, но как исключение, а не как способ по умолчанию: если
 * окажется, что `/auth/v1/settings` не показывает кастомных провайдеров, список можно
 * задать руками, ничего не переписывая.
 */
export type AuthProvider = {
  id: string;
  label: string;
  /** Как назвать провайдера в «Открываю …». */
  opening: string;
};

const KNOWN: Record<string, Omit<AuthProvider, 'id'>> = {
  google: { label: 'Google', opening: 'Google' },
  'custom:yandex': { label: 'Яндекс', opening: 'Яндекс' },
  yandex: { label: 'Яндекс', opening: 'Яндекс' },
  'custom:vk': { label: 'VK ID', opening: 'VK ID' },
  'custom:mailru': { label: 'Mail.ru', opening: 'Mail.ru' },
  apple: { label: 'Apple', opening: 'Apple' },
};

/**
 * Порядок кнопок.
 *
 * Google первый, пока владелец не решит иначе: это единственный способ, которым уже
 * вошли живые люди, и менять его местами без причины — значит сбивать их. Всё, чего
 * здесь нет, идёт следом в том порядке, в каком пришло от Supabase.
 */
const ORDER = ['google', 'custom:yandex', 'yandex'];

/**
 * Не провайдеры входа: это способы, которые Habitoff не показывает кнопкой, и попадать в
 * список им нельзя, даже когда они включены в проекте.
 */
const NOT_A_BUTTON = new Set(['email', 'phone', 'anonymous_users']);

export const GOOGLE: AuthProvider = { id: 'google', ...KNOWN.google };

function describe(id: string): AuthProvider {
  const known = KNOWN[id];
  const bare = id.replace(/^custom:/, '');
  return { id, label: known?.label ?? bare, opening: known?.opening ?? bare };
}

/**
 * Приводит ответ `/auth/v1/settings` к списку кнопок.
 *
 * Берутся все включённые ключи, кроме тех, что кнопкой не показываются. Незнакомый ключ
 * не выбрасывается: провайдера могли завести в Supabase раньше, чем он появился здесь,
 * и показать кнопку с техническим именем лучше, чем молча её не показать.
 */
export function providersFromSettings(
  external: Record<string, unknown> | undefined,
): AuthProvider[] {
  const enabled = Object.entries(external ?? {})
    .filter(([id, on]) => on === true && !NOT_A_BUTTON.has(id))
    .map(([id]) => id);
  if (!enabled.length) return [];
  return order(enabled.map(describe));
}

/** Порядок кнопок задаёт код, а не порядок ключей в чужом ответе. */
function order(list: AuthProvider[]): AuthProvider[] {
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return [...list].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/**
 * Разбирает ручной список из окружения.
 *
 * Google подставляется, если список пуст или состоит из мусора: экран входа без единой
 * кнопки хуже любой из этих ошибок.
 */
export function parseProviders(raw: string | undefined): AuthProvider[] {
  const ids = (raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const list: AuthProvider[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    list.push(describe(id));
  }
  return list.length ? list : [GOOGLE];
}

export function overrideFromEnv(): AuthProvider[] | null {
  const raw = (import.meta.env.VITE_AUTH_PROVIDERS as string | undefined)?.trim();
  return raw ? parseProviders(raw) : null;
}

/**
 * Кастомные провайдеры, про которые имеет смысл спросить отдельно.
 *
 * Список короткий и лежит в коде намеренно: это не «какие провайдеры бывают», а «какие
 * мы готовы показать кнопкой». Незаведённый провайдер стоит одного запроса при открытии
 * экрана входа и ничего больше.
 */
const CANDIDATES = ['custom:yandex', 'custom:vk', 'custom:mailru'];

/**
 * Включён ли провайдер, судя по ответу `/auth/v1/authorize`.
 *
 * `/auth/v1/settings` перечисляет только встроенных провайдеров — проверено 24.08.2026
 * на живом проекте, где `custom:yandex` был включён и в ответе не появился. А вот
 * `authorize` отвечает по-разному и однозначно: для включённого провайдера — редиректом
 * на его страницу (браузер отдаёт непрозрачный ответ со статусом 0), для незаведённого —
 * 400 с текстом «custom provider … not found».
 *
 * Это поведение недокументированное, поэтому проверка построена так, чтобы ломаться в
 * безопасную сторону: всё, кроме явного редиректа, считается «нет». Если Supabase
 * однажды начнёт отвечать иначе, пропадёт кнопка — а не появится нерабочая.
 */
export function looksEnabled(response: { status: number; type?: string }): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
}

async function probe(id: string): Promise<boolean> {
  try {
    const url = `${publicEnv.supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(id)}&redirect_to=${encodeURIComponent(publicEnv.appOrigin)}`;
    const response = await fetch(url, { redirect: 'manual' });
    return looksEnabled(response);
  } catch {
    return false;
  }
}

/**
 * Спрашивает у Supabase, что включено.
 *
 * Два источника, потому что одного не хватает: встроенные провайдеры перечисляет
 * `/auth/v1/settings`, кастомных там нет, и про них приходится спрашивать поимённо.
 *
 * Ошибка сети здесь не повод показать пустой экран: возвращается `null`, и вызывающий
 * оставляет Google — способ, которым люди уже пользуются.
 */
export async function fetchProviders(): Promise<AuthProvider[] | null> {
  if (!publicEnv.isConfigured) return null;
  try {
    const [settings, ...probes] = await Promise.all([
      fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: publicEnv.supabasePublishableKey },
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      ...CANDIDATES.map((id) => probe(id)),
    ]);
    const builtin = providersFromSettings(
      (settings as { external?: Record<string, unknown> } | null)?.external,
    );
    const custom = CANDIDATES.filter((_, index) => probes[index]).map(describe);
    const list = order([...builtin, ...custom]);
    return list.length ? list : null;
  } catch {
    return null;
  }
}
