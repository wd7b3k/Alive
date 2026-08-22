-- Lets a visitor who has not signed in read the published catalog, so the product can
-- be explored before an account exists.
--
-- Owner decision 2026-08-22: sign-in should no longer be a wall on the first screen.
-- The interface opens immediately and Google sign-in is raised only when the person
-- does something that genuinely needs an account (logging an episode, saving a
-- personal Смысл or Связка). That is impossible while every catalog row is readable
-- only by `authenticated` — an anonymous visitor would be shown empty shelves.
--
-- Scope is deliberately narrow. This grants SELECT to `anon` on the eight editorial
-- catalogs only, and each policy still filters `published = true`, so unpublished
-- drafts stay invisible exactly as before:
--
--   triggers_catalog, needs_catalog, replacements_catalog, meanings_catalog,
--   identity_scripts_catalog, supports_catalog, rewards_catalog,
--   trigger_replacement_map (relations between the above; carries no user data)
--
-- What is NOT touched, and must never be: every table holding personal data —
-- profiles, user_settings, user_nicotine_products, episodes, episode_actions,
-- tobacco_events, user_meanings, user_links, daily_checkins, daily_support_state,
-- ugc_submissions. They remain `authenticated`-only and owner-scoped. The isolation
-- test in supabase/tests/local now asserts this explicitly for the anonymous role:
-- anon must read the catalogs and zero rows from any private table.
--
-- Risk assessment recorded honestly: this does widen the public surface. What becomes
-- publicly readable is editorial content that every signed-in user already sees and
-- that the product describes openly — trigger names, replacement instructions,
-- universal Meanings. It contains no personal data, no user identifiers and no
-- aggregates over user behaviour. Making it anonymously readable is equivalent to
-- publishing it on the site, which is what showing it pre-login means.

-- The catalogs are already RLS-enabled; add anon-facing read policies alongside the
-- existing authenticated ones rather than replacing them.
create policy triggers_catalog_read_published_anon on public.triggers_catalog
  for select to anon using (published = true);
create policy needs_catalog_read_published_anon on public.needs_catalog
  for select to anon using (published = true);
create policy replacements_catalog_read_published_anon on public.replacements_catalog
  for select to anon using (published = true);
create policy meanings_catalog_read_published_anon on public.meanings_catalog
  for select to anon using (published = true);
create policy identity_scripts_read_published_anon on public.identity_scripts_catalog
  for select to anon using (published = true);
create policy supports_read_published_anon on public.supports_catalog
  for select to anon using (published = true);
create policy rewards_read_published_anon on public.rewards_catalog
  for select to anon using (published = true);
create policy trigger_replacement_map_read_anon on public.trigger_replacement_map
  for select to anon using (true);

grant usage on schema public to anon;
grant select on public.triggers_catalog to anon;
grant select on public.needs_catalog to anon;
grant select on public.replacements_catalog to anon;
grant select on public.meanings_catalog to anon;
grant select on public.identity_scripts_catalog to anon;
grant select on public.supports_catalog to anon;
grant select on public.rewards_catalog to anon;
grant select on public.trigger_replacement_map to anon;
