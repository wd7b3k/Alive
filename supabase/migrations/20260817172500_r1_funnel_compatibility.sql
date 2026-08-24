-- R1 compatibility: пока web ещё пишет главное «Зачем» в goal_text и личные опоры в user_meanings,
-- воронка должна видеть эти действия до миграции пользовательского UI на user_goals.

create or replace function public.alive_record_legacy_goal_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.goal_text,'')),'') is not null
     and nullif(trim(coalesce(old.goal_text,'')),'') is null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
    values(new.user_id,'goal_created','первое Зачем','веб',now(),jsonb_build_object('источник','поле настройки'));
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_legacy_goal_text() from public, anon, authenticated;

create or replace function public.alive_record_legacy_meaning()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is null then
    insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
    values(new.user_id,'goal_created','первое Зачем','веб',new.created_at,jsonb_build_object('источник','личная опора'));
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_legacy_meaning() from public, anon, authenticated;

drop trigger if exists alive_legacy_goal_text_analytics on public.user_settings;
create trigger alive_legacy_goal_text_analytics after update of goal_text on public.user_settings
for each row execute function public.alive_record_legacy_goal_text();

drop trigger if exists alive_legacy_meaning_analytics on public.user_meanings;
create trigger alive_legacy_meaning_analytics after insert on public.user_meanings
for each row execute function public.alive_record_legacy_meaning();

-- Исторический пересчёт этапов «Зачем» и «Связка».
insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
select s.user_id,'goal_created','первое Зачем','веб',coalesce(p.onboarding_completed_at,p.created_at),jsonb_build_object('источник','исторический goal_text')
from public.user_settings s
join public.profiles p on p.id=s.user_id
where nullif(trim(s.goal_text),'') is not null;

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,occurred_at,metadata)
select m.user_id,'goal_created','первое Зачем','веб',m.created_at,jsonb_build_object('источник','историческая личная опора')
from public.user_meanings m
where m.deleted_at is null;

insert into public.analytics_events(user_id,event_type,funnel_stage,surface,trigger_code,occurred_at,metadata)
select l.user_id,'link_created','первая Связка','веб',l.trigger_code,l.created_at,jsonb_build_object('источник','исторический пересчёт')
from public.user_links l
where l.deleted_at is null;
