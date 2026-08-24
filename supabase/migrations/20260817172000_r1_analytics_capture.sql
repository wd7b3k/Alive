-- ALIVE R1 — структурированная продуктовая воронка без приватных текстов.
-- Текущий runtime сохраняет episode в конце сценария, поэтому DB-capture даёт надёжные completed events.
-- Более тонкие UI-step/abandonment events добавляются клиентской телеметрией отдельно.

create or replace function public.alive_record_profile_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
  values(new.id,'account_created','регистрация','система',new.created_at,jsonb_build_object('источник','профиль'));
  return new;
end;
$$;
revoke all on function public.alive_record_profile_created() from public, anon, authenticated;

create or replace function public.alive_record_onboarding_completed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.onboarding_completed_at is null and new.onboarding_completed_at is not null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at)
    values(new.id,'onboarding_completed','первое знакомство завершено','веб',new.onboarding_completed_at);
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_onboarding_completed() from public, anon, authenticated;

create or replace function public.alive_record_goal_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
    values(new.user_id,'goal_created','первое Зачем','веб',new.created_at,jsonb_build_object('тип',new.goal_type));
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_goal_created() from public, anon, authenticated;

create or replace function public.alive_record_link_created()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,trigger_code,occurred_at)
    values(new.user_id,'link_created','первая Связка','веб',new.trigger_code,new.created_at);
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_link_created() from public, anon, authenticated;

create or replace function public.alive_record_episode_completed()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  delta numeric;
begin
  if new.deleted_at is null and new.outcome is not null and new.outcome <> 'open' then
    if new.craving_before is not null and new.craving_after is not null then
      delta := new.craving_after - new.craving_before;
    end if;
    insert into public.analytics_events(
      user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,numeric_value,occurred_at,metadata
    ) values (
      new.user_id,'craving_completed','результат импульса','веб',new.target_product,new.trigger_code,new.outcome,delta,
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
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,replacement_code,occurred_at,metadata)
    values(
      new.user_id,'intervention_used','вмешательство использовано','веб',new.replacement_code,new.occurred_at,
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
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,outcome,occurred_at)
    values(new.user_id,'nicotine_use_logged','употребление зафиксировано','веб',new.product_type,'никотин использован',new.occurred_at);
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_tobacco_event() from public, anon, authenticated;

create or replace function public.alive_record_checkin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at)
  values(new.user_id,'checkin_saved','вечерняя отметка','веб',new.created_at);
  return new;
end;
$$;
revoke all on function public.alive_record_checkin() from public, anon, authenticated;

drop trigger if exists alive_profile_created_analytics on public.profiles;
create trigger alive_profile_created_analytics after insert on public.profiles
for each row execute function public.alive_record_profile_created();

drop trigger if exists alive_onboarding_analytics on public.profiles;
create trigger alive_onboarding_analytics after update of onboarding_completed_at on public.profiles
for each row execute function public.alive_record_onboarding_completed();

drop trigger if exists alive_goal_created_analytics on public.user_goals;
create trigger alive_goal_created_analytics after insert on public.user_goals
for each row execute function public.alive_record_goal_created();

drop trigger if exists alive_link_created_analytics on public.user_links;
create trigger alive_link_created_analytics after insert on public.user_links
for each row execute function public.alive_record_link_created();

drop trigger if exists alive_episode_completed_analytics on public.episodes;
create trigger alive_episode_completed_analytics after insert on public.episodes
for each row execute function public.alive_record_episode_completed();

drop trigger if exists alive_episode_action_analytics on public.episode_actions;
create trigger alive_episode_action_analytics after insert on public.episode_actions
for each row execute function public.alive_record_episode_action();

drop trigger if exists alive_tobacco_event_analytics on public.tobacco_events;
create trigger alive_tobacco_event_analytics after insert on public.tobacco_events
for each row execute function public.alive_record_tobacco_event();

drop trigger if exists alive_checkin_analytics on public.daily_checkins;
create trigger alive_checkin_analytics after insert on public.daily_checkins
for each row execute function public.alive_record_checkin();

-- Backfill только структурированных milestones для уже существующих данных.
insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
select p.id,'account_created','регистрация','система',p.created_at,jsonb_build_object('источник','исторический пересчёт')
from public.profiles p;

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
select p.id,'onboarding_completed','первое знакомство завершено','веб',p.onboarding_completed_at,jsonb_build_object('источник','исторический пересчёт')
from public.profiles p
where p.onboarding_completed_at is not null;

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,numeric_value,occurred_at,metadata)
select e.user_id,'craving_completed','результат импульса','веб',e.target_product,e.trigger_code,e.outcome,
  case when e.craving_before is not null and e.craving_after is not null then e.craving_after-e.craving_before else null end,
  coalesce(e.completed_at,e.created_at),jsonb_build_object('источник','исторический пересчёт')
from public.episodes e
where e.deleted_at is null and e.outcome is not null and e.outcome <> 'open';

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,product_type,outcome,occurred_at,metadata)
select t.user_id,'nicotine_use_logged','употребление зафиксировано','веб',t.product_type,'никотин использован',t.occurred_at,
  jsonb_build_object('источник','исторический пересчёт')
from public.tobacco_events t
where t.deleted_at is null;
