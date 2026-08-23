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

  it('does not grant anonymous access to private behavioural tables', () => {
    expect(sql).not.toMatch(
      /grant [^;]+ on public\.(episodes|tobacco_events|user_meanings|user_links) to anon/,
    );
  });
});
