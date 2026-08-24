-- Аналитический слой прода — в репозиторий.
--
-- Та же история, что и с контентом: четыре таблицы существуют в базе с 17 августа
-- (миграции линии `r1_analytics_semantics`, `r1_funnel_reason_catalog`), в репозитории
-- их нет, приложение в них ничего не пишет. То есть измерять продукт сейчас нечем:
-- сколько людей дошло до первого эпизода, где они отваливаются, какая замена реально
-- помогает — ни на один вопрос ответа нет, хотя место, куда складывать ответы,
-- построено.
--
-- Схема снята интроспекцией. `create table if not exists` — в проде не меняет ничего.
--
-- Что здесь принципиально: RLS не «на всякий случай», а потому что таблица событий —
-- это карта поведения человека в момент зависимости. Клиент может писать только свои
-- события и не может читать ничего. Чтение — только через агрегирующие функции,
-- которые не выпускают наружу отдельную строку.

-- ---------------------------------------------------------------------------
-- Справочник причин
-- ---------------------------------------------------------------------------
-- Почему человек прервал сценарий, отказался от замены, закрыл карточку. Без
-- справочника это поле стало бы свалкой свободных строк, по которой нельзя считать.
create table if not exists public.analytics_reason_catalog (
  code text primary key,
  title_ru text not null,
  category_ru text not null,
  description_ru text not null default '',
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- События
-- ---------------------------------------------------------------------------
-- Одна широкая таблица, а не таблица на каждый тип события. Воронка продукта — это
-- последовательность разнородных шагов одного человека, и считать её проще, когда все
-- шаги лежат в одном месте с общим временем и общим user_id.
--
-- user_id обнуляется при удалении профиля, а не каскадит: человек, удаливший аккаунт,
-- забирает свои данные, но продуктовая статистика «сколько людей дошло до второго
-- эпизода» не должна задним числом переписываться. Событие остаётся, имя уходит.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  -- Шаг воронки: чтобы «где отваливаются» считалось запросом, а не разбором строк.
  funnel_stage text,
  -- Экран, на котором это произошло.
  surface text,
  product_type text check (product_type is null or product_type in ('cigarette', 'hookah', 'vape')),
  trigger_code text references public.triggers_catalog(code) on delete set null,
  replacement_code text references public.replacements_catalog(code) on delete set null,
  content_code text references public.awareness_content(code) on delete set null,
  outcome text,
  reason_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  numeric_value numeric,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  episode_id uuid references public.episodes(id) on delete set null,
  action_id uuid references public.episode_actions(id) on delete set null,
  tobacco_event_id uuid references public.tobacco_events(id) on delete set null
);

create index if not exists analytics_events_occurred_idx on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, occurred_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Показы контента
-- ---------------------------------------------------------------------------
-- Отдельно от событий, потому что вопрос другой: не «что сделал человек», а «эта
-- карточка вообще кому-нибудь помогла». `useful` — единственная обратная связь, и она
-- необязательная.
create table if not exists public.content_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_code text not null references public.awareness_content(code) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  moment text not null,
  product_type text check (product_type is null or product_type in ('cigarette', 'hookah', 'vape')),
  trigger_code text references public.triggers_catalog(code) on delete set null,
  useful boolean,
  shown_at timestamptz not null default now()
);

create index if not exists content_impressions_content_idx on public.content_impressions (content_code, shown_at desc);

-- ---------------------------------------------------------------------------
-- Ошибки
-- ---------------------------------------------------------------------------
-- Здоровье приложения. `message_fingerprint`, а не текст ошибки: текст может утащить
-- за собой пользовательские данные, отпечаток — нет, а сгруппировать по нему можно так
-- же хорошо.
create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  error_type text not null,
  error_code text,
  message_fingerprint text,
  duration_ms integer,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists system_errors_occurred_idx on public.system_errors (occurred_at desc);

-- ---------------------------------------------------------------------------
-- Доступ
-- ---------------------------------------------------------------------------
alter table public.analytics_reason_catalog enable row level security;
alter table public.analytics_events enable row level security;
alter table public.content_impressions enable row level security;
alter table public.system_errors enable row level security;

revoke all on public.analytics_reason_catalog from anon, authenticated;
revoke all on public.analytics_events from anon, authenticated;
revoke all on public.content_impressions from anon, authenticated;
revoke all on public.system_errors from anon, authenticated;

-- Справочник причин человек видит — из него собираются варианты ответа «почему не
-- подошло».
grant select on public.analytics_reason_catalog to anon, authenticated;
drop policy if exists analytics_reason_catalog_read on public.analytics_reason_catalog;
create policy analytics_reason_catalog_read on public.analytics_reason_catalog
  for select to anon, authenticated using (active = true);

-- Событие можно только положить, и только своё. Читать — нельзя, даже своё: экрана,
-- который показывает человеку его сырой журнал событий, в продукте нет, а право на
-- чтение, выданное «на будущее», однажды окажется выданным зря.
grant insert on public.analytics_events to authenticated;
drop policy if exists analytics_events_insert_own on public.analytics_events;
create policy analytics_events_insert_own on public.analytics_events
  for insert to authenticated with check (auth.uid() = user_id);

grant insert, update on public.content_impressions to authenticated;
drop policy if exists content_impressions_insert_own on public.content_impressions;
create policy content_impressions_insert_own on public.content_impressions
  for insert to authenticated with check (auth.uid() = user_id);
-- update — чтобы поставить `useful` на уже показанную карточку.
drop policy if exists content_impressions_update_own on public.content_impressions;
create policy content_impressions_update_own on public.content_impressions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ошибку можно записать и анонимно: до входа приложение тоже ломается, и именно эти
-- поломки дороже всего — человек уходит, не начав.
grant insert on public.system_errors to anon, authenticated;
drop policy if exists system_errors_insert on public.system_errors;
create policy system_errors_insert on public.system_errors
  for insert to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);
