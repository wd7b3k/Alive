/**
 * Типы для `changelog-parse.mjs`.
 *
 * Разбор написан на голом JavaScript намеренно: он запускается перед сборкой, в том
 * числе там, где `npm ci` для него не делается, и тащить туда сборку TypeScript ради
 * трёх сотен строк — лишний шаг, который однажды сломается. Но проверяется он тестом
 * из `app/`, а тесты там на TypeScript, — отсюда это объявление.
 *
 * Файл описывает то, что скрипт действительно экспортирует. Разъедется — упадёт
 * `npm run typecheck`, а не раздел на проде.
 */

export const RECORD: string;
export const UNIT: string;
export const LOG_FORMAT: string;
export const THEMES: string[];
export const THEME_BY_PATH: [string, string][];
export const KINDS: string[];

export type ParsedCommit = {
  sha: string;
  short: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  paths: string[];
  merge: boolean;
};

export type VersionBump = { sha: string; version: string };

export type BoardCard = { id: string; title: string; epic?: string | null; type?: string | null };

export type ChangelogEntry = {
  sha: string;
  short: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  dirs: string[];
  files: number;
  theme: string | null;
  themeConfident: boolean;
  kind: string;
  kindConfident: boolean;
  card: { id: string; title: string; epic: string | null } | null;
  cardId: string | null;
  task: string | null;
  pr: number | null;
  migration: boolean;
  merge: boolean;
  version: string | null;
};

export type ChangelogGroup = {
  version: string | null;
  count: number;
  migrations: number;
  from: string | null;
  to: string | null;
  entries: ChangelogEntry[];
};

export type Changelog = {
  generatedAt: string;
  head: string;
  version: string;
  total: number;
  unavailable: string | null;
  groups: ChangelogGroup[];
};

export function themeOf(path: string): string | null;
export function themeFor(paths: string[]): string | null;
export function kindFor(input: {
  paths?: string[];
  subject?: string;
  merge?: boolean;
  cardType?: string | null;
}): { kind: string; confident: boolean };
export function cardIdFrom(body: string): string | null;
export function prFrom(subject: string): number | null;
export function taskFrom(text: string, knownTasks: string[]): string | null;
export function dirsOf(paths: string[]): string[];
export function parseLog(raw: string): ParsedCommit[];
export function assignVersions(
  commits: ParsedCommit[],
  bumps: VersionBump[],
): (ParsedCommit & { version: string | null })[];
export function buildChangelog(input: {
  commits: ParsedCommit[];
  bumps?: VersionBump[];
  cards?: BoardCard[];
  tasks?: string[];
  head?: string;
  version?: string;
  generatedAt?: string;
}): Changelog;
export function unavailableChangelog(reason: string, generatedAt?: string): Changelog;
