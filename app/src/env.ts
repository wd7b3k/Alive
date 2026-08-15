export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appOrigin: string;
  isConfigured: boolean;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const appOrigin =
  import.meta.env.VITE_APP_ORIGIN?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

export const publicEnv: PublicEnv = {
  supabaseUrl,
  supabasePublishableKey,
  appOrigin,
  isConfigured: Boolean(supabaseUrl && supabasePublishableKey),
};
