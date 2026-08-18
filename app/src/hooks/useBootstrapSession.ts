import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { loadBootstrap, type Bootstrap } from '../data';
import { publicEnv } from '../env';
import { reportError } from '../services/error-monitoring';
import { getSupabase } from '../supabase';

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
    supabase.auth
      .getSession()
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
