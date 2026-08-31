/**
 * Типы для `knowledge-lock.mjs`.
 *
 * Скрипт написан обычным JavaScript намеренно: он запускается `node scripts/...` без
 * сборки, как и остальные скрипты репозитория. Но его же зовёт сборка приложения, где
 * включён `tsc --noEmit` и `allowJs: false`. Объявление здесь — единственный способ
 * иметь одну реализацию чтения каталога вместо двух: копия функции, считающей хэш
 * утверждения, разошлась бы с оригиналом ровно так же, как копия текста разошлась бы с
 * базой.
 */
export type CatalogEnv = { url: string; key: string };

export type CatalogSource = {
  title: string;
  original: string | null;
  url: string | null;
  publication: string | null;
  year: number | null;
};

export type CatalogClaim = {
  code: string;
  kind: 'fact' | 'myth';
  claim: string;
  known: string;
  changes: string;
  detail: string;
  level: 'A' | 'B' | 'C';
  product_types: string[];
  surfaces: string[];
  trigger_codes: string[];
  sort_order: number;
  source: CatalogSource | null;
};

export type ClaimsLock = {
  note: string;
  generated: string;
  algorithm: string;
  claims: Record<string, { kind: string; level: string; hash: string }>;
};

export declare const LOCK_PATH: string;
export declare function buildEnv(appDir?: string): CatalogEnv;
export declare function fetchClaims(env: CatalogEnv): Promise<Map<string, CatalogClaim>>;
export declare function claimHash(claim: CatalogClaim): string;
export declare function buildLock(
  claims: Map<string, CatalogClaim>,
  generated: string,
): ClaimsLock;
export declare function readLock(path?: string): ClaimsLock;
