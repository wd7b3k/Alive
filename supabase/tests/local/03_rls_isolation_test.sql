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
-- Один источник на всех: после 20260825140000 карточка ссылается на библиографию,
-- а не носит ссылку внутри себя.
insert into public.evidence_sources (id, source_type, title_original, source_label_ru, url)
values ('00000000-0000-4000-8000-00000000cafe', 'публикация', 'Test source', 'Тестовый источник',
        'https://example.test/source')
on conflict (url) do nothing;

insert into public.facts_catalog
  (code, title, short_text, full_text, changes_ru, category, evidence_kind,
   source_id, last_verified_at, published, surfaces)
values
  ('t_fact_published', 'Опубликованный факт', 'что известно', 'границы', 'что это меняет',
   'behavior', 'guideline', '00000000-0000-4000-8000-00000000cafe', current_date, true,
   array['today']::text[]),
  ('t_fact_draft', 'Черновик факта', 'что известно', 'границы', 'что это меняет',
   'behavior', 'guideline', '00000000-0000-4000-8000-00000000cafe', current_date, false,
   '{}'::text[])
on conflict (code) do nothing;

insert into public.myths_catalog
  (code, title, short_reframe, explanation, changes_ru, mechanism,
   source_id, last_verified_at, published, surfaces)
values
  ('t_myth_published', 'Опубликованный миф', 'что известно', 'механизм', 'что это меняет',
   'cue_association', '00000000-0000-4000-8000-00000000cafe', current_date, true, '{}'::text[]),
  ('t_myth_draft', 'Черновик мифа', 'что известно', 'механизм', 'что это меняет',
   'cue_association', '00000000-0000-4000-8000-00000000cafe', current_date, false, '{}'::text[])
on conflict (code) do nothing;

-- Одно чужое событие в журнале: без него проверка «обычный пользователь читает ноль
-- строк» прошла бы и на распахнутой политике, потому что читать было бы нечего.
insert into public.analytics_events (user_id, event_type)
values ('22222222-2222-2222-2222-222222222222', 'test_probe');

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
  -- Проверка не «сколько строк всего» — с 20260816211120 каталог засеян настоящим
  -- контентом, и любое число здесь через месяц станет неверным. Проверяется свойство:
  -- ни одной неопубликованной строки наружу, и опубликованная видна.
  select count(*) into visible from public.facts_catalog where published = false;
  if visible <> 0 then
    raise exception 'LEAK: до входа видно % неопубликованных фактов', visible;
  end if;
  select count(*) into visible from public.facts_catalog where code = 't_fact_published';
  if visible <> 1 then
    raise exception 'Опубликованный факт не читается до входа';
  end if;

  select count(*) into visible from public.myths_catalog where published = false;
  if visible <> 0 then
    raise exception 'LEAK: до входа видно % неопубликованных мифов', visible;
  end if;
  select count(*) into visible from public.myths_catalog where code = 't_myth_published';
  if visible <> 1 then
    raise exception 'Опубликованный миф не читается до входа';
  end if;

  select count(*) into visible from public.goals_catalog where published = false;
  if visible <> 0 then
    raise exception 'LEAK: до входа видно % неопубликованных целей', visible;
  end if;

  -- Библиография и слой микроосознанности: строк локально нет, поэтому проверяется
  -- ровно то, что здесь и может сломаться — что select вообще разрешён. Без гранта или
  -- политики это упало бы на insufficient_privilege, а не вернуло ноль.
  perform 1 from public.evidence_sources limit 1;
  perform 1 from public.evidence_claims limit 1;
  perform 1 from public.evidence_claim_sources limit 1;
  perform 1 from public.awareness_content limit 1;
  perform 1 from public.awareness_content_contexts limit 1;

  -- На каждой таблице каталога ровно одна разрешающая политика на чтение. Две
  -- политики с одинаковым условием работают, но правку получает только одна из них, и
  -- следующий человек будет менять доступ, не понимая, почему ничего не меняется.
  select count(*) into visible from pg_policies
   where schemaname = 'public' and tablename = 'facts_catalog' and cmd = 'SELECT';
  if visible <> 1 then
    raise exception 'На facts_catalog % политик чтения вместо одной', visible;
  end if;
  select count(*) into visible from pg_policies
   where schemaname = 'public' and tablename = 'myths_catalog' and cmd = 'SELECT';
  if visible <> 1 then
    raise exception 'На myths_catalog % политик чтения вместо одной', visible;
  end if;

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
    -- выходят только агрегаты из get_together_summary.
    'analytics_events','content_impressions','system_errors'
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
  -- До входа ошибку записать можно — иначе поломки на публичных экранах не видит
  -- никто. Но только безымянную: приписать ошибку человеку анонимный клиент не может.
  begin
    insert into public.system_errors (user_id, surface, error_type)
    values (null, 'public-home', 'TestError');
  exception
    when others then raise exception 'anon не может записать ошибку до входа: %', sqlerrm;
  end;

  begin
    insert into public.system_errors (user_id, surface, error_type)
    values ('22222222-2222-2222-2222-222222222222', 'public-home', 'TestError');
    raise exception 'LEAK: anon приписал ошибку конкретному человеку';
  exception
    when insufficient_privilege then null;
    when check_violation then null;
    when others then
      if sqlerrm like 'LEAK:%' then raise; end if;
  end;

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
--   * схема private, где лежит allowlist администраторов, должна быть недоступна
--     клиентским ролям целиком;
--   * get_together_summary на маленькой группе обязана подавлять разбивку. «Один
--     человек ниже своего baseline» в группе из двух — это указание пальцем.
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
declare
  visible int;
  denied boolean;
  pulse jsonb;
begin
  -- Журнал событий закрыт политикой, а не отсутствием гранта: PostgREST требует
  -- grant, чтобы вообще увидеть таблицу, и настоящим замком служит
  -- analytics_events_admin_read (20260817170000). Поэтому проверяется результат, а не
  -- право — и проверяется на непустой таблице: на пустой этот тест прошёл бы и с
  -- политикой `using (true)`.
  select count(*) into visible from public.analytics_events;
  if visible <> 0 then
    raise exception 'LEAK: обычный пользователь читает % строк журнала событий', visible;
  end if;
  select count(*) into visible from public.system_errors;
  if visible <> 0 then
    raise exception 'LEAK: обычный пользователь читает системные ошибки';
  end if;

  -- Своё событие записать можно, иначе аналитики просто не будет.
  if not has_table_privilege('authenticated', 'public.analytics_events', 'insert') then
    raise exception 'Вошедший не может записать собственное событие — аналитика мертва';
  end if;

  -- usage на схему private у authenticated есть намеренно: без него нельзя вызвать
  -- private.is_alive_admin(), а её вызывают сами политики. Закрыта должна быть таблица
  -- со списком администраторов, и проверять надо именно её — а не схему, отобрав usage
  -- у которой мы сломали бы все политики разом.
  if has_table_privilege('authenticated', 'private.alive_admin_allowlist', 'select')
     or has_table_privilege('anon', 'private.alive_admin_allowlist', 'select') then
    raise exception 'Список администраторов доступен клиентской роли';
  end if;

  -- Сводка здоровья продукта обязана отказать обычному пользователю: она security
  -- definer и внутри читает всё.
  denied := false;
  begin
    perform * from public.admin_product_health(30);
  exception
    when others then denied := true;
  end;
  if not denied then
    raise exception 'admin_product_health отдала данные не-администратору';
  end if;

  -- «Вместе» отдаёт get_together_summary (20260816211200). Проверяется то, ради чего
  -- у неё вообще есть порог: на группе из двух человек разбивка по baseline должна быть
  -- подавлена, а не показана. Иначе «один человек ниже своего baseline» указывает
  -- пальцем на конкретного человека.
  pulse := public.get_together_summary(7);
  if pulse is null then
    raise exception 'get_together_summary не ответила вошедшему';
  end if;
  if (pulse -> 'baseline' ->> 'suppressed') <> 'true' then
    raise exception 'get_together_summary не подавила разбивку на группе из двух человек';
  end if;
  if pulse ? 'user_id' or pulse::text like '%private_note%' then
    raise exception 'В сводку «Вместе» попало что-то персональное';
  end if;

  -- Библиография одна. Если колонки-дубликаты вернутся на каталог, ссылку снова
  -- придётся чинить в трёх местах, и разойдётся уже не схема, а факты.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name in ('facts_catalog', 'myths_catalog', 'replacements_catalog')
       and column_name in ('source_title', 'source_url')
  ) then
    raise exception 'На каталоге снова появилась встроенная ссылка вместо source_id';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'facts_catalog' and column_name = 'source_id'
  ) then
    raise exception 'facts_catalog потерял ссылку на библиографию';
  end if;

  raise notice 'Аналитика и «Вместе»: PASS (журнал закрыт, private недоступна, сводка подавлена ниже порога)';
end
$$;

reset role;
