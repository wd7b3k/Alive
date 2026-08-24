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
-- Контент «Фактов» живёт в проде и в репозиторий не переносится (см.
-- 20260824110000), поэтому локально эти каталоги пустые. Считать строки здесь нечего —
-- зато можно проверить то, что действительно важно и чего подсчёт строк в проде не
-- проверяет: что anon видит опубликованную карточку и не видит черновик. Поэтому пара
-- строк сеется прямо здесь, от имени владельца схемы, до переключения роли.
insert into public.facts_catalog
  (code, title, short_text, full_text, changes_ru, category, evidence_kind,
   source_title, source_url, last_verified_at, published, surfaces)
values
  ('t_fact_published', 'Опубликованный факт', 'что известно', 'границы', 'что это меняет',
   'behavior', 'guideline', 'Источник', 'https://example.test/fact', current_date, true,
   array['today']::text[]),
  ('t_fact_draft', 'Черновик факта', 'что известно', 'границы', 'что это меняет',
   'behavior', 'guideline', 'Источник', 'https://example.test/fact-draft', current_date, false,
   '{}'::text[])
on conflict (code) do nothing;

insert into public.myths_catalog
  (code, title, short_reframe, explanation, changes_ru, mechanism,
   source_title, source_url, last_verified_at, published, surfaces)
values
  ('t_myth_published', 'Опубликованный миф', 'что известно', 'механизм', 'что это меняет',
   'cue_association', 'Источник', 'https://example.test/myth', current_date, true, '{}'::text[]),
  ('t_myth_draft', 'Черновик мифа', 'что известно', 'механизм', 'что это меняет',
   'cue_association', 'Источник', 'https://example.test/myth-draft', current_date, false, '{}'::text[])
on conflict (code) do nothing;

insert into public.goals_catalog (code, goal_type, title_ru, body_ru, published)
values
  ('t_goal_published', 'цель', 'Опубликованная цель', 'тело', true),
  ('t_goal_draft', 'цель', 'Черновик цели', 'тело', false)
on conflict (code) do nothing;

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
  -- «Факты и Мифы» стоит на таблицах, которые давно лежали в проде и были закрыты
  -- наглухо: RLS включён, политик нет — то есть контент существовал и не доходил ни до
  -- кого. Права открывает 20260824120000, и здесь они проверяются по факту, а не по
  -- намерению: если следующая миграция снова закроет их, раздел молча опустеет, и
  -- отличить это от «контента ещё нет» по экрану будет нельзя.
  --
  -- Проверяется и обратное — что черновик до входа не виден. Политика фильтрует по
  -- published, и без этой половины первая половина проходила бы и с политикой
  -- `using (true)`.
  select count(*) into visible from public.facts_catalog;
  if visible <> 1 then
    raise exception 'anon видит % строк facts_catalog вместо одной опубликованной', visible;
  end if;
  select count(*) into visible from public.facts_catalog where code = 't_fact_draft';
  if visible <> 0 then
    raise exception 'LEAK: неопубликованный факт виден до входа';
  end if;

  select count(*) into visible from public.myths_catalog;
  if visible <> 1 then
    raise exception 'anon видит % строк myths_catalog вместо одной опубликованной', visible;
  end if;
  select count(*) into visible from public.myths_catalog where code = 't_myth_draft';
  if visible <> 0 then
    raise exception 'LEAK: неопубликованный миф виден до входа';
  end if;

  select count(*) into visible from public.goals_catalog;
  if visible <> 1 then
    raise exception 'anon видит % строк goals_catalog вместо одной опубликованной', visible;
  end if;

  -- Библиография и слой микроосознанности: строк локально нет, поэтому проверяется
  -- ровно то, что здесь и может сломаться — что select вообще разрешён. Без гранта или
  -- политики это упало бы на insufficient_privilege, а не вернуло ноль.
  perform 1 from public.evidence_sources limit 1;
  perform 1 from public.evidence_claims limit 1;
  perform 1 from public.evidence_claim_sources limit 1;
  perform 1 from public.awareness_content limit 1;
  perform 1 from public.awareness_content_contexts limit 1;

  raise notice 'Anon catalog read: PASS (опубликованные каталоги видны, черновики — нет)';

  -- and nothing else may be
  foreach tbl in array array[
    'episodes','episode_actions','tobacco_events','user_meanings','user_links',
    'daily_checkins','daily_support_state','user_nicotine_products','profiles',
    'user_settings','ugc_submissions',
    -- Персональное состояние поверх контентного слоя прода. До 20260824120000 у anon
    -- на этих таблицах висели гранты insert/update/delete/truncate, и от чужих данных
    -- его отделяло только отсутствие разрешающей политики.
    'user_goals','user_awareness_state','user_myth_state',
    -- Аналитика и список администраторов. Журнал событий — это карта поведения
    -- человека в зависимости; читать его нельзя никому из клиентских ролей, наружу
    -- выходят только агрегаты из admin_product_health и together_pulse.
    'analytics_events','content_impressions','system_errors','app_admins'
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
  raise notice 'Anon privacy: PASS (0 rows readable across 18 private tables)';
end
$$;

reset role;

-- ---------------------------------------------------------------------------
-- Аналитика и агрегаты (добавлено 2026-08-25).
--
-- Три отдельные вещи, каждая из которых может сломаться молча:
--   * вошедший человек не должен читать журнал событий — даже свой. Экрана с сырым
--     журналом в продукте нет, а право, выданное «на будущее», однажды окажется
--     выданным зря;
--   * admin_product_health обязана отказывать не-администратору. Она security definer,
--     то есть внутри читает всё; единственное, что стоит между обычным пользователем и
--     всей базой, — проверка в первой строке функции;
--   * together_pulse на маленькой группе обязана молчать. «Один человек вернулся после
--     срыва» в группе из двух — это указание пальцем.
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
declare
  denied boolean;
  pulse record;
begin
  -- Проверяется само право, а не результат запроса. Счёт строк здесь ничего не
  -- доказывает: таблица в тестовой базе пустая, и `select count(*)` вернёт ноль и при
  -- выданном гранте, и при разрешающей политике. Ошибка была бы обнаружена только на
  -- проде, с чужими данными внутри.
  if has_table_privilege('authenticated', 'public.analytics_events', 'select') then
    raise exception 'У роли authenticated есть право select на журнал событий';
  end if;
  if has_table_privilege('authenticated', 'public.content_impressions', 'select') then
    raise exception 'У роли authenticated есть право select на показы контента';
  end if;
  if has_table_privilege('authenticated', 'public.app_admins', 'select')
     or has_table_privilege('anon', 'public.app_admins', 'select') then
    raise exception 'Список администраторов доступен клиентской роли';
  end if;
  -- Писать своё событие — можно, иначе аналитики просто не будет.
  if not has_table_privilege('authenticated', 'public.analytics_events', 'insert') then
    raise exception 'Вошедший не может записать собственное событие — аналитика мертва';
  end if;

  if public.is_app_admin() then
    raise exception 'is_app_admin() вернула true для обычного пользователя';
  end if;

  denied := false;
  begin
    perform * from public.admin_product_health(30);
  exception
    when others then denied := true;
  end;
  if not denied then
    raise exception 'admin_product_health отдала данные не-администратору';
  end if;

  -- В базе теста два пользователя — это меньше порога когорты.
  select * into pulse from public.together_pulse(7);
  if pulse.enough_people then
    raise exception 'together_pulse показала группу из двух человек';
  end if;
  if pulse.people_active <> 0 or pulse.episodes_resolved <> 0 then
    raise exception 'together_pulse ниже порога вернула ненулевые числа';
  end if;

  raise notice 'Аналитика: PASS (журнал закрыт, admin_product_health отказала, together_pulse молчит ниже порога)';
end
$$;

reset role;
