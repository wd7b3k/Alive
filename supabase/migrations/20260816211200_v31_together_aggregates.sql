-- ALIVE v3.1 Together
-- One authenticated aggregate endpoint. It intentionally returns no user ids, names,
-- private notes, meanings, links, medication details or raw event rows.

create or replace function public.get_together_summary(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 7), 30));
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 30)));
  v_today timestamptz := date_trunc('day', now());
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  with
  participant_pool as (
    select p.id
    from public.profiles p
    where p.onboarding_completed_at is not null
      and coalesce(p.status, 'active') = 'active'
  ),
  activity as (
    select e.user_id, e.started_at as occurred_at
    from public.episodes e
    join participant_pool pp on pp.id = e.user_id
    where e.deleted_at is null and e.started_at >= v_since
    union all
    select t.user_id, t.occurred_at
    from public.tobacco_events t
    join participant_pool pp on pp.id = t.user_id
    where t.deleted_at is null and t.occurred_at >= v_since
    union all
    select a.user_id, a.occurred_at
    from public.episode_actions a
    join participant_pool pp on pp.id = a.user_id
    where a.occurred_at >= v_since
  ),
  active_period as (
    select distinct user_id from activity
  ),
  active_today as (
    select distinct user_id from activity where occurred_at >= v_today
  ),
  episode_rollup as (
    select
      count(*)::int as episodes_period,
      count(*) filter (where e.outcome = 'successful_response')::int as successful_responses
    from public.episodes e
    join participant_pool pp on pp.id = e.user_id
    where e.deleted_at is null and e.started_at >= v_since
  ),
  replacement_rollup as (
    select count(*)::int as replacement_attempts
    from public.episode_actions a
    join participant_pool pp on pp.id = a.user_id
    where a.action_type = 'replacement'
      and a.replacement_code is not null
      and a.occurred_at >= v_since
  ),
  baseline_users as (
    select
      np.user_id,
      nullif((np.baseline ->> 'cigarettes_per_day')::numeric, 0) as baseline_per_day
    from public.user_nicotine_products np
    join active_period ap on ap.user_id = np.user_id
    where np.enabled = true
      and np.role = 'target_dependency'
      and np.product_type = 'cigarette'
      and coalesce((np.baseline ->> 'cigarettes_per_day')::numeric, 0) > 0
  ),
  actual_cigarettes as (
    select
      bu.user_id,
      bu.baseline_per_day,
      coalesce(sum(te.cigarette_quantity) filter (
        where te.deleted_at is null
          and te.product_type = 'cigarette'
          and te.occurred_at >= v_since
      ), 0)::numeric as actual_cigarettes
    from baseline_users bu
    left join public.tobacco_events te on te.user_id = bu.user_id
    group by bu.user_id, bu.baseline_per_day
  ),
  baseline_delta as (
    select
      user_id,
      100 * ((actual_cigarettes / nullif(baseline_per_day * v_days, 0)) - 1) as delta_pct
    from actual_cigarettes
  ),
  baseline_summary as (
    select
      count(*)::int as evaluable,
      count(*) filter (where delta_pct < -5)::int as below_baseline,
      count(*) filter (where delta_pct between -5 and 5)::int as near_baseline,
      count(*) filter (where delta_pct > 5)::int as above_baseline,
      percentile_cont(0.5) within group (order by delta_pct)::numeric as median_delta_pct
    from baseline_delta
  ),
  mechanism_raw as (
    select
      coalesce(r.mechanism, r.category, 'other') as mechanism,
      count(*)::int as uses,
      count(distinct a.user_id)::int as users,
      avg(e.helpfulness)::numeric as avg_helpfulness
    from public.episode_actions a
    join participant_pool pp on pp.id = a.user_id
    join public.episodes e on e.id = a.episode_id and e.deleted_at is null
    join public.replacements_catalog r on r.code = a.replacement_code
    where a.action_type = 'replacement'
      and a.replacement_code is not null
      and a.occurred_at >= v_since
    group by coalesce(r.mechanism, r.category, 'other')
  ),
  mechanism_summary as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'mechanism', mechanism,
      'uses', uses,
      'users', users,
      'avg_helpfulness', case when avg_helpfulness is null then null else round(avg_helpfulness, 1) end
    ) order by uses desc), '[]'::jsonb) as items
    from (
      select * from mechanism_raw
      where users >= 3 and uses >= 3
      order by uses desc
      limit 6
    ) safe_mechanisms
  ),
  counts as (
    select
      (select count(*)::int from participant_pool) as participants_total,
      (select count(*)::int from active_period) as active_period,
      (select count(*)::int from active_today) as active_today
  )
  select jsonb_build_object(
    'days', v_days,
    'participants_total', c.participants_total,
    'active_period', c.active_period,
    'active_today', c.active_today,
    'episodes_period', er.episodes_period,
    'replacement_attempts', rr.replacement_attempts,
    'successful_responses', er.successful_responses,
    'baseline', case
      when bs.evaluable >= 3 then jsonb_build_object(
        'evaluable', bs.evaluable,
        'below', bs.below_baseline,
        'near', bs.near_baseline,
        'above', bs.above_baseline,
        'median_delta_pct', round(bs.median_delta_pct, 1),
        'suppressed', false
      )
      else jsonb_build_object(
        'evaluable', bs.evaluable,
        'below', null,
        'near', null,
        'above', null,
        'median_delta_pct', null,
        'suppressed', true
      )
    end,
    'mechanisms', ms.items,
    'privacy_threshold', 3,
    'generated_at', now()
  )
  into v_result
  from counts c
  cross join episode_rollup er
  cross join replacement_rollup rr
  cross join baseline_summary bs
  cross join mechanism_summary ms;

  return v_result;
end;
$$;

-- SECURITY DEFINER is required only because Together aggregates across users.
-- Restrict the callable surface explicitly; the function returns aggregates only.
revoke all on function public.get_together_summary(integer) from public;
revoke all on function public.get_together_summary(integer) from anon;
grant execute on function public.get_together_summary(integer) to authenticated;

comment on function public.get_together_summary(integer) is
'Privacy-safe ALIVE Together aggregate. No user-level identifiers or private text are returned. Small baseline/mechanism groups are suppressed below cohort size 3.';
