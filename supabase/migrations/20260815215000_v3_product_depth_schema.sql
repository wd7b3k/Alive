-- ALIVE v3.0 product depth / v2.7 parity schema.
-- REPO-first: this migration is canonical before remote application.

alter table public.replacements_catalog
  add column if not exists icon text,
  add column if not exists duration text,
  add column if not exists summary text,
  add column if not exists safety text;

alter table public.user_settings
  add column if not exists goal_text text,
  add column if not exists evening_checkin_enabled boolean not null default true;

insert into public.needs_catalog (code,title,description,published,sort_order)
values
  ('self_presence','Побыть с собой','Нужно выдержать состояние напрямую, без обязательного внешнего стимула.',true,65)
on conflict (code) do update set
  title=excluded.title,
  description=excluded.description,
  published=true;

create table public.trigger_replacement_map (
  trigger_code text not null references public.triggers_catalog(code) on delete cascade,
  replacement_code text not null references public.replacements_catalog(code) on delete cascade,
  tier text not null default 'deeper' check (tier in ('fast','deeper','meaning','safe')),
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (trigger_code, replacement_code)
);

create table public.identity_scripts_catalog (
  code text primary key,
  title text not null,
  old_pattern text not null,
  new_choice text not null,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supports_catalog (
  code text primary key,
  support_type text not null check (support_type in ('daily','success','slip','meaning')),
  body text not null,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rewards_catalog (
  code text primary key,
  metric text not null,
  threshold numeric(12,2) not null,
  title text not null,
  description text not null,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  irritability smallint check (irritability between 1 and 10),
  energy smallint check (energy between 1 and 10),
  recovery smallint check (recovery between 1 and 10),
  owned_moment text,
  strongest_link text,
  tomorrow_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index trigger_replacement_map_trigger_idx on public.trigger_replacement_map(trigger_code, priority);
create index daily_checkins_user_date_idx on public.daily_checkins(user_id, checkin_date desc);

create trigger identity_scripts_set_updated_at before update on public.identity_scripts_catalog
for each row execute function public.set_updated_at();
create trigger supports_set_updated_at before update on public.supports_catalog
for each row execute function public.set_updated_at();
create trigger daily_checkins_set_updated_at before update on public.daily_checkins
for each row execute function public.set_updated_at();

alter table public.trigger_replacement_map enable row level security;
alter table public.identity_scripts_catalog enable row level security;
alter table public.supports_catalog enable row level security;
alter table public.rewards_catalog enable row level security;
alter table public.daily_checkins enable row level security;

create policy trigger_replacement_map_read on public.trigger_replacement_map
for select to authenticated using (true);

create policy identity_scripts_read_published on public.identity_scripts_catalog
for select to authenticated using (published=true);

create policy supports_read_published on public.supports_catalog
for select to authenticated using (published=true);

create policy rewards_read_published on public.rewards_catalog
for select to authenticated using (published=true);

create policy daily_checkins_all_own on public.daily_checkins
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.trigger_replacement_map to authenticated;
grant select on public.identity_scripts_catalog to authenticated;
grant select on public.supports_catalog to authenticated;
grant select on public.rewards_catalog to authenticated;
grant select,insert,update,delete on public.daily_checkins to authenticated;
