import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationsDirectory = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url));
const sql = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(`${migrationsDirectory}/${name}`, 'utf8'))
  .join('\n')
  .toLowerCase();

const createdTables = [...sql.matchAll(/create table(?: if not exists)? public\.(\w+)/g)].map(
  (match) => match[1],
);

describe('RLS migration invariants', () => {
  it('enables RLS for every public table created by migrations', () => {
    expect(createdTables.length).toBeGreaterThan(0);
    for (const table of createdTables) {
      expect(sql, `RLS is missing for public.${table}`).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`),
      );
    }
  });

  it.each([
    ['profiles', 'id'],
    ['user_settings', 'user_id'],
    ['user_nicotine_products', 'user_id'],
    ['episodes', 'user_id'],
    ['episode_actions', 'user_id'],
    ['tobacco_events', 'user_id'],
    ['user_meanings', 'user_id'],
    ['user_links', 'user_id'],
  ])('keeps %s scoped to auth.uid() through its owner column', (table, ownerColumn) => {
    const policies = [
      ...sql.matchAll(
        new RegExp(
          `create policy [\\s\\S]*? on public\\.${table} [\\s\\S]*?(?=create policy|grant |$)`,
          'g',
        ),
      ),
    ]
      .map((match) => match[0])
      .join('\n');
    expect(policies).toContain('auth.uid()');
    expect(policies).toContain(ownerColumn);
  });

  // Since 2026-08-22 the product opens before sign-in, which required granting `anon`
  // select on the eight editorial catalogs. That made this assertion load-bearing
  // rather than theoretical: the same migration file now legitimately contains
  // `to anon` grants, so a future one could widen the surface without anybody
  // noticing. The list below is the full set of tables holding personal data — the
  // same 11 asserted at runtime by the anon block in
  // supabase/tests/local/03_rls_isolation_test.sql. This is the static half of that
  // pair: it catches the grant being written, the SQL test catches rows being
  // readable. Keep both lists in step.
  it.each([
    'episodes',
    'episode_actions',
    'tobacco_events',
    'user_meanings',
    'user_links',
    'daily_checkins',
    'daily_support_state',
    'user_nicotine_products',
    'profiles',
    'user_settings',
    'ugc_submissions',
  ])('never grants anonymous access to %s', (table) => {
    expect(sql).not.toMatch(new RegExp(`grant [^;]+ on public\\.${table} to [^;]*anon`));
  });

  // The anon policies that do exist must stay filtered to published rows, so that
  // editorial drafts are not visible to a visitor without an account.
  it('filters every anon select policy to published rows', () => {
    const anonPolicies = [
      ...sql.matchAll(/create policy [\s\S]*?for select to anon[\s\S]*?;/g),
    ].map((match) => match[0]);
    expect(anonPolicies.length).toBeGreaterThan(0);
    for (const policy of anonPolicies) {
      const isRelationTable = policy.includes('trigger_replacement_map');
      expect(
        isRelationTable || policy.includes('published = true'),
        `anon policy is not limited to published rows: ${policy}`,
      ).toBe(true);
    }
  });
});
