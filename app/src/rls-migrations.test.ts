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
    'user_goals',
    'user_awareness_state',
    'user_myth_state',
  ])('never grants anonymous access to %s', (table) => {
    expect(sql).not.toMatch(new RegExp(`grant [^;]+ on public\\.${table} to [^;]*anon`));
  });

  // The anon policies that do exist must stay filtered to published rows, so an
  // editorial draft is never visible to a visitor without an account.
  //
  // The exemption is derived, not listed by name: a relation or reference table that
  // has no `published` column cannot filter on one, and hardcoding which tables those
  // are would quietly exempt the next table someone adds under a similar name. So the
  // migrations are read for which tables actually declare `published`, and only those
  // are held to the rule.
  it('filters every anon select policy to published rows', () => {
    const tablesWithPublished = new Set(
      [...sql.matchAll(/create table(?: if not exists)? public\.(\w+) \(([\s\S]*?)\n\);/g)]
        .filter(([, , body]) => /\bpublished boolean/.test(body))
        .map(([, table]) => table),
    );
    expect(tablesWithPublished.size).toBeGreaterThan(0);

    // Bounded on [^;] rather than a lazy [\s\S]*?: a policy statement contains no
    // semicolon, so this matches exactly one statement. A lazy match would happily run
    // from one `create policy` across several others to reach the first
    // `for select to anon`, pairing that policy with the wrong table name — which is
    // how the first version of this test passed while catching nothing.
    const anonPolicies = [...sql.matchAll(/create policy \w+ on public\.(\w+)[^;]*;/g)].filter(
      ([policy]) => /for select\s+to anon/.test(policy),
    );
    expect(anonPolicies.length).toBeGreaterThan(0);

    for (const [policy, table] of anonPolicies) {
      if (!tablesWithPublished.has(table)) continue;
      expect(
        policy.includes('published = true'),
        `public.${table} has a published column but its anon policy does not filter on it: ${policy}`,
      ).toBe(true);
    }
  });

  // Раздел «Факты» стоит на таблицах, которых нет ни в одной миграции: они появились
  // прямо в проде, и репозиторий узнал о них 2026-08-24. Правило «anon читает только
  // published» выводится выше из тел `create table`, поэтому эти четыре таблицы под
  // него не попадают — их тела здесь никто не создаёт. Пока это так, они проверяются
  // по именам: иначе редакционный черновик уехал бы на экран до входа, и статический
  // guard этого бы не заметил.
  it.each(['facts_catalog', 'myths_catalog', 'goals_catalog', 'awareness_content'])(
    'filters the anon policy on the production-owned catalog %s to published rows',
    (table) => {
      const policies = [
        // [^\\w;] после имени таблицы обязательно: без него awareness_content
        // сматчил бы и политику awareness_content_contexts, и тест проверял бы не ту
        // таблицу — ровно тот класс ошибки, который здесь и ловится.
        ...sql.matchAll(new RegExp(`create policy \\w+ on public\\.${table}[^\\w;][^;]*;`, 'g')),
      ]
        .map(([policy]) => policy)
        .filter((policy) => /to anon/.test(policy));
      expect(policies.length, `public.${table} has no anon select policy`).toBeGreaterThan(0);
      for (const policy of policies) {
        expect(policy, `public.${table} anon policy does not filter on published`).toContain(
          'published = true',
        );
      }
    },
  );
});
