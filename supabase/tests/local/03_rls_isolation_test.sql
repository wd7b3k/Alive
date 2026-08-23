-- RLS cross-tenant isolation assertions.
-- Convention: as authenticated user A, every attempt to read/modify user B's private
-- rows must return zero rows / affect zero rows. A failed assertion raises an exception
-- so the script's exit code signals pass/fail.

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
declare
  leaked int;
begin
  select count(*) into leaked from public.episodes where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: episodes select user B rows visible to user A (% rows)', leaked; end if;
  select count(*) into leaked from public.tobacco_events where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: tobacco_events select user B rows visible to user A'; end if;
  select count(*) into leaked from public.user_meanings where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: user_meanings select user B rows visible to user A'; end if;
  select count(*) into leaked from public.user_links where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: user_links select user B rows visible to user A'; end if;
  select count(*) into leaked from public.ugc_submissions where source_user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: ugc_submissions select user B rows visible to user A'; end if;
  select count(*) into leaked from public.daily_checkins where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: daily_checkins select user B rows visible to user A'; end if;
  select count(*) into leaked from public.daily_support_state where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: daily_support_state select user B rows visible to user A'; end if;
  select count(*) into leaked from public.user_nicotine_products where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: user_nicotine_products select user B rows visible to user A'; end if;
  select count(*) into leaked from public.profiles where id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: profiles select user B row visible to user A'; end if;
  select count(*) into leaked from public.user_settings where user_id = '22222222-2222-2222-2222-222222222222'; if leaked <> 0 then raise exception 'LEAK: user_settings select user B rows visible to user A'; end if;
  raise notice 'SELECT isolation: PASS (0 rows leaked across 10 tables)';
end
$$;

-- write-path checks: user A must not be able to UPDATE or DELETE user B's rows either.
do $$
declare
  affected int;
begin
  update public.episodes set private_note = 'hacked' where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'LEAK: user A updated % row(s) belonging to user B in episodes', affected; end if;

  delete from public.user_meanings where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'LEAK: user A deleted % row(s) belonging to user B in user_meanings', affected; end if;

  update public.profiles set display_name = 'hacked' where id = '22222222-2222-2222-2222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'LEAK: user A updated user B profile'; end if;

  raise notice 'WRITE isolation: PASS (0 rows affected across UPDATE/DELETE probes)';
end
$$;

-- insert-path check: user A must not be able to insert a row claiming to belong to user B
-- (with check clause should reject this).
do $$
begin
  begin
    insert into public.episodes (user_id, target_product, outcome)
    values ('22222222-2222-2222-2222-222222222222', 'cigarette', 'successful_response');
    raise exception 'LEAK: user A inserted a row owned by user B in episodes (with check clause did not block it)';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'INSERT isolation: PASS (insert as user A claiming user B ownership was rejected)';
  end;
end
$$;

-- positive control: user A must still be able to see/update their own rows.
do $$
declare
  own int;
begin
  select count(*) into own from public.episodes where user_id = '11111111-1111-1111-1111-111111111111';
  if own = 0 then raise exception 'FALSE POSITIVE: user A cannot see their own episodes — policy too strict, not just isolating'; end if;
  raise notice 'Own-row access: PASS (user A sees % of their own episode(s))', own;
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Anonymous visitor (added 2026-08-22 with the pre-login browsing change).
--
-- Sign-in is no longer a wall on the first screen, so the `anon` role can now read
-- the published catalogs. That widened the public surface, and this block is the
-- guard on it: anon must be able to read editorial content and must read exactly
-- zero rows from every table holding personal data. If a future migration ever
-- grants anon more than intended, this fails loudly instead of leaking quietly.
-- ---------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
declare
  visible int;
  leaked int;
  tbl text;
begin
  -- the catalogs must be readable, otherwise the pre-login screens are empty shells
  select count(*) into visible from public.triggers_catalog;
  if visible = 0 then
    raise exception 'anon cannot read triggers_catalog — pre-login browsing would show nothing';
  end if;
  select count(*) into visible from public.replacements_catalog;
  if visible = 0 then
    raise exception 'anon cannot read replacements_catalog — pre-login browsing would show nothing';
  end if;
  -- The evidence layer is shown next to every replacement, including before sign-in.
  -- If a future migration adds an evidence table and forgets the anon grant, the cards
  -- would silently render without their source and level — which reads as "no evidence
  -- exists" rather than "the query failed". Assert it instead.
  select count(*) into visible from public.evidence_levels;
  if visible = 0 then
    raise exception 'anon cannot read evidence_levels — evidence badges would render with no meaning behind them';
  end if;
  select count(*) into visible from public.evidence_sources;
  if visible = 0 then
    raise exception 'anon cannot read evidence_sources — citations would disappear before sign-in';
  end if;
  select count(*) into visible from public.replacement_evidence;
  if visible = 0 then
    raise exception 'anon cannot read replacement_evidence — no replacement could be tied to its source';
  end if;
  -- «Факты и Мифы» is one of the things a visitor is meant to be able to read before
  -- deciding to sign up, so its absence for anon is a product bug, not a permissions
  -- detail.
  select count(*) into visible from public.knowledge_catalog;
  if visible = 0 then
    raise exception 'anon cannot read knowledge_catalog — the Facts and Myths section would be empty before sign-in';
  end if;
  select count(*) into visible from public.knowledge_evidence;
  if visible = 0 then
    raise exception 'anon cannot read knowledge_evidence — cards would render without their citations';
  end if;
  select count(*) into visible from public.knowledge_trigger_map;
  if visible = 0 then
    raise exception 'anon cannot read knowledge_trigger_map — per-trigger cards would never surface';
  end if;
  raise notice 'Anon catalog read: PASS (published catalogs, evidence layer and knowledge cards visible without a session)';

  -- and nothing else may be
  foreach tbl in array array[
    'episodes','episode_actions','tobacco_events','user_meanings','user_links',
    'daily_checkins','daily_support_state','user_nicotine_products','profiles',
    'user_settings','ugc_submissions'
  ] loop
    begin
      execute format('select count(*) from public.%I', tbl) into leaked;
    exception
      when insufficient_privilege then
        leaked := 0; -- no grant at all is an even stronger guarantee than an empty read
    end;
    if leaked <> 0 then
      raise exception 'LEAK: anonymous visitor can read % row(s) from private table %', leaked, tbl;
    end if;
  end loop;
  raise notice 'Anon privacy: PASS (0 rows readable across 11 private tables)';
end
$$;

reset role;
