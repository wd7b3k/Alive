import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { triggerIcon } from './utils';

/**
 * The trigger codes the catalog actually publishes, read from the migrations rather
 * than restated here — a list copied by hand goes stale the first time somebody adds a
 * trigger, which is precisely the moment this test needs to fire.
 */
const migrations = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
const sql = [
  '20260815215100_v3_product_depth_catalog_a.sql',
  '20260821140000_v3_sync_production_catalog_content.sql',
  '20260827210000_v3_merge_after_action_triggers.sql',
]
  .map((name) => readFileSync(`${migrations}/${name}`, 'utf8'))
  .join('\n');

/**
 * Контекст уходит с экрана двумя способами: его удаляют или снимают с публикации при
 * слиянии (20260827210000). Во втором случае строка остаётся в базе ради истории
 * эпизодов, но в сетке выбора её нет — и значок она делит с тем, в кого влилась.
 */
const dropped = new Set([
  ...[...sql.matchAll(/delete from public\.triggers_catalog[\s\S]*?code in \(([^)]*)\)/g)]
    .flatMap((match) => [...match[1]!.matchAll(/'([a-z_]+)'/g)])
    .map((match) => match[1]!),
  ...[...sql.matchAll(/retired\s+text\[\]\s*:=\s*array\[([^\]]*)\]/g)]
    .flatMap((match) => [...match[1]!.matchAll(/'([a-z_]+)'/g)])
    .map((match) => match[1]!),
]);

const triggerCodes = [
  ...new Set([
    ...[...sql.matchAll(/\('([a-z_]+)','[^']+','[^']*',array\['(?:cigarette|hookah|vape)/g)].map(
      (match) => match[1]!,
    ),
    ...[...sql.matchAll(/update public\.triggers_catalog[^;]*?where code='([a-z_]+)'/g)].map(
      (match) => match[1]!,
    ),
  ]),
].filter((code) => !dropped.has(code));

describe('triggerIcon', () => {
  it('finds the real trigger catalog', () => {
    expect(triggerCodes.length).toBeGreaterThanOrEqual(25);
  });

  // The whole point of the Связки grid is that these are distinct moments in a life.
  // Two triggers wearing the same glyph make the map read as a repeating pattern, and
  // the person stops reading it.
  it('gives every trigger its own icon', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const code of triggerCodes.sort()) {
      const icon = triggerIcon({ code, title: '' });
      const owner = seen.get(icon);
      if (owner) collisions.push(`${owner} and ${code} both use "${icon}"`);
      else seen.set(icon, code);
    }
    expect(collisions, collisions.join('; ')).toEqual([]);
  });

  // A code with no entry falls back to a generic glyph. That fallback must never be
  // how a real trigger gets its icon — otherwise the collision check above passes only
  // because everything unmapped quietly shares the same default.
  it('maps every published trigger explicitly, with nothing on the fallback', () => {
    const unmapped = triggerCodes.filter(
      (code) => code !== 'spontaneous' && triggerIcon({ code, title: '' }) === 'spark',
    );
    expect(unmapped, `no icon assigned: ${unmapped.join(', ')}`).toEqual([]);
  });
});
