export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appOrigin: string;
  isConfigured: boolean;
  /** Номер счётчика Яндекс Метрики. Пусто — счётчик не загружается вовсе. */
  yandexMetrikaId: string;
  /** Идентификатор потока Google Analytics 4 вида `G-XXXXXXX`. */
  googleAnalyticsId: string;
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
  yandexMetrikaId: import.meta.env.VITE_YANDEX_METRIKA_ID?.trim() ?? '',
  googleAnalyticsId: import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '',
};
