-- ALIVE v3.0 Platform — initial durable schema.
-- REPO is source of truth: changes to this schema must be delivered by versioned migrations.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'participant' check (role in ('participant', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  locale text,
  timezone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  food_replacements_enabled boolean not null default true,
  nrt_enabled boolean not null default true,
  fruit_cutoff_time time not null default '20:00',
  methodology_version text not null default 'alive-method-v1',
  equivalence_model_id text not null default 'alive-equivalence-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_nicotine_products (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_type text not null check (product_type in ('cigarette', 'hookah', 'vape')),
  role text not null default 'target_dependency' check (role in ('target_dependency', 'cessation_bridge')),
  enabled boolean not null default true,
  baseline jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_type)
);

create table public.methodology_versions (
  id text primary key,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  description text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.equivalence_models (
  id text primary key,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.equivalence_weights (
  model_id text not null references public.equivalence_models(id) on delete cascade,
  product_type text not null check (product_type in ('cigarette', 'hookah', 'vape')),
  raw_unit text not null,
  alive_units_per_raw_unit numeric(12,6) not null check (alive_units_per_raw_unit >= 0),
  explanation text not null,
  primary key (model_id, product_type)
);

create table public.triggers_catalog (
  code text primary key,
  title text not null,
  description text not null default '',
  product_types text[] not null default array['cigarette','hookah','vape']::text[],
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.needs_catalog (
  code text primary key,
  title text not null,
  description text not null default '',
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.replacements_catalog (
  code text primary key,
  title text not null,
  instruction text not null,
  category text not null,
  need_codes text[] not null default '{}'::text[],
  product_types text[] not null default array['cigarette','hookah','vape']::text[],
  eligibility jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meanings_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_product text not null check (target_product in ('cigarette', 'hookah', 'vape')),
  trigger_code text references public.triggers_catalog(code),
  custom_trigger_text text,
  need_code text references public.needs_catalog(code),
  craving_before smallint check (craving_before between 1 and 10),
  craving_after smallint check (craving_after between 1 and 10),
  outcome text check (outcome in ('open', 'successful_response', 'nicotine_used', 'abandoned')),
  helpfulness smallint check (helpfulness between 1 and 5),
  private_note text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.episode_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  action_type text not null check (action_type in ('replacement', 'food', 'drink', 'nrt', 'cigarette', 'hookah', 'vape')),
  replacement_code text references public.replacements_catalog(code),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.tobacco_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  product_type text not null check (product_type in ('cigarette', 'hookah', 'vape')),
  cigarette_quantity numeric(8,2),
  hookah_session_count numeric(8,2),
  hookah_duration_minutes integer,
  vape_puffs integer,
  vape_device_type text check (vape_device_type is null or vape_device_type in ('disposable', 'pod', 'refillable')),
  vape_nicotine_concentration_mg_ml numeric(8,3),
  vape_liquid_ml numeric(8,3),
  cost_actual_rub numeric(12,2),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.user_meanings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  situation text not null,
  need_code text references public.needs_catalog(code),
  impulse text,
  habitual_response text,
  preferred_replacement_code text references public.replacements_catalog(code),
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.ugc_submissions (
  id uuid primary key default gen_random_uuid(),
  source_user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('meaning', 'link', 'replacement')),
  source_entity_id uuid,
  content_snapshot jsonb not null,
  attribution_allowed boolean not null default false,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'published', 'rejected', 'merged')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index episodes_user_started_idx on public.episodes (user_id, started_at desc) where deleted_at is null;
create index tobacco_events_user_occurred_idx on public.tobacco_events (user_id, occurred_at desc) where deleted_at is null;
create index episode_actions_user_episode_idx on public.episode_actions (user_id, episode_id);
create index user_meanings_user_idx on public.user_meanings (user_id) where deleted_at is null;
create index user_links_user_idx on public.user_links (user_id) where deleted_at is null;
create index ugc_submissions_user_idx on public.ugc_submissions (source_user_id, submitted_at desc);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();
create trigger user_nicotine_products_set_updated_at before update on public.user_nicotine_products
for each row execute function public.set_updated_at();
create trigger triggers_catalog_set_updated_at before update on public.triggers_catalog
for each row execute function public.set_updated_at();
create trigger needs_catalog_set_updated_at before update on public.needs_catalog
for each row execute function public.set_updated_at();
create trigger replacements_catalog_set_updated_at before update on public.replacements_catalog
for each row execute function public.set_updated_at();
create trigger meanings_catalog_set_updated_at before update on public.meanings_catalog
for each row execute function public.set_updated_at();
create trigger episodes_set_updated_at before update on public.episodes
for each row execute function public.set_updated_at();
create trigger user_meanings_set_updated_at before update on public.user_meanings
for each row execute function public.set_updated_at();
create trigger user_links_set_updated_at before update on public.user_links
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'participant'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.raw_user_meta_data ->> 'locale'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_nicotine_products enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_actions enable row level security;
alter table public.tobacco_events enable row level security;
alter table public.user_meanings enable row level security;
alter table public.user_links enable row level security;
alter table public.ugc_submissions enable row level security;
alter table public.methodology_versions enable row level security;
alter table public.equivalence_models enable row level security;
alter table public.equivalence_weights enable row level security;
alter table public.triggers_catalog enable row level security;
alter table public.needs_catalog enable row level security;
alter table public.replacements_catalog enable row level security;
alter table public.meanings_catalog enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy user_settings_all_own on public.user_settings for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_nicotine_products_all_own on public.user_nicotine_products for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy episodes_all_own on public.episodes for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy episode_actions_all_own on public.episode_actions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tobacco_events_all_own on public.tobacco_events for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_meanings_all_own on public.user_meanings for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_links_all_own on public.user_links for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ugc_submissions_all_own on public.ugc_submissions for all to authenticated
using ((select auth.uid()) = source_user_id) with check ((select auth.uid()) = source_user_id);

create policy methodology_versions_read_published on public.methodology_versions for select to authenticated
using (status = 'published');
create policy equivalence_models_read_published on public.equivalence_models for select to authenticated
using (status = 'published');
create policy equivalence_weights_read_published on public.equivalence_weights for select to authenticated
using (exists (
  select 1 from public.equivalence_models m
  where m.id = model_id and m.status = 'published'
));
create policy triggers_catalog_read_published on public.triggers_catalog for select to authenticated
using (published = true);
create policy needs_catalog_read_published on public.needs_catalog for select to authenticated
using (published = true);
create policy replacements_catalog_read_published on public.replacements_catalog for select to authenticated
using (published = true);
create policy meanings_catalog_read_published on public.meanings_catalog for select to authenticated
using (published = true);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_nicotine_products to authenticated;
grant select, insert, update, delete on public.episodes to authenticated;
grant select, insert, update, delete on public.episode_actions to authenticated;
grant select, insert, update, delete on public.tobacco_events to authenticated;
grant select, insert, update, delete on public.user_meanings to authenticated;
grant select, insert, update, delete on public.user_links to authenticated;
grant select, insert, update, delete on public.ugc_submissions to authenticated;
grant select on public.methodology_versions to authenticated;
grant select on public.equivalence_models to authenticated;
grant select on public.equivalence_weights to authenticated;
grant select on public.triggers_catalog to authenticated;
grant select on public.needs_catalog to authenticated;
grant select on public.replacements_catalog to authenticated;
grant select on public.meanings_catalog to authenticated;

insert into public.methodology_versions (id, title, status, description, published_at)
values ('alive-method-v1', 'ALIVE Method v1', 'published', 'Экспериментальная behavioural methodology ALIVE v1.', now())
on conflict (id) do nothing;

insert into public.equivalence_models (id, title, status, description)
values ('alive-equivalence-v1', 'ALIVE Equivalence v1', 'published', 'Behavioural normalization; не является медицинским эквивалентом вреда или никотина.')
on conflict (id) do nothing;

insert into public.equivalence_weights (model_id, product_type, raw_unit, alive_units_per_raw_unit, explanation)
values
  ('alive-equivalence-v1', 'cigarette', 'cigarette', 1, '1 сигарета = 1 ALIVE unit.'),
  ('alive-equivalence-v1', 'hookah', 'session', 10, '1 кальянная сессия = 10 ALIVE units — рабочая behavioural эвристика.'),
  ('alive-equivalence-v1', 'vape', 'puff', 0.1, '10 затяжек = 1 ALIVE unit — рабочая behavioural эвристика.')
on conflict (model_id, product_type) do nothing;

insert into public.needs_catalog (code, title, description, sort_order)
values
  ('release_tension', 'Сбросить напряжение', 'Нужно уменьшить внутреннее напряжение или тревогу.', 10),
  ('pause', 'Сделать паузу', 'Нужно остановиться и получить короткое пространство без задач.', 20),
  ('pleasure', 'Получить удовольствие', 'Нужен приятный сенсорный или эмоциональный опыт.', 30),
  ('switch', 'Переключиться', 'Нужно сменить фокус и выйти из текущего автоматизма.', 40),
  ('closure', 'Завершить', 'Нужен ритуал окончания задачи, еды, разговора или другого цикла.', 50),
  ('solitude', 'Побыть с собой', 'Нужно несколько минут без входящего потока.', 60),
  ('meaning', 'Вернуться к смыслу', 'Нужно вспомнить, ради чего вообще меняется привычка.', 70),
  ('connection', 'Быть с человеком', 'Нужен контакт, присутствие или общение.', 80),
  ('stimulation', 'Взбодриться', 'Нужна стимуляция, энергия или ощущение движения.', 90),
  ('oral_sensory', 'Занять рот и руки', 'Нужна оральная или ручная сенсорная стимуляция.', 100)
on conflict (code) do nothing;

insert into public.triggers_catalog (code, title, description, product_types, sort_order)
values
  ('morning', 'После пробуждения', 'Начало дня и привычный утренний сценарий.', array['cigarette','vape']::text[], 10),
  ('coffee', 'Кофе', 'Кофе или другой привычный напиток.', array['cigarette','vape']::text[], 20),
  ('after_meal', 'После еды', 'Завершение еды.', array['cigarette','vape','hookah']::text[], 30),
  ('phone', 'Телефон / скроллинг', 'Автоматизм рядом с телефоном и входящим потоком.', array['cigarette','vape']::text[], 40),
  ('work_computer', 'Работа за компьютером', 'Долгая концентрация, микропаузa или фоновое парение.', array['cigarette','vape']::text[], 50),
  ('tension', 'Напряжение / сложная мысль', 'Эмоциональное или когнитивное напряжение.', array['cigarette','vape','hookah']::text[], 60),
  ('after_task', 'После завершённого дела', 'Привычная награда или ритуал закрытия задачи.', array['cigarette','vape']::text[], 70),
  ('driving', 'За рулём', 'Автоматизм во время поездки.', array['cigarette','vape']::text[], 80),
  ('social', 'Компания / общение', 'Социальный ритуал или желание быть частью общего действия.', array['cigarette','vape','hookah']::text[], 90),
  ('evening', 'Вечер / отдых', 'Переход к отдыху.', array['cigarette','vape','hookah']::text[], 100),
  ('boredom', 'Скука', 'Нужна стимуляция или заполнение пустого промежутка.', array['cigarette','vape','hookah']::text[], 110),
  ('before_sleep', 'Перед сном', 'Последний вечерний ритуал.', array['cigarette','vape']::text[], 120),
  ('other', 'Другое', 'Если подходящего варианта пока нет — это сигнал улучшать общий каталог.', array['cigarette','vape','hookah']::text[], 999)
on conflict (code) do nothing;

insert into public.replacements_catalog (code, title, instruction, category, need_codes, product_types, eligibility, sort_order)
values
  ('long_exhale', '90 секунд длинного выдоха', 'Поставь стопы на опору и сделай 8–10 спокойных циклов, оставляя выдох заметно длиннее вдоха.', 'breath', array['release_tension']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 10),
  ('tea_pause', 'Чай как отдельная пауза', 'Сделай чай и три минуты не открывай телефон: только вкус, температура и пауза.', 'drink', array['pause','pleasure']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 20),
  ('water', 'Стакан воды', 'Медленно выпей стакан воды и только после этого реши, что делать дальше.', 'drink', array['pause','oral_sensory']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 30),
  ('short_walk', 'Короткая прогулка', 'Пройди 3–5 минут без телефона и заметь шаг, воздух и пространство вокруг.', 'movement', array['release_tension','switch','stimulation']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 40),
  ('favorite_song', 'Одна любимая песня', 'Включи одну песню, которую действительно хочешь услышать, и не листай ничего параллельно.', 'music', array['pleasure','switch']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 50),
  ('meaning_read', 'Прочитать свои Смыслы', 'Открой свои причины изменения привычки и прочитай их медленно как собственный выбор, а не лозунг.', 'meaning', array['meaning']::text[], array['cigarette','vape','hookah']::text[], '{}'::jsonb, 60),
  ('fruit_portion', 'Одна порция фруктов', 'Выбери одну обычную порцию фрукта. ALIVE не будет предлагать фрукт при каждой тяге и учитывает время суток.', 'food', array['pleasure','oral_sensory']::text[], array['cigarette','vape']::text[], '{"max_daily":2,"respect_fruit_cutoff":true}'::jsonb, 70),
  ('kefir', 'Кефир', 'Если тебе подходит молочное, выпей небольшую порцию кефира как самостоятельный перекус, а не автоматическое заедание каждой тяги.', 'food', array['oral_sensory','pleasure']::text[], array['cigarette','vape']::text[], '{"max_daily":1}'::jsonb, 80),
  ('protein_drink', 'Протеиновый напиток', 'Используй стандартную порцию своего продукта только если это вписывается в твой рацион; ALIVE не назначает дозировку белка.', 'food', array['oral_sensory','stimulation']::text[], array['cigarette','vape']::text[], '{"max_daily":1}'::jsonb, 90),
  ('nrt_spray', 'Никотиновый спрей', 'Используй только согласно инструкции своего препарата или рекомендации специалиста. В ALIVE это помощь, а не срыв.', 'nrt', array['release_tension','oral_sensory']::text[], array['cigarette']::text[], '{}'::jsonb, 100),
  ('nrt_gum', 'Никотиновая жвачка', 'Используй согласно инструкции своего препарата. ALIVE не назначает дозировку и не считает NRT курением.', 'nrt', array['oral_sensory','release_tension']::text[], array['cigarette']::text[], '{}'::jsonb, 110),
  ('vape_out_of_reach', 'Убрать электронку из поля зрения', 'Положи устройство в другую комнату или место, до которого нужно встать и дойти. Затем выдержи 10 минут до следующего решения.', 'environment', array['switch','pause']::text[], array['vape']::text[], '{}'::jsonb, 120)
on conflict (code) do nothing;
