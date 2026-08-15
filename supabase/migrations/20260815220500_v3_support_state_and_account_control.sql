-- ALIVE v3.0 — daily background support + self-service account deletion.
-- NRT patch is background support, not a craving episode and not a relapse.

create table public.daily_support_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  support_date date not null default current_date,
  nrt_patch_active boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, support_date)
);

create index daily_support_state_user_date_idx
  on public.daily_support_state(user_id, support_date desc);

create trigger daily_support_state_set_updated_at
before update on public.daily_support_state
for each row execute function public.set_updated_at();

alter table public.daily_support_state enable row level security;

create policy daily_support_state_all_own on public.daily_support_state
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select,insert,update,delete on public.daily_support_state to authenticated;

create or replace function public.delete_my_alive_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- profiles and all ALIVE user-owned rows cascade from auth.users/profiles.
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_alive_account() from public;
grant execute on function public.delete_my_alive_account() to authenticated;
