/**
 * Какими способами можно войти.
 *
 * Список приезжает из окружения, а не из кода, по одной причине: кнопка провайдера,
 * который не настроен в Supabase, — это не «пока не работает», а ошибка на весь экран
 * после клика. Поэтому кнопка появляется ровно тогда, когда провайдер уже заведён в
 * проекте: `VITE_AUTH_PROVIDERS=google,custom:yandex`.
 *
 * Google остаётся первым, пока владелец не решит иначе: это единственный способ, через
 * который уже вошли живые люди, и менять его местами без причины — значит сбивать их.
 */
export type AuthProvider = {
  id: string;
  label: string;
  /** Родительный падеж для «Открываю …». */
  opening: string;
};

const KNOWN: Record<string, Omit<AuthProvider, 'id'>> = {
  google: { label: 'Google', opening: 'Google' },
  'custom:yandex': { label: 'Яндекс', opening: 'Яндекс' },
  'custom:vk': { label: 'VK ID', opening: 'VK ID' },
  'custom:mailru': { label: 'Mail.ru', opening: 'Mail.ru' },
  apple: { label: 'Apple', opening: 'Apple' },
};

export const DEFAULT_PROVIDERS = 'google';

/**
 * Разбирает список провайдеров.
 *
 * Неизвестный идентификатор не выбрасывается: он мог появиться в Supabase раньше, чем
 * в этом файле, и тогда лучше показать кнопку с техническим именем, чем молча не
 * показать вход. Google подставляется, если список пуст или состоит из мусора — экран
 * входа без единой кнопки хуже любой из этих ошибок.
 */
export function parseProviders(raw: string | undefined): AuthProvider[] {
  const ids = (raw ?? DEFAULT_PROVIDERS)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const list: AuthProvider[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const known = KNOWN[id];
    list.push({
      id,
      label: known?.label ?? id.replace(/^custom:/, ''),
      opening: known?.opening ?? id.replace(/^custom:/, ''),
    });
  }
  return list.length ? list : [{ id: 'google', ...KNOWN.google }];
}

export function configuredProviders(): AuthProvider[] {
  return parseProviders(import.meta.env.VITE_AUTH_PROVIDERS as string | undefined);
}
