-- ALIVE R1 — данные, доказательная база и админский контур.
-- Миграция расширяет существующую v3 schema без разрушительного переименования legacy-сущностей.

create schema if not exists private;

-- Авторизация админского контура. Функция живёт в неэкспонируемой схеме.
create or replace function private.is_alive_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

revoke all on function private.is_alive_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_alive_admin() to authenticated;

-- Категории Триггеров.
create table public.trigger_categories_catalog (
  code text primary key,
  title_ru text not null,
  description_ru text not null default '',
  sort_order integer not null default 100,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.triggers_catalog
  add column if not exists category_code text references public.trigger_categories_catalog(code),
  add column if not exists mechanism_code text,
  add column if not exists recognition_prompt_ru text,
  add column if not exists context_tags text[] not null default '{}'::text[];

-- Собственные Триггеры пользователя — полноценные сущности, а не только free text в episode.
create table public.user_triggers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_ru text not null,
  description_ru text not null default '',
  category_code text references public.trigger_categories_catalog(code),
  product_types text[] not null default array['cigarette','hookah','vape']::text[],
  context_tags text[] not null default '{}'::text[],
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.episodes
  add column if not exists user_trigger_id uuid references public.user_triggers(id) on delete set null;

alter table public.user_links
  add column if not exists trigger_code text references public.triggers_catalog(code),
  add column if not exists user_trigger_id uuid references public.user_triggers(id) on delete set null;

-- Категории и персональные Замены.
create table public.replacement_categories_catalog (
  code text primary key,
  title_ru text not null,
  description_ru text not null default '',
  sort_order integer not null default 100,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.replacements_catalog
  add column if not exists category_code text references public.replacement_categories_catalog(code),
  add column if not exists short_action_ru text,
  add column if not exists expected_duration_seconds integer check (expected_duration_seconds is null or expected_duration_seconds > 0),
  add column if not exists effort_level smallint check (effort_level is null or effort_level between 1 and 5),
  add column if not exists context_tags text[] not null default '{}'::text[],
  add column if not exists setting_tags text[] not null default '{}'::text[];

create table public.user_replacements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_ru text not null,
  instruction_ru text not null,
  category_code text references public.replacement_categories_catalog(code),
  product_types text[] not null default array['cigarette','hookah','vape']::text[],
  context_tags text[] not null default '{}'::text[],
  expected_duration_seconds integer check (expected_duration_seconds is null or expected_duration_seconds > 0),
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.user_replacement_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  replacement_code text not null references public.replacements_catalog(code) on delete cascade,
  enabled boolean not null default true,
  pinned boolean not null default false,
  personal_note_ru text,
  updated_at timestamptz not null default now(),
  primary key (user_id, replacement_code)
);

alter table public.episode_actions
  add column if not exists user_replacement_id uuid references public.user_replacements(id) on delete set null;

alter table public.user_links
  add column if not exists preferred_user_replacement_id uuid references public.user_replacements(id) on delete set null;

-- Контекстное ранжирование вместо одной плоской trigger→replacement map.
create table public.intervention_context_rules (
  id uuid primary key default gen_random_uuid(),
  trigger_code text references public.triggers_catalog(code) on delete cascade,
  replacement_code text references public.replacements_catalog(code) on delete cascade,
  product_type text check (product_type is null or product_type in ('cigarette','hookah','vape')),
  min_craving smallint check (min_craving is null or min_craving between 1 and 10),
  max_craving smallint check (max_craving is null or max_craving between 1 and 10),
  context_tags text[] not null default '{}'::text[],
  priority integer not null default 100,
  rationale_ru text not null default '',
  evidence_level text not null default 'гипотеза ALIVE' check (evidence_level in ('высокая уверенность','умеренная уверенность','предварительные данные','гипотеза ALIVE')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_craving is null or max_craving is null or min_craving <= max_craving)
);

-- «Зачем»: глобальные примеры + собственные цели/ценности пользователя.
create table public.goals_catalog (
  code text primary key,
  goal_type text not null check (goal_type in ('цель','ценность','направление')),
  title_ru text not null,
  body_ru text not null,
  reflection_prompt_ru text,
  context_tags text[] not null default '{}'::text[],
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_goal_code text references public.goals_catalog(code) on delete set null,
  source_meaning_id uuid references public.user_meanings(id) on delete set null,
  goal_type text not null default 'направление' check (goal_type in ('цель','ценность','направление')),
  title_ru text not null,
  body_ru text not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  context_tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index user_goals_source_meaning_unique
  on public.user_goals(user_id, source_meaning_id)
  where source_meaning_id is not null;

-- Доказательная база: источник → утверждение → пользовательская формулировка.
create table public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  title_original text not null,
  source_label_ru text not null,
  authors text,
  publication text,
  publication_date date,
  url text not null,
  doi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (url)
);

create table public.evidence_claims (
  code text primary key,
  topic text not null,
  claim_ru text not null,
  population_ru text,
  limitations_ru text not null default '',
  evidence_level text not null check (evidence_level in ('высокая уверенность','умеренная уверенность','предварительные данные','гипотеза ALIVE')),
  status text not null default 'черновик' check (status in ('черновик','проверено','архив')),
  last_reviewed_at date,
  review_due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence_claim_sources (
  claim_code text not null references public.evidence_claims(code) on delete cascade,
  source_id uuid not null references public.evidence_sources(id) on delete cascade,
  source_role text not null default 'основной' check (source_role in ('основной','поддерживающий','контекст')),
  primary key (claim_code, source_id)
);

create table public.awareness_content (
  code text primary key,
  content_type text not null check (content_type in ('факт','миф')),
  title_ru text not null,
  hook_ru text not null,
  explanation_ru text not null,
  motivation_ru text,
  caveat_ru text not null default '',
  claim_code text references public.evidence_claims(code) on delete restrict,
  product_types text[] not null default array['cigarette','hookah','vape']::text[],
  context_tags text[] not null default '{}'::text[],
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.awareness_content_contexts (
  content_code text not null references public.awareness_content(code) on delete cascade,
  trigger_code text references public.triggers_catalog(code) on delete cascade,
  product_type text check (product_type is null or product_type in ('cigarette','hookah','vape')),
  moment text not null default 'микроосознанность' check (moment in ('микроосознанность','после эпизода','путь','библиотека')),
  priority integer not null default 100,
  primary key (content_code, trigger_code, product_type, moment)
);

create table public.content_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_code text not null references public.awareness_content(code) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  moment text not null,
  product_type text check (product_type is null or product_type in ('cigarette','hookah','vape')),
  trigger_code text references public.triggers_catalog(code) on delete set null,
  useful boolean,
  shown_at timestamptz not null default now()
);

-- Продуктовая аналитика: только структурированные поля, без приватных текстов.
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  funnel_stage text,
  surface text,
  product_type text check (product_type is null or product_type in ('cigarette','hookah','vape')),
  trigger_code text references public.triggers_catalog(code) on delete set null,
  replacement_code text references public.replacements_catalog(code) on delete set null,
  content_code text references public.awareness_content(code) on delete set null,
  outcome text,
  reason_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  numeric_value numeric(14,4),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Только структурированная продуктовая телеметрия. Запрещены приватные заметки, тексты Зачем и свободные тексты Связок.';

create table public.system_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  error_type text not null,
  error_code text,
  message_fingerprint text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Триггеры updated_at.
create trigger trigger_categories_catalog_set_updated_at before update on public.trigger_categories_catalog
for each row execute function public.set_updated_at();
create trigger user_triggers_set_updated_at before update on public.user_triggers
for each row execute function public.set_updated_at();
create trigger replacement_categories_catalog_set_updated_at before update on public.replacement_categories_catalog
for each row execute function public.set_updated_at();
create trigger user_replacements_set_updated_at before update on public.user_replacements
for each row execute function public.set_updated_at();
create trigger user_replacement_preferences_set_updated_at before update on public.user_replacement_preferences
for each row execute function public.set_updated_at();
create trigger intervention_context_rules_set_updated_at before update on public.intervention_context_rules
for each row execute function public.set_updated_at();
create trigger goals_catalog_set_updated_at before update on public.goals_catalog
for each row execute function public.set_updated_at();
create trigger user_goals_set_updated_at before update on public.user_goals
for each row execute function public.set_updated_at();
create trigger evidence_sources_set_updated_at before update on public.evidence_sources
for each row execute function public.set_updated_at();
create trigger evidence_claims_set_updated_at before update on public.evidence_claims
for each row execute function public.set_updated_at();
create trigger awareness_content_set_updated_at before update on public.awareness_content
for each row execute function public.set_updated_at();

-- Индексы пользовательских и аналитических путей.
create index user_triggers_user_active_idx on public.user_triggers(user_id, active) where deleted_at is null;
create index user_replacements_user_active_idx on public.user_replacements(user_id, active) where deleted_at is null;
create index user_goals_user_active_idx on public.user_goals(user_id, active, priority desc) where deleted_at is null;
create index intervention_context_rules_trigger_idx on public.intervention_context_rules(trigger_code, product_type, priority) where enabled = true;
create index evidence_claims_review_idx on public.evidence_claims(status, review_due_at);
create index awareness_content_type_idx on public.awareness_content(content_type, published, sort_order);
create index content_impressions_user_time_idx on public.content_impressions(user_id, shown_at desc);
create index content_impressions_content_time_idx on public.content_impressions(content_code, shown_at desc);
create index analytics_events_time_idx on public.analytics_events(occurred_at desc);
create index analytics_events_type_time_idx on public.analytics_events(event_type, occurred_at desc);
create index analytics_events_funnel_time_idx on public.analytics_events(funnel_stage, occurred_at desc) where funnel_stage is not null;
create index analytics_events_user_time_idx on public.analytics_events(user_id, occurred_at desc) where user_id is not null;
create index analytics_events_product_time_idx on public.analytics_events(product_type, occurred_at desc) where product_type is not null;
create index system_errors_time_idx on public.system_errors(occurred_at desc);
create index system_errors_open_idx on public.system_errors(error_type, occurred_at desc) where resolved_at is null;

-- RLS.
alter table public.trigger_categories_catalog enable row level security;
alter table public.user_triggers enable row level security;
alter table public.replacement_categories_catalog enable row level security;
alter table public.user_replacements enable row level security;
alter table public.user_replacement_preferences enable row level security;
alter table public.intervention_context_rules enable row level security;
alter table public.goals_catalog enable row level security;
alter table public.user_goals enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.evidence_claim_sources enable row level security;
alter table public.awareness_content enable row level security;
alter table public.awareness_content_contexts enable row level security;
alter table public.content_impressions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.system_errors enable row level security;

-- Публичные каталоги доступны авторизованным пользователям только на чтение.
create policy trigger_categories_read on public.trigger_categories_catalog for select to authenticated using (published = true);
create policy replacement_categories_read on public.replacement_categories_catalog for select to authenticated using (published = true);
create policy intervention_context_rules_read on public.intervention_context_rules for select to authenticated using (enabled = true);
create policy goals_catalog_read on public.goals_catalog for select to authenticated using (published = true);
create policy evidence_sources_read on public.evidence_sources for select to authenticated using (true);
create policy evidence_claims_read on public.evidence_claims for select to authenticated using (status = 'проверено');
create policy evidence_claim_sources_read on public.evidence_claim_sources for select to authenticated using (exists (select 1 from public.evidence_claims c where c.code = claim_code and c.status = 'проверено'));
create policy awareness_content_read on public.awareness_content for select to authenticated using (published = true);
create policy awareness_content_contexts_read on public.awareness_content_contexts for select to authenticated using (exists (select 1 from public.awareness_content c where c.code = content_code and c.published = true));

-- Собственные пользовательские сущности.
create policy user_triggers_own on public.user_triggers for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_replacements_own on public.user_replacements for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_replacement_preferences_own on public.user_replacement_preferences for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_goals_own on public.user_goals for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy content_impressions_own on public.content_impressions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Аналитика: пользователь может добавить только свои structured events; читать общую аналитику может только admin.
create policy analytics_events_insert_own on public.analytics_events for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy analytics_events_admin_read on public.analytics_events for select to authenticated
using ((select private.is_alive_admin()));
create policy system_errors_insert_own on public.system_errors for insert to authenticated
with check (user_id is null or (select auth.uid()) = user_id);
create policy system_errors_admin_read on public.system_errors for select to authenticated
using ((select private.is_alive_admin()));

-- Админ может видеть статистику использования контента, но не чужие приватные заметки/Связки/Зачем.
create policy content_impressions_admin_read on public.content_impressions for select to authenticated
using ((select private.is_alive_admin()));

-- Grants — минимально необходимые права поверх RLS.
grant select on public.trigger_categories_catalog to authenticated;
grant select,insert,update,delete on public.user_triggers to authenticated;
grant select on public.replacement_categories_catalog to authenticated;
grant select,insert,update,delete on public.user_replacements to authenticated;
grant select,insert,update,delete on public.user_replacement_preferences to authenticated;
grant select on public.intervention_context_rules to authenticated;
grant select on public.goals_catalog to authenticated;
grant select,insert,update,delete on public.user_goals to authenticated;
grant select on public.evidence_sources to authenticated;
grant select on public.evidence_claims to authenticated;
grant select on public.evidence_claim_sources to authenticated;
grant select on public.awareness_content to authenticated;
grant select on public.awareness_content_contexts to authenticated;
grant select,insert,update,delete on public.content_impressions to authenticated;
grant select,insert on public.analytics_events to authenticated;
grant select,insert on public.system_errors to authenticated;

-- Базовая русская таксономия.
insert into public.trigger_categories_catalog(code,title_ru,description_ru,sort_order) values
('ритуал','Ритуал и привычка','Ситуации, где употребление стало автоматическим продолжением действия.',10),
('эмоции','Эмоции и напряжение','Стресс, раздражение, тревога и другие эмоциональные состояния.',20),
('переход','Переход между делами','Начало, завершение или переключение между действиями.',30),
('социальное','Люди и общение','Компания, разговоры, принадлежность и социальные ритуалы.',40),
('среда','Место и доступность','Контексты, где само окружение запускает действие.',50),
('физиология','Физиологическая тяга','Состояния, где существенна никотиновая отмена или телесный импульс.',60)
on conflict(code) do update set title_ru=excluded.title_ru,description_ru=excluded.description_ru,sort_order=excluded.sort_order;

insert into public.replacement_categories_catalog(code,title_ru,description_ru,sort_order) values
('движение','Движение','Короткая физическая активность и смена положения тела.',10),
('дыхание','Дыхание','Короткие дыхательные способы изменить состояние.',20),
('внимание','Внимание и ощущения','Сенсорное переключение, наблюдение и заземление.',30),
('напиток','Напиток и пауза','Вода, чай и другие нейтральные ритуалы паузы.',40),
('еда','Еда','Ограниченные пищевые варианты без автоматического заедания тяги.',50),
('мысль','Мысль и запись','Короткая запись, переоценка или завершение мыслительного цикла.',60),
('музыка','Музыка','Осознанное музыкальное переключение.',70),
('общение','Контакт с человеком','Социальная поддержка и короткий контакт.',80),
('среда','Изменение среды','Удаление устройства, смена места, маршрута или доступности.',90),
('зачем','Вернуться к своему «Зачем»','Связь конкретного выбора с личной целью или ценностью.',100),
('лечение','Поддержка выбранного лечения','Действия в рамках уже выбранной доказательной стратегии прекращения.',110)
on conflict(code) do update set title_ru=excluded.title_ru,description_ru=excluded.description_ru,sort_order=excluded.sort_order;

-- Мягко классифицируем существующий каталог без изменения прежнего category.
update public.replacements_catalog set category_code = case
  when category in ('movement','physical') then 'движение'
  when category = 'breath' then 'дыхание'
  when category = 'sensory' then 'внимание'
  when category = 'drink' then 'напиток'
  when category = 'food' then 'еда'
  when category in ('journal','cognitive') then 'мысль'
  when category = 'music' then 'музыка'
  when category in ('social','connection') then 'общение'
  when category = 'environment' then 'среда'
  when category = 'meaning' then 'зачем'
  when category = 'nrt' then 'лечение'
  else category_code
end
where category_code is null;

-- Переносим существующие личные «Смыслы» в новую сущность «Зачем» без удаления исходников.
insert into public.user_goals(user_id,source_meaning_id,goal_type,title_ru,body_ru,priority,active,created_at,updated_at)
select m.user_id,m.id,'направление',m.title,m.body,3,m.active,m.created_at,m.updated_at
from public.user_meanings m
where m.deleted_at is null
on conflict (user_id,source_meaning_id) where source_meaning_id is not null do nothing;
