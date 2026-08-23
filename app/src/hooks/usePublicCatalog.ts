import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { loadPublicCatalog, type PublicCatalog } from '../data';
import { publicEnv } from '../env';
import { reportError } from '../services/error-monitoring';

/**
 * Loads the published catalog for a visitor who has not signed in.
 *
 * Read with the anon key against the eight editorial catalogs only — every table
 * holding personal data stays unreadable without a session, and
 * supabase/tests/local/03_rls_isolation_test.sql asserts that for the `anon` role
 * rather than leaving it to intent.
 *
 * A failure here must never block the page. The visitor still gets the hero copy and
 * a working sign-in button; they simply do not see the catalog shelves. That is why
 * the rejection is reported and swallowed instead of surfacing as an error state.
 */
export function usePublicCatalog(session: Session | null) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const configured = publicEnv.isConfigured;

  useEffect(() => {
    if (!configured || session || catalog) return;
    let cancelled = false;
    loadPublicCatalog()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch((reason) => {
        reportError(reason, { surface: 'public-catalog-load' });
      });
    return () => {
      cancelled = true;
    };
  }, [configured, session, catalog]);

  return catalog;
}
