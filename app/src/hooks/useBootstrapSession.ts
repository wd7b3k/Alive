import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { loadBootstrap, type Bootstrap } from '../data';
import { publicEnv } from '../env';
import { reportError } from '../services/error-monitoring';
import { getSupabase } from '../supabase';

/**
 * Забирает сессию, выпущенную мостом входа.
 *
 * Мост возвращает человека с одноразовым `token_hash` во фрагменте — во фрагменте
 * намеренно: он не попадает ни в логи веб-сервера, ни в заголовок Referer. Обменять
 * его нужно до `getSession()`, иначе первый кадр отрисуется как «не вошёл» и экран
 * моргнёт.
 */
async function consumeBridgeToken(supabase: SupabaseClient): Promise<void> {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw.includes('token_hash=')) return;
  const params = new URLSearchParams(raw);
  const tokenHash = params.get('token_hash');
  const type = params.get('type') ?? 'magiclink';

  // Адрес чистится в любом случае, даже если обмен не удался: одноразовому токену
  // нечего делать в истории браузера и тем более в закладке.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  if (!tokenHash) return;
  const { error } = await supabase.auth.verifyOtp({
    type: type as 'magiclink',
    token_hash: tokenHash,
  });
  if (error) reportError(error, { surface: 'bridge-sign-in' });
}

export function useBootstrapSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const configured = publicEnv.isConfigured;

  async function reload(nextSession: Session = session as Session) {
    const next = await loadBootstrap(nextSession);
    setData(next);
    setError('');
    return next;
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      setError('Подключение к Supabase не настроено');
      return;
    }

    let cancelled = false;
    consumeBridgeToken(supabase)
      .then(() => supabase.auth.getSession())
      .then(async ({ data: { session: current } }) => {
        if (cancelled) return;
        setSession(current);
        if (!current) return;
        try {
          const next = await loadBootstrap(current);
          if (!cancelled) setData(next);
        } catch (reason) {
          if (!cancelled) {
            setError(
              reason instanceof Error ? reason.message : 'Не удалось загрузить личную карту',
            );
          }
          reportError(reason, { surface: 'bootstrap-load' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      if (!current) {
        setData(null);
        setError('');
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [configured]);

  return { configured, data, error, loading, reload, session };
}
