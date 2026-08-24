-- ALIVE v3.1 behavioural content schema
-- Repo-first canonical migration. Medical copy remains editorially reviewed content.

alter table public.replacements_catalog
  add column if not exists mechanism text,
  add column if not exists evidence_level text check (evidence_level is null or evidence_level in ('A','B','C')),
  add column if not exists evidence_scope text,
  add column if not exists source_title text,
  add column if not exists source_url text,
  add column if not exists context_tags text[] not null default '{}',
  add column if not exists rotation_weight numeric(6,3) not null default 1,
  add column if not exists intensity_min smallint check (intensity_min is null or intensity_min between 1 and 10),
  add column if not exists intensity_max smallint check (intensity_max is null or intensity_max between 1 and 10);

alter table public.user_settings
  add column if not exists knowledge_reminders_enabled boolean not null default true,
  add column if not exists myth_reminders_enabled boolean not null default true,
  add column if not exists together_share_card boolean not null default false,
  add column if not exists together_alias text;

create table if not exists public.myths_catalog (
  code text primary key,
  title text not null,
  short_reframe text not null,
  explanation text not null,
  mechanism text not null,
  evidence_level text not null default 'C' check (evidence_level in ('A','B','C')),
  evidence_scope text,
  source_title text not null,
  source_url text not null,
  doi text,
  trigger_codes text[] not null default '{}',
  need_codes text[] not null default '{}',
  product_types text[] not null default '{cigarette,hookah,vape}',
  context_tags text[] not null default '{}',
  replacement_codes text[] not null default '{}',
  published boolean not null default true,
  sort_order integer not null default 100,
  last_verified_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_myth_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  myth_code text not null references public.myths_catalog(code) on delete cascade,
  relevance text not null default 'unknown' check (relevance in ('unknown','relevant','not_relevant')),
  seen_count integer not null default 0 check (seen_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  last_shown_at timestamptz,
  dismissed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, myth_code)
);

create table if not exists public.facts_catalog (
  code text primary key,
  title text not null,
  short_text text not null,
  full_text text not null,
  category text not null,
  benefit boolean not null default false,
  evidence_level text not null default 'A' check (evidence_level in ('A','B','C')),
  evidence_kind text not null,
  source_title text not null,
  source_url text not null,
  doi text,
  sample_size integer check (sample_size is null or sample_size > 0),
  product_types text[] not null default '{cigarette}',
  min_years numeric(6,2) check (min_years is null or min_years >= 0),
  max_years numeric(6,2) check (max_years is null or max_years >= min_years),
  min_pack_years numeric(7,2) check (min_pack_years is null or min_pack_years >= 0),
  max_pack_years numeric(7,2) check (max_pack_years is null or max_pack_years >= min_pack_years),
  context_tags text[] not null default '{}',
  published boolean not null default true,
  sort_order integer not null default 100,
  last_verified_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists myths_catalog_context_idx on public.myths_catalog using gin(context_tags);
create index if not exists myths_catalog_trigger_idx on public.myths_catalog using gin(trigger_codes);
create index if not exists myths_catalog_need_idx on public.myths_catalog using gin(need_codes);
create index if not exists facts_catalog_category_idx on public.facts_catalog(category, sort_order);
create index if not exists facts_catalog_context_idx on public.facts_catalog using gin(context_tags);
create index if not exists user_myth_state_user_idx on public.user_myth_state(user_id, relevance, last_shown_at desc);
create index if not exists replacements_catalog_mechanism_idx on public.replacements_catalog(mechanism, sort_order);

-- Existing helper is canonical in v3 platform schema.
drop trigger if exists myths_catalog_set_updated_at on public.myths_catalog;
create trigger myths_catalog_set_updated_at before update on public.myths_catalog
for each row execute function public.set_updated_at();

drop trigger if exists facts_catalog_set_updated_at on public.facts_catalog;
create trigger facts_catalog_set_updated_at before update on public.facts_catalog
for each row execute function public.set_updated_at();

drop trigger if exists user_myth_state_set_updated_at on public.user_myth_state;
create trigger user_myth_state_set_updated_at before update on public.user_myth_state
for each row execute function public.set_updated_at();

alter table public.myths_catalog enable row level security;
alter table public.facts_catalog enable row level security;
alter table public.user_myth_state enable row level security;

-- Content catalogs are read-only to ordinary authenticated clients.
drop policy if exists myths_catalog_read_published on public.myths_catalog;
create policy myths_catalog_read_published on public.myths_catalog
for select to authenticated using (published = true);

drop policy if exists facts_catalog_read_published on public.facts_catalog;
create policy facts_catalog_read_published on public.facts_catalog
for select to authenticated using (published = true);

-- Myth relevance is sensitive behavioural data and is private by default.
drop policy if exists user_myth_state_select_own on public.user_myth_state;
create policy user_myth_state_select_own on public.user_myth_state
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_myth_state_insert_own on public.user_myth_state;
create policy user_myth_state_insert_own on public.user_myth_state
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists user_myth_state_update_own on public.user_myth_state;
create policy user_myth_state_update_own on public.user_myth_state
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists user_myth_state_delete_own on public.user_myth_state;
create policy user_myth_state_delete_own on public.user_myth_state
for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.myths_catalog from anon;
revoke all on public.facts_catalog from anon;
revoke all on public.user_myth_state from anon;
revoke insert, update, delete on public.myths_catalog from authenticated;
revoke insert, update, delete on public.facts_catalog from authenticated;

grant select on public.myths_catalog to authenticated;
grant select on public.facts_catalog to authenticated;
grant select, insert, update, delete on public.user_myth_state to authenticated;
