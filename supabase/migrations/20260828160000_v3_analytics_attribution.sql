-- Пять дыр в слое событий, из-за которых не считается воронка.
--
-- Слой событий у продукта есть с августа: `analytics_events` с продуктовой семантикой и
-- десять триггеров, которые пишут в неё сами. Он записывает **факты, дошедшие до базы**,
-- и ничего из того, что происходит до записи и вместо неё.
--
-- 1. Событие до входа записать нельзя: `user_id` ссылается на `profiles`, политика
--    требует `auth.uid() = user_id`. Шаг «зашёл на сайт → зарегистрировался» не
--    считается вообще — ни этой базой, ни счётчиком, который не знает, чем кончилось.
-- 2. Нет сессии: не отличить «заходил трижды по разу» от «сидел час», и не увидеть,
--    что человек бросил сценарий тяги на третьем экране. Обрыв — главный признак,
--    по которому отвал отличается от успеха.
-- 3. Нет источника: откуда человек пришёл, не хранится нигде.
-- 4. Нет версии сборки: регресс после выкладки не увидеть, хотя отпечаток сборки
--    на клиенте уже есть — его просто некуда положить.
-- 5. Нет географии.
--
-- Чего здесь намеренно нет: таблиц под уведомления. Пуши запланированы, но правило
-- «не строить инфраструктуру на будущее без gate» сильнее удобства. `event_type` —
-- свободный текст, коды уведомлений лягут в него без миграции.

-- ---------------------------------------------------------------- события

alter table public.analytics_events
  -- Кто, когда человек ещё не человек для базы: случайный идентификатор в браузере.
  add column if not exists visitor_id uuid,
  add column if not exists session_id uuid,
  -- Отпечаток сборки. Без него «сломалось после релиза» — это ощущение, а не факт.
  add column if not exists app_version text,
  add column if not exists platform text,
  -- Время на устройстве рядом с серверным: запись из офлайна доедет позже, и без
  -- этой пары у неё будет время доставки вместо времени события.
  add column if not exists client_ts timestamptz;

comment on column public.analytics_events.visitor_id is
  'Анонимный посетитель. Заполняется до входа; после регистрации связь ищется через analytics_visitors.claimed_by.';

create index if not exists analytics_events_visitor on public.analytics_events (visitor_id, occurred_at desc)
  where visitor_id is not null;
create index if not exists analytics_events_session on public.analytics_events (session_id, occurred_at)
  where session_id is not null;
create index if not exists analytics_events_type_time on public.analytics_events (event_type, occurred_at desc);

-- ---------------------------------------------------------------- посетители

create table if not exists public.analytics_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  -- Откуда пришёл. Разбор в один заход, при первом визите: потом реферер уже не узнать.
  source_kind text check (source_kind in ('direct', 'search', 'social', 'referral', 'campaign')),
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer_host text,
  landing_path text,
  -- География без адреса: часовой пояс и язык браузера. Это не геолокация и не претендует
  -- ею быть — IP не хранится вовсе. Точную географию даёт Метрика; здесь — то, что можно
  -- узнать, ничего не спрашивая и ничего не отдавая.
  client_timezone text,
  client_language text,
  -- Идентификатор клиента Метрики. Ради одного: свести свою воронку с её отчётом об
  -- источниках. Сам по себе он никуда не ведёт и человека не называет.
  metrika_client_id text,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz
);

comment on table public.analytics_visitors is
  'Анонимный посетитель до регистрации и его источник. Личных данных нет: ни IP, ни адреса, ни текста.';

create index if not exists analytics_visitors_claimed on public.analytics_visitors (claimed_by)
  where claimed_by is not null;

alter table public.analytics_visitors enable row level security;

-- Прямых прав у ролей приложения нет вовсе: и запись, и связывание идут через функции
-- ниже. Политика на upsert не написать так, чтобы анонимный клиент не мог переписать
-- чужую строку — а функция это решает целиком.
drop policy if exists analytics_visitors_admin_read on public.analytics_visitors;
create policy analytics_visitors_admin_read on public.analytics_visitors
  for select to authenticated using ((select private.is_alive_admin()));

-- ---------------------------------------------------------------- запись до входа

-- Отметить визит и запомнить источник. Идемпотентна: источник пишется один раз, при
-- первом визите, дальше двигается только last_seen_at.
create or replace function public.alive_touch_visitor(
  p_visitor uuid,
  p_source_kind text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_referrer_host text default null,
  p_landing_path text default null,
  p_timezone text default null,
  p_language text default null,
  p_metrika_client_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_visitors as v (
    visitor_id, source_kind, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer_host, landing_path, client_timezone, client_language, metrika_client_id
  ) values (
    p_visitor,
    nullif(left(p_source_kind, 16), ''),
    nullif(left(p_utm_source, 64), ''), nullif(left(p_utm_medium, 64), ''),
    nullif(left(p_utm_campaign, 64), ''), nullif(left(p_utm_content, 64), ''),
    nullif(left(p_utm_term, 64), ''),
    nullif(left(p_referrer_host, 128), ''), nullif(left(p_landing_path, 128), ''),
    nullif(left(p_timezone, 64), ''), nullif(left(p_language, 16), ''),
    nullif(left(p_metrika_client_id, 64), '')
  )
  on conflict (visitor_id) do update
    set last_seen_at = now(),
        -- Идентификатор Метрики появляется позже первого кадра: её скрипт грузится
        -- асинхронно. Поэтому его — дописываем, а источник — нет.
        metrika_client_id = coalesce(v.metrika_client_id, excluded.metrika_client_id);
end;
$$;

-- Событие от того, кто ещё не вошёл. Приписать его человеку нельзя по построению:
-- user_id всегда null, что бы клиент ни прислал.
create or replace function public.alive_record_anon_event(
  p_visitor uuid,
  p_session uuid,
  p_event_type text,
  p_surface text default null,
  p_funnel_stage text default null,
  p_app_version text default null,
  p_platform text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if p_visitor is null or p_event_type is null then
    return;
  end if;

  -- Точка записи открыта наружу, значит в неё будут лить. Пятьсот событий в час с одного
  -- посетителя — это уже не человек; дальше молча не пишем, чтобы не разносить таблицу.
  select count(*) into recent
  from public.analytics_events
  where visitor_id = p_visitor and occurred_at > now() - interval '1 hour';
  if recent > 500 then
    return;
  end if;

  insert into public.analytics_events (
    user_id, visitor_id, session_id, event_type, surface, funnel_stage,
    app_version, platform, metadata, client_ts
  ) values (
    null, p_visitor, p_session,
    left(p_event_type, 64), nullif(left(p_surface, 64), ''), nullif(left(p_funnel_stage, 32), ''),
    nullif(left(p_app_version, 64), ''), nullif(left(p_platform, 32), ''),
    coalesce(p_metadata, '{}'::jsonb), now()
  );
end;
$$;

-- Связать посетителя с человеком. Вызывается один раз, сразу после регистрации.
-- Чужого посетителя присвоить нельзя: строка берётся только непривязанная.
create or replace function public.alive_claim_visitor(p_visitor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_visitor is null then
    return;
  end if;
  update public.analytics_visitors
     set claimed_by = auth.uid(), claimed_at = now()
   where visitor_id = p_visitor and claimed_by is null;
end;
$$;

revoke all on function public.alive_touch_visitor(uuid, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.alive_record_anon_event(uuid, uuid, text, text, text, text, text, jsonb) from public;
revoke all on function public.alive_claim_visitor(uuid) from public;

grant execute on function public.alive_touch_visitor(uuid, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.alive_record_anon_event(uuid, uuid, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.alive_claim_visitor(uuid) to authenticated;

-- ---------------------------------------------------------------- история исходного уровня

-- Дыра H-001: `user_nicotine_products.baseline` перезаписывается при каждом сохранении
-- настроек. Исходный уровень, относительно которого считается вся польза продукта,
-- исчезал вместе с прошлой версией строки. Вторая опорная метрика — снижение расхода
-- против исходного уровня — без этой таблицы не считается вообще.
create table if not exists public.user_baseline_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_type text not null check (product_type in ('cigarette', 'hookah', 'vape')),
  baseline jsonb not null,
  valid_from timestamptz not null default now()
);

create index if not exists user_baseline_history_user
  on public.user_baseline_history (user_id, product_type, valid_from desc);

comment on table public.user_baseline_history is
  'Версии исходного уровня расхода. Строки не изменяются и не удаляются: пересчёт моделей не должен переписывать историю.';

alter table public.user_baseline_history enable row level security;

drop policy if exists user_baseline_history_select_own on public.user_baseline_history;
create policy user_baseline_history_select_own on public.user_baseline_history
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists user_baseline_history_admin_read on public.user_baseline_history;
create policy user_baseline_history_admin_read on public.user_baseline_history
  for select to authenticated using ((select private.is_alive_admin()));

-- Пишет триггер, а не приложение: иначе первая же забытая правка кода снова оставит
-- метрику без истории, и обнаружится это через месяц.
create or replace function public.alive_snapshot_baseline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.baseline is distinct from old.baseline then
    insert into public.user_baseline_history (user_id, product_type, baseline)
    values (new.user_id, new.product_type, new.baseline);
  end if;
  return new;
end;
$$;

drop trigger if exists user_nicotine_products_snapshot_baseline on public.user_nicotine_products;
create trigger user_nicotine_products_snapshot_baseline
  after insert or update of baseline on public.user_nicotine_products
  for each row execute function public.alive_snapshot_baseline();

-- Текущие значения становятся первой версией. Без этого у всех, кто завёл продукт до
-- сегодняшнего дня, история начнётся с их следующей правки — то есть, скорее всего, никогда.
insert into public.user_baseline_history (user_id, product_type, baseline, valid_from)
select p.user_id, p.product_type, p.baseline, p.created_at
from public.user_nicotine_products p
where p.baseline <> '{}'::jsonb
  and not exists (
    select 1 from public.user_baseline_history h
    where h.user_id = p.user_id and h.product_type = p.product_type
  );
