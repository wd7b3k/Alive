-- ALIVE 4.0.0-alpha.1 — controlled owner bootstrap для authenticated admin QA.

create table private.alive_admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint alive_admin_allowlist_normalized_email
    check (
      email = pg_catalog.lower(pg_catalog.btrim(email))
      and pg_catalog.strpos(email, '@') > 1
    )
);

alter table private.alive_admin_allowlist enable row level security;
revoke all on table private.alive_admin_allowlist from public, anon, authenticated;

comment on table private.alive_admin_allowlist is
  'Закрытый owner-approved allowlist для confirmed Google OAuth admin bootstrap. Не экспонируется в Data API или analytics.';

insert into private.alive_admin_allowlist(email)
values ('wd7b3k@gmail.com')
on conflict(email) do nothing;

create or replace function private.alive_is_allowlisted_google_admin(
  p_email text,
  p_email_confirmed_at timestamptz,
  p_app_metadata jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $admin_identity$
  select p_email_confirmed_at is not null
    and p_app_metadata ->> 'provider' = 'google'
    and exists (
      select 1
      from private.alive_admin_allowlist a
      where a.email = pg_catalog.lower(pg_catalog.btrim(p_email))
    );
$admin_identity$;

revoke all on function private.alive_is_allowlisted_google_admin(text, timestamptz, jsonb)
from public, anon, authenticated;

create or replace function private.alive_sync_admin_allowlist()
returns integer
language plpgsql
security definer
set search_path = ''
as $admin_sync$
declare
  v_updated integer;
begin
  update public.profiles p
  set role = 'admin'
  from auth.users u
  where p.id = u.id
    and private.alive_is_allowlisted_google_admin(
      u.email,
      u.email_confirmed_at,
      u.raw_app_meta_data
    )
    and p.role is distinct from 'admin';

  get diagnostics v_updated = row_count;
  return v_updated;
end
$admin_sync$;

revoke all on function private.alive_sync_admin_allowlist() from public, anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $new_auth_user$
declare
  v_role text;
begin
  select case
    when private.alive_is_allowlisted_google_admin(
      new.email,
      new.email_confirmed_at,
      new.raw_app_meta_data
    ) then 'admin'
    else 'participant'
  end
  into v_role;

  insert into public.profiles(id, display_name, avatar_url, locale, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      pg_catalog.split_part(coalesce(new.email, 'participant'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    new.raw_user_meta_data ->> 'locale',
    v_role
  )
  on conflict(id) do update
  set role = case
    when excluded.role = 'admin' then 'admin'
    else public.profiles.role
  end;

  insert into public.user_settings(user_id)
  values (new.id)
  on conflict(user_id) do nothing;

  return new;
end
$new_auth_user$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

select private.alive_sync_admin_allowlist();
