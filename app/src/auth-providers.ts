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
 * Не провайдеры входа: это способы, которые ALIVE не показывает кнопкой, и попадать в
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
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };
  return enabled.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map(describe);
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
 * Спрашивает у Supabase, что включено.
 *
 * Ошибка сети здесь не повод показать пустой экран: возвращается `null`, и вызывающий
 * оставляет Google — способ, которым люди уже пользуются.
 */
export async function fetchProviders(): Promise<AuthProvider[] | null> {
  if (!publicEnv.isConfigured) return null;
  try {
    const response = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabasePublishableKey },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { external?: Record<string, unknown> };
    const list = providersFromSettings(body.external);
    return list.length ? list : null;
  } catch {
    return null;
  }
}
