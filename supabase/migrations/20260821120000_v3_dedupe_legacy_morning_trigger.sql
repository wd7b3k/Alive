-- Removes the duplicated "После пробуждения" trigger from the public catalog.
--
-- Found 2026-08-21 by visual QA against the live deployment: the Связки trigger map
-- and step 1 of the craving flow both showed two byte-identical options titled
-- "После пробуждения" with the same description. Root cause: the same real-world
-- context exists under two codes —
--   * 'morning'  — seeded by 20260815170000_v3_platform_initial.sql
--   * 'wake_up'  — seeded by 20260815215100_v3_product_depth_catalog_a.sql
-- The later product-depth catalog introduced 'wake_up' but never retired the
-- original 'morning' row, so both stayed published.
--
-- Why this matters beyond cosmetics:
--   1. 'wake_up' carries 4 curated trigger->replacement relations; 'morning' carries
--      zero. Picking the legacy duplicate silently drops the situation-specific
--      curation and falls back to need-only matching (app/src/data.ts,
--      pickReplacements) — degrading exactly the contextual-suggestion behaviour
--      FR-V3 promises, with no signal to the user.
--   2. Episodes logged against the two codes never aggregate, so the repeated-pattern
--      detection that the whole product rests on under-counts a user's real morning
--      pattern by splitting it across two buckets.
--
-- Strategy: re-point existing history onto the canonical code first (no user data is
-- discarded — episodes keep their trigger, it just resolves to the correct catalog
-- entry), then drop the orphaned duplicate row. Idempotent and safe to re-run.

-- The identical pattern exists a second time in replacements_catalog:
--   * 'water'       — seeded by 20260815170000_v3_platform_initial.sql, 0 relations
--   * 'water_pause' — seeded by 20260815215100_v3_product_depth_catalog_a.sql, 5 relations
-- Both are titled "Стакан воды" and both list the 'pause' need, so both are eligible
-- and score identically for a user who picks that need — meaning the craving flow can
-- render two visually identical replacement cards side by side in the same set of
-- three suggestions. Same cause, same fix, handled together below.

-- 1. Re-point any history recorded against the legacy codes.
update public.episodes
   set trigger_code = 'wake_up'
 where trigger_code = 'morning';

update public.episode_actions
   set replacement_code = 'water_pause'
 where replacement_code = 'water';

update public.user_links
   set preferred_replacement_code = 'water_pause'
 where preferred_replacement_code = 'water';

-- 2. Defensive: only drop the legacy row once nothing references it and the canonical
--    replacement genuinely exists, so a partially-migrated database fails loudly
--    rather than silently losing the trigger entirely.
do $$
begin
  if not exists (select 1 from public.triggers_catalog where code = 'wake_up') then
    raise exception 'canonical trigger wake_up is missing; refusing to drop legacy morning';
  end if;

  if exists (select 1 from public.episodes where trigger_code = 'morning') then
    raise exception 'episodes still reference morning after re-pointing; aborting';
  end if;

  delete from public.triggers_catalog where code = 'morning';

  if not exists (select 1 from public.replacements_catalog where code = 'water_pause') then
    raise exception 'canonical replacement water_pause is missing; refusing to drop legacy water';
  end if;

  if exists (select 1 from public.episode_actions where replacement_code = 'water')
     or exists (select 1 from public.user_links where preferred_replacement_code = 'water') then
    raise exception 'history still references water after re-pointing; aborting';
  end if;

  delete from public.replacements_catalog where code = 'water';
end
$$;
