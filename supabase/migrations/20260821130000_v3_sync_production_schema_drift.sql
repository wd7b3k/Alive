-- Brings the repository's versioned schema back in line with the production database.
--
-- Found 2026-08-21 while applying the catalog de-duplication migration: the live
-- Supabase project (xkigijaqimzuveyzyzyk) carries columns that no migration in this
-- repository ever created. They were added directly against production, outside the
-- versioned migration flow, which silently broke the invariant stated in
-- docs/CURRENT_STATE.md ("wd7b3k/Alive — единственный source of truth ... Dashboard/чат
-- не переопределяют repo").
--
-- Why this had to be fixed before release: releases/v3.0-platform/VALIDATION.md lists
-- `supabase db reset` — rebuilding the database from these migrations — as a required
-- gate. Run against the repo as it stood before this migration, that reset would have
-- produced a schema missing 20 columns that production code and content depend on.
-- The documented release step was, in effect, destructive.
--
-- Direction of the fix is the owner's explicit decision (2026-08-21): production is
-- treated as the source of truth, and the repository is brought up to match it. No
-- production data or schema is altered by this migration — it only teaches a fresh
-- database to look like production already does. Every statement is guarded with
-- `if not exists`, so applying it to the live project is a no-op.
--
-- Column types, nullability and defaults below were read from production's
-- information_schema, not inferred from the application code.

-- Replacement catalog: evidence provenance, rotation/intensity tuning, categorisation
-- and short-form copy.
alter table public.replacements_catalog
  add column if not exists mechanism text,
  add column if not exists evidence_level text,
  add column if not exists evidence_scope text,
  add column if not exists source_title text,
  add column if not exists source_url text,
  add column if not exists context_tags text[] not null default '{}'::text[],
  add column if not exists setting_tags text[] not null default '{}'::text[],
  add column if not exists rotation_weight numeric not null default 1,
  add column if not exists intensity_min smallint,
  add column if not exists intensity_max smallint,
  add column if not exists category_code text,
  add column if not exists short_action_ru text,
  add column if not exists expected_duration_seconds integer,
  add column if not exists effort_level smallint;

-- Trigger catalog: categorisation and the recognition prompt shown to the user.
alter table public.triggers_catalog
  add column if not exists category_code text,
  add column if not exists mechanism_code text,
  add column if not exists recognition_prompt_ru text,
  add column if not exists context_tags text[] not null default '{}'::text[];

-- Episodes: link to a user's own Связка, and the kind of episode recorded.
-- NOTE: production defines user_trigger_id as a plain uuid with no foreign key. It is
-- reproduced exactly as it exists there rather than "improved" with a reference to
-- public.user_links — adding a constraint production does not have would make a fresh
-- database stricter than the real one and could reject rows production accepts. If that
-- reference is intended, it belongs in its own reviewed migration applied to both.
alter table public.episodes
  add column if not exists user_trigger_id uuid,
  add column if not exists episode_kind text not null default 'unknown'::text;
