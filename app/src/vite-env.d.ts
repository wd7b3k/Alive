/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_APP_ORIGIN?: string;
  readonly VITE_AUTH_PROVIDERS?: string;
  readonly VITE_YANDEX_METRIKA_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Коммит, из которого собрана эта сборка. Подставляется vite.config.ts. */
  readonly VITE_COMMIT_SHA?: string;
  /** Версия из app/package.json. Подставляется vite.config.ts. */
  readonly VITE_BUILD_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
