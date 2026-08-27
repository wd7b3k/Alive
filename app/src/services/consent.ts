import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../supabase';

/**
 * Согласие участника.
 *
 * Habitoff — исследование поведения, связанного с зависимостью, и до 27.08.2026 в нём не
 * было ни одного места, где человек соглашается участвовать. Страница `/experiment`
 * объясняла устройство эксперимента, но её нельзя было ни пропустить, ни подтвердить, и
 * факт прочтения нигде не оставался.
 *
 * Согласие даётся галочкой на экране входа — до того, как аккаунт существует. Поэтому
 * порядок такой: отметка запоминается в браузере, человек уходит к провайдеру, а первым
 * же запросом после возврата отметка переносится в профиль и из браузера убирается.
 *
 * Версия — строка, а не флаг: когда формулировка изменится, сравнение с текущей версией
 * само покажет, у кого согласие устарело. `PRIVACY_AND_DATA.md` §20 требует спросить
 * заново при изменении статуса, и это выполняется без отдельной таблицы.
 */
export const CONSENT_VERSION = 'consent-2026-08-27';

const KEY = 'habitoff.consent';

/**
 * Запомнить отметку до ухода к провайдеру.
 *
 * Хранилище может быть недоступно (приватное окно, запрет на данные сайта). Тогда
 * согласие просто не запишется в профиль — и это видно в витрине метрик как «дали
 * согласие: не все». Ронять вход из-за этого нельзя: человек уже нажал кнопку.
 */
export function rememberConsent(): void {
  try {
    window.localStorage.setItem(KEY, CONSENT_VERSION);
  } catch {
    /* приватное окно — переживём */
  }
}

function pendingConsent(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function clearConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* см. rememberConsent */
  }
}

/**
 * Перенести отметку в профиль после входа.
 *
 * Ничего не перезаписывает: если согласие уже стоит и версия та же, запроса не будет.
 * Ошибка сети здесь не повод показать человеку экран ошибки — он только что вошёл и
 * ждёт продукт, а не отчёт о записи согласия. Отметка в браузере в этом случае остаётся
 * и попробует записаться при следующем заходе.
 */
export async function recordConsent(session: Session): Promise<void> {
  const version = pendingConsent();
  if (!version) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const current = await supabase
      .from('profiles')
      .select('consent_version')
      .eq('id', session.user.id)
      .maybeSingle();
    if (current.error) return;
    if (current.data?.consent_version === version) {
      clearConsent();
      return;
    }
    const saved = await supabase
      .from('profiles')
      .update({ consent_version: version, consent_accepted_at: new Date().toISOString() })
      .eq('id', session.user.id);
    if (!saved.error) clearConsent();
  } catch {
    /* попробуем при следующем заходе */
  }
}
