-- ALIVE 4.0.0-alpha.1 — закрываем privilege escalation и cross-user projection contamination.

create or replace function public.alive_guard_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $profile_guard$
begin
  if current_user in ('anon', 'authenticated')
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception using
      errcode = '42501',
      message = 'profile role and status are controlled by administrators';
  end if;

  return new;
end
$profile_guard$;

revoke all on function public.alive_guard_profile_privileges() from public, anon, authenticated;

drop trigger if exists alive_profiles_guard_privileges on public.profiles;
create trigger alive_profiles_guard_privileges
before update of role, status on public.profiles
for each row execute function public.alive_guard_profile_privileges();

-- A client records only soft deletion so learning projections always rebuild from retained raw facts.
revoke delete on public.episodes from authenticated;

-- The action owner and episode owner must be the same row-level principal.
create unique index if not exists episodes_id_user_id_key
on public.episodes(id, user_id);

alter table public.episode_actions
drop constraint if exists episode_actions_episode_id_fkey;

alter table public.episode_actions
add constraint episode_actions_episode_owner_fkey
foreign key (episode_id, user_id)
references public.episodes(id, user_id)
on delete cascade;

comment on constraint episode_actions_episode_owner_fkey on public.episode_actions is
'Prevents a participant from attaching an action to another participant episode.';
