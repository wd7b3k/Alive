-- ALIVE R1 — пересчитываемые персональные проекции эффективности.
-- Raw episodes/actions остаются источником истины; эти таблицы нужны для быстрого ранжирования.

create table public.user_trigger_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  global_trigger_code text references public.triggers_catalog(code) on delete cascade,
  user_trigger_id uuid references public.user_triggers(id) on delete cascade,
  trigger_key text generated always as (
    case when global_trigger_code is not null then 'g:' || global_trigger_code else 'u:' || user_trigger_id::text end
  ) stored,
  product_type text not null check (product_type in ('cigarette','hookah','vape')),
  observations integer not null default 0,
  successful_responses integer not null default 0,
  nicotine_outcomes integer not null default 0,
  craving_before_sum numeric(14,4) not null default 0,
  craving_before_count integer not null default 0,
  craving_delta_sum numeric(14,4) not null default 0,
  craving_delta_count integer not null default 0,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, trigger_key, product_type),
  check ((global_trigger_code is not null) <> (user_trigger_id is not null))
);

create table public.user_replacement_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  global_replacement_code text references public.replacements_catalog(code) on delete cascade,
  user_replacement_id uuid references public.user_replacements(id) on delete cascade,
  replacement_key text generated always as (
    case when global_replacement_code is not null then 'g:' || global_replacement_code else 'u:' || user_replacement_id::text end
  ) stored,
  product_type text not null check (product_type in ('cigarette','hookah','vape')),
  trigger_key text not null default 'любой',
  attempts integer not null default 0,
  successful_responses integer not null default 0,
  nicotine_outcomes integer not null default 0,
  helpfulness_sum numeric(14,4) not null default 0,
  helpfulness_count integer not null default 0,
  craving_delta_sum numeric(14,4) not null default 0,
  craving_delta_count integer not null default 0,
  last_used_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, replacement_key, product_type, trigger_key),
  check ((global_replacement_code is not null) <> (user_replacement_id is not null))
);

alter table public.user_trigger_stats enable row level security;
alter table public.user_replacement_stats enable row level security;

create policy user_trigger_stats_read_own on public.user_trigger_stats for select to authenticated
using ((select auth.uid()) = user_id);
create policy user_replacement_stats_read_own on public.user_replacement_stats for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.user_trigger_stats to authenticated;
grant select on public.user_replacement_stats to authenticated;

create index user_trigger_stats_last_seen_idx on public.user_trigger_stats(user_id,last_seen_at desc);
create index user_replacement_stats_last_used_idx on public.user_replacement_stats(user_id,last_used_at desc);

-- DB-owned update функции: пользователь не может напрямую подделать рейтинг, но raw own events остаются исправимыми.
create or replace function private.alive_update_trigger_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  key_trigger text;
  delta_value numeric := 0;
  delta_count integer := 0;
  before_value numeric := 0;
  before_count integer := 0;
begin
  if new.deleted_at is not null or new.outcome is null or new.outcome = 'open' then
    return new;
  end if;
  if new.trigger_code is null and new.user_trigger_id is null then
    return new;
  end if;

  key_trigger := case when new.trigger_code is not null then 'g:' || new.trigger_code else 'u:' || new.user_trigger_id::text end;
  if new.craving_before is not null then before_value := new.craving_before; before_count := 1; end if;
  if new.craving_before is not null and new.craving_after is not null then delta_value := new.craving_before - new.craving_after; delta_count := 1; end if;

  insert into public.user_trigger_stats(
    user_id,global_trigger_code,user_trigger_id,product_type,observations,successful_responses,nicotine_outcomes,
    craving_before_sum,craving_before_count,craving_delta_sum,craving_delta_count,last_seen_at
  ) values (
    new.user_id,new.trigger_code,new.user_trigger_id,new.target_product,1,
    case when new.outcome='successful_response' then 1 else 0 end,
    case when new.outcome='nicotine_used' then 1 else 0 end,
    before_value,before_count,delta_value,delta_count,coalesce(new.completed_at,new.created_at)
  )
  on conflict (user_id,trigger_key,product_type) do update set
    observations=public.user_trigger_stats.observations+1,
    successful_responses=public.user_trigger_stats.successful_responses+excluded.successful_responses,
    nicotine_outcomes=public.user_trigger_stats.nicotine_outcomes+excluded.nicotine_outcomes,
    craving_before_sum=public.user_trigger_stats.craving_before_sum+excluded.craving_before_sum,
    craving_before_count=public.user_trigger_stats.craving_before_count+excluded.craving_before_count,
    craving_delta_sum=public.user_trigger_stats.craving_delta_sum+excluded.craving_delta_sum,
    craving_delta_count=public.user_trigger_stats.craving_delta_count+excluded.craving_delta_count,
    last_seen_at=greatest(public.user_trigger_stats.last_seen_at,excluded.last_seen_at),
    updated_at=now();
  return new;
end;
$$;
revoke all on function private.alive_update_trigger_stats() from public, anon, authenticated;

create or replace function private.alive_update_replacement_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ep public.episodes%rowtype;
  key_trigger text := 'любой';
  helpful_value numeric := 0;
  helpful_count integer := 0;
  delta_value numeric := 0;
  delta_count integer := 0;
begin
  if new.replacement_code is null and new.user_replacement_id is null then
    return new;
  end if;
  select * into ep from public.episodes where id=new.episode_id and deleted_at is null;
  if not found then return new; end if;

  if ep.trigger_code is not null then key_trigger := 'g:' || ep.trigger_code;
  elsif ep.user_trigger_id is not null then key_trigger := 'u:' || ep.user_trigger_id::text;
  end if;
  if ep.helpfulness is not null then helpful_value := ep.helpfulness; helpful_count := 1; end if;
  if ep.craving_before is not null and ep.craving_after is not null then delta_value := ep.craving_before-ep.craving_after; delta_count := 1; end if;

  insert into public.user_replacement_stats(
    user_id,global_replacement_code,user_replacement_id,product_type,trigger_key,attempts,successful_responses,nicotine_outcomes,
    helpfulness_sum,helpfulness_count,craving_delta_sum,craving_delta_count,last_used_at
  ) values (
    new.user_id,new.replacement_code,new.user_replacement_id,ep.target_product,key_trigger,1,
    case when ep.outcome='successful_response' then 1 else 0 end,
    case when ep.outcome='nicotine_used' then 1 else 0 end,
    helpful_value,helpful_count,delta_value,delta_count,new.occurred_at
  )
  on conflict (user_id,replacement_key,product_type,trigger_key) do update set
    attempts=public.user_replacement_stats.attempts+1,
    successful_responses=public.user_replacement_stats.successful_responses+excluded.successful_responses,
    nicotine_outcomes=public.user_replacement_stats.nicotine_outcomes+excluded.nicotine_outcomes,
    helpfulness_sum=public.user_replacement_stats.helpfulness_sum+excluded.helpfulness_sum,
    helpfulness_count=public.user_replacement_stats.helpfulness_count+excluded.helpfulness_count,
    craving_delta_sum=public.user_replacement_stats.craving_delta_sum+excluded.craving_delta_sum,
    craving_delta_count=public.user_replacement_stats.craving_delta_count+excluded.craving_delta_count,
    last_used_at=greatest(public.user_replacement_stats.last_used_at,excluded.last_used_at),
    updated_at=now();
  return new;
end;
$$;
revoke all on function private.alive_update_replacement_stats() from public, anon, authenticated;

drop trigger if exists alive_trigger_stats_after_episode on public.episodes;
create trigger alive_trigger_stats_after_episode after insert on public.episodes
for each row execute function private.alive_update_trigger_stats();

drop trigger if exists alive_replacement_stats_after_action on public.episode_actions;
create trigger alive_replacement_stats_after_action after insert on public.episode_actions
for each row execute function private.alive_update_replacement_stats();

-- Исторический пересчёт существующих эпизодов и действий.
insert into public.user_trigger_stats(
  user_id,global_trigger_code,user_trigger_id,product_type,observations,successful_responses,nicotine_outcomes,
  craving_before_sum,craving_before_count,craving_delta_sum,craving_delta_count,last_seen_at
)
select
  e.user_id,e.trigger_code,e.user_trigger_id,e.target_product,
  count(*)::integer,
  count(*) filter(where e.outcome='successful_response')::integer,
  count(*) filter(where e.outcome='nicotine_used')::integer,
  coalesce(sum(e.craving_before),0),count(e.craving_before)::integer,
  coalesce(sum(e.craving_before-e.craving_after) filter(where e.craving_before is not null and e.craving_after is not null),0),
  count(*) filter(where e.craving_before is not null and e.craving_after is not null)::integer,
  max(coalesce(e.completed_at,e.created_at))
from public.episodes e
where e.deleted_at is null and e.outcome is not null and e.outcome<>'open' and (e.trigger_code is not null or e.user_trigger_id is not null)
group by e.user_id,e.trigger_code,e.user_trigger_id,e.target_product
on conflict (user_id,trigger_key,product_type) do update set
  observations=excluded.observations,
  successful_responses=excluded.successful_responses,
  nicotine_outcomes=excluded.nicotine_outcomes,
  craving_before_sum=excluded.craving_before_sum,
  craving_before_count=excluded.craving_before_count,
  craving_delta_sum=excluded.craving_delta_sum,
  craving_delta_count=excluded.craving_delta_count,
  last_seen_at=excluded.last_seen_at,
  updated_at=now();

insert into public.user_replacement_stats(
  user_id,global_replacement_code,user_replacement_id,product_type,trigger_key,attempts,successful_responses,nicotine_outcomes,
  helpfulness_sum,helpfulness_count,craving_delta_sum,craving_delta_count,last_used_at
)
select
  a.user_id,a.replacement_code,a.user_replacement_id,e.target_product,
  case when e.trigger_code is not null then 'g:'||e.trigger_code when e.user_trigger_id is not null then 'u:'||e.user_trigger_id::text else 'любой' end,
  count(*)::integer,
  count(*) filter(where e.outcome='successful_response')::integer,
  count(*) filter(where e.outcome='nicotine_used')::integer,
  coalesce(sum(e.helpfulness),0),count(e.helpfulness)::integer,
  coalesce(sum(e.craving_before-e.craving_after) filter(where e.craving_before is not null and e.craving_after is not null),0),
  count(*) filter(where e.craving_before is not null and e.craving_after is not null)::integer,
  max(a.occurred_at)
from public.episode_actions a
join public.episodes e on e.id=a.episode_id and e.deleted_at is null
where a.replacement_code is not null or a.user_replacement_id is not null
group by a.user_id,a.replacement_code,a.user_replacement_id,e.target_product,
  case when e.trigger_code is not null then 'g:'||e.trigger_code when e.user_trigger_id is not null then 'u:'||e.user_trigger_id::text else 'любой' end
on conflict (user_id,replacement_key,product_type,trigger_key) do update set
  attempts=excluded.attempts,
  successful_responses=excluded.successful_responses,
  nicotine_outcomes=excluded.nicotine_outcomes,
  helpfulness_sum=excluded.helpfulness_sum,
  helpfulness_count=excluded.helpfulness_count,
  craving_delta_sum=excluded.craving_delta_sum,
  craving_delta_count=excluded.craving_delta_count,
  last_used_at=excluded.last_used_at,
  updated_at=now();
