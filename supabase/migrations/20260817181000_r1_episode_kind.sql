-- ALIVE R1 — различаем работу с тягой, быстрый факт употребления и будущий осознанный эпизод.
-- Это защищает метрики ценности от смешивания разных пользовательских намерений.

alter table public.episodes
  add column if not exists episode_kind text not null default 'unknown'
  check (episode_kind in ('craving','quick_use','conscious_use','unknown'));

create index if not exists episodes_kind_user_time_idx
  on public.episodes(user_id,episode_kind,created_at desc)
  where deleted_at is null;

update public.episodes set episode_kind = case
  when craving_before is not null or need_code is not null then 'craving'
  when outcome='nicotine_used' and craving_before is null and need_code is null then 'quick_use'
  else 'unknown'
end
where episode_kind='unknown';

create or replace function private.alive_classify_episode_kind()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.episode_kind='unknown' then
    if new.craving_before is not null or new.need_code is not null then
      new.episode_kind := 'craving';
    elsif new.outcome='nicotine_used' and new.craving_before is null and new.need_code is null then
      new.episode_kind := 'quick_use';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.alive_classify_episode_kind() from public;
grant execute on function private.alive_classify_episode_kind() to authenticated;

drop trigger if exists alive_episode_kind_before_write on public.episodes;
create trigger alive_episode_kind_before_write
before insert or update of episode_kind,craving_before,need_code,outcome on public.episodes
for each row execute function private.alive_classify_episode_kind();

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

    if new.episode_kind in ('craving','conscious_use') then
      resolved_event_type := 'craving_completed';
      resolved_stage := case when new.episode_kind='conscious_use' then 'осознанный эпизод употребления' else 'результат импульса' end;
    else
      resolved_event_type := 'use_episode_logged';
      resolved_stage := 'факт употребления';
    end if;

    insert into public.analytics_events(
      user_id,event_type,funnel_stage,surface,product_type,trigger_code,outcome,reason_code,numeric_value,episode_id,occurred_at,metadata
    ) values (
      new.user_id,resolved_event_type,resolved_stage,'веб',new.target_product,new.trigger_code,new.outcome,resolved_reason,delta,new.id,
      coalesce(new.completed_at,new.created_at),
      jsonb_build_object('тип_эпизода',new.episode_kind,'есть_оценка_тяги',new.craving_before is not null and new.craving_after is not null)
    );
  end if;
  return new;
end;
$$;
revoke all on function public.alive_record_episode_completed() from public, anon, authenticated;
