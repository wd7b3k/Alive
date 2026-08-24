-- ALIVE R1 — персональное обучение должно пересчитываться после исправления/удаления исходных событий.
-- Raw episodes/actions остаются source of truth; projections можно полностью восстановить.

create or replace function private.alive_rebuild_user_learning(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_trigger_stats where user_id = p_user_id;
  delete from public.user_replacement_stats where user_id = p_user_id;

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
  where e.user_id=p_user_id
    and e.deleted_at is null
    and e.outcome is not null
    and e.outcome<>'open'
    and (e.trigger_code is not null or e.user_trigger_id is not null)
  group by e.user_id,e.trigger_code,e.user_trigger_id,e.target_product;

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
  join public.episodes e on e.id=a.episode_id
  where a.user_id=p_user_id
    and e.user_id=p_user_id
    and e.deleted_at is null
    and (a.replacement_code is not null or a.user_replacement_id is not null)
  group by a.user_id,a.replacement_code,a.user_replacement_id,e.target_product,
    case when e.trigger_code is not null then 'g:'||e.trigger_code when e.user_trigger_id is not null then 'u:'||e.user_trigger_id::text else 'любой' end;
end;
$$;

revoke all on function private.alive_rebuild_user_learning(uuid) from public, anon, authenticated;

create or replace function private.alive_rebuild_learning_after_episode_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.alive_rebuild_user_learning(coalesce(new.user_id,old.user_id));
  return coalesce(new,old);
end;
$$;

revoke all on function private.alive_rebuild_learning_after_episode_change() from public, anon, authenticated;

create or replace function private.alive_rebuild_learning_after_action_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.alive_rebuild_user_learning(coalesce(new.user_id,old.user_id));
  return coalesce(new,old);
end;
$$;

revoke all on function private.alive_rebuild_learning_after_action_change() from public, anon, authenticated;

-- INSERT уже обслуживается быстрыми incremental triggers из предыдущей migration.
-- UPDATE/DELETE требуют полного пересчёта, чтобы исправление события не оставляло «призрачный» успех в модели.
drop trigger if exists alive_learning_rebuild_episode_update on public.episodes;
create trigger alive_learning_rebuild_episode_update
after update of target_product,trigger_code,user_trigger_id,craving_before,craving_after,outcome,helpfulness,deleted_at on public.episodes
for each row
when (
  old.target_product is distinct from new.target_product
  or old.trigger_code is distinct from new.trigger_code
  or old.user_trigger_id is distinct from new.user_trigger_id
  or old.craving_before is distinct from new.craving_before
  or old.craving_after is distinct from new.craving_after
  or old.outcome is distinct from new.outcome
  or old.helpfulness is distinct from new.helpfulness
  or old.deleted_at is distinct from new.deleted_at
)
execute function private.alive_rebuild_learning_after_episode_change();

drop trigger if exists alive_learning_rebuild_action_update on public.episode_actions;
create trigger alive_learning_rebuild_action_update
after update of replacement_code,user_replacement_id,action_type on public.episode_actions
for each row execute function private.alive_rebuild_learning_after_action_change();

drop trigger if exists alive_learning_rebuild_action_delete on public.episode_actions;
create trigger alive_learning_rebuild_action_delete
after delete on public.episode_actions
for each row execute function private.alive_rebuild_learning_after_action_change();
