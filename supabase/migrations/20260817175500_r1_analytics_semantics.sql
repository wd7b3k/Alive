-- ALIVE R1 — аналитика ценности не должна считать быстрый факт употребления полноценной работой с тягой.

alter table public.analytics_events
  add column if not exists episode_id uuid references public.episodes(id) on delete set null,
  add column if not exists action_id uuid references public.episode_actions(id) on delete set null,
  add column if not exists tobacco_event_id uuid references public.tobacco_events(id) on delete set null;

create index analytics_events_episode_idx on public.analytics_events(episode_id) where episode_id is not null;
create index analytics_events_action_idx on public.analytics_events(action_id) where action_id is not null;
create index analytics_events_tobacco_idx on public.analytics_events(tobacco_event_id) where tobacco_event_id is not null;

create or replace function public.alive_record_episode_completed()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  delta numeric;
  resolved_reason text;
  resolved_event_type text;
  resolved_stage text;
begin
  if new.deleted_at is null and new.outcome is not null and new.outcome <> 'open' then
    if new.craving_before is not null and new.craving_after is not null then
      delta := new.craving_after - new.craving_before;
    end if;
    if new.outcome = 'abandoned' then resolved_reason := 'closed_without_rating'; end if;

    -- Guided/observed craving has structured context or a craving rating.
    -- Quick-use logging is a valid domain fact but must not inflate evidence that users seek help during craving.
    if new.craving_before is not null or new.need_code is not null or new.trigger_code is not null or new.user_trigger_id is not null then
      resolved_event_type := 'craving_completed';
      resolved_stage := 'результат импульса';
    else
      resolved_event_type := 'use_episode_logged';
      resolved_stage := 'факт употребления';
    end if;

    insert into public.analytics_events(
      user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,reason_code,numeric_value,episode_id,occurred_at,metadata
    ) values (
      new.user_id,resolved_event_type,resolved_stage,'веб',new.target_product,new.trigger_code,new.outcome,resolved_reason,delta,new.id,
      coalesce(new.completed_at,new.created_at),
      jsonb_build_object('есть_оценка_тяги',new.craving_before is not null and new.craving_after is not null)
    );
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_episode_completed() from public, anon, authenticated;

create or replace function public.alive_record_episode_action()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.replacement_code is not null or new.user_replacement_id is not null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,replacement_code,episode_id,action_id,occurred_at,metadata)
    values(
      new.user_id,'intervention_used','вмешательство использовано','веб',new.replacement_code,new.episode_id,new.id,new.occurred_at,
      jsonb_build_object('личная_замена',new.user_replacement_id is not null,'тип_действия',new.action_type)
    );
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_episode_action() from public, anon, authenticated;

create or replace function public.alive_record_tobacco_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,outcome,episode_id,tobacco_event_id,occurred_at)
    values(new.user_id,'nicotine_use_logged','употребление зафиксировано','веб',new.product_type,'никотин использован',new.episode_id,new.id,new.occurred_at);
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_tobacco_event() from public, anon, authenticated;

-- Предыдущая historical вставка была создана до появления episode_id и не различала quick log.
-- Удаляем только R1-generated backfill по явному metadata marker и пересобираем корректно.
delete from public.analytics_events
where event_type='craving_completed'
  and metadata->>'источник'='исторический пересчёт'
  and episode_id is null;

delete from public.analytics_events
where event_type='nicotine_use_logged'
  and metadata->>'источник'='исторический пересчёт'
  and tobacco_event_id is null;

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,numeric_value,episode_id,occurred_at,metadata)
select
  e.user_id,
  case when e.craving_before is not null or e.need_code is not null or e.trigger_code is not null or e.user_trigger_id is not null then 'craving_completed' else 'use_episode_logged' end,
  case when e.craving_before is not null or e.need_code is not null or e.trigger_code is not null or e.user_trigger_id is not null then 'результат импульса' else 'факт употребления' end,
  'веб',e.target_product,e.trigger_code,e.outcome,
  case when e.craving_before is not null and e.craving_after is not null then e.craving_after-e.craving_before else null end,
  e.id,coalesce(e.completed_at,e.created_at),jsonb_build_object('источник','исторический пересчёт')
from public.episodes e
where e.deleted_at is null and e.outcome is not null and e.outcome<>'open';

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,outcome,episode_id,tobacco_event_id,occurred_at,metadata)
select t.user_id,'nicotine_use_logged','употребление зафиксировано','веб',t.product_type,'никотин использован',t.episode_id,t.id,t.occurred_at,
  jsonb_build_object('источник','исторический пересчёт')
from public.tobacco_events t
where t.deleted_at is null;
