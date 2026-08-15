import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from './env';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!publicEnv.isConfigured) return null;
  if (!client) {
    client = createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
