-- Четыре витрины из шести падали при первом же вызове.
--
-- Причина одна и стыдная: функции были написаны и не выполнены ни разу. Синтаксис
-- проверяется глазами, типы — нет; `create or replace function` принимает тело целиком
-- и жалуется только в момент вызова. На экране это выглядело как «база отказала в
-- доступе», потому что клиент сваливал любую ошибку в отказ по роли, — два слоя вранья
-- поверх четырёх опечаток.
--
-- Что было не так:
--
-- 1. `round(double precision, integer)` в `admin_core_metrics` и `admin_flow_steps`.
--    `percentile_cont` возвращает double precision, а `round` с двумя аргументами есть
--    только для numeric. Нужен явный `::numeric`.
-- 2. `cohort_week` в `admin_retention` — имя выходного параметра функции и имя колонки
--    CTE совпали, и неквалифицированная ссылка стала неоднозначной.
-- 3. `j.direction` в `admin_user_states` — выражение в списке выборки не совпадало с
--    выражением в `group by`, и колонка оказалась вне группировки.
--
-- Заодно убраны две мёртвые ветки: `having count(*) >= 3` уже отсекает малые разрезы,
-- поэтому проверка «меньше трёх — подавлено» внутри `case` не срабатывала никогда.
-- Строка, которая не может появиться, — это не осторожность, а самообман.

create or replace function public.admin_core_metrics(weeks integer default 12)
returns table (
  week date,
  participants_with_result bigint,
  new_participants bigint,
  median_baseline_ratio numeric,
  ratio_observations bigint,
  computable boolean,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(weeks, 12), 104));
  since timestamptz := date_trunc('week', now()) - make_interval(weeks => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_core_metrics доступна только администраторам приложения';
  end if;

  return query
  with weeks_list as (
    select generate_series(date_trunc('week', since), date_trunc('week', now()), interval '1 week')::date as week
  ),
  done as (
    select date_trunc('week', e.completed_at)::date as week, count(distinct e.user_id) as people
    from public.episodes e
    where e.deleted_at is null and e.completed_at is not null
      and e.outcome is not null and e.outcome <> 'open'
      and coalesce(e.episode_kind, 'craving') = 'craving'
      and e.completed_at >= since
    group by 1
  ),
  fresh as (
    select date_trunc('week', p.created_at)::date as week, count(*) as people
    from public.profiles p where p.created_at >= since group by 1
  ),
  first_baseline as (
    select distinct on (h.user_id, h.product_type)
      h.user_id, h.product_type, h.baseline, h.valid_from
    from public.user_baseline_history h
    order by h.user_id, h.product_type, h.valid_from
  ),
  baseline_units as (
    select b.user_id, sum(
      case b.product_type
        when 'cigarette' then coalesce((b.baseline->>'cigarettes_per_day')::numeric, 0)
        when 'hookah'    then coalesce((b.baseline->>'sessions_per_week')::numeric, 0) / 7 * 10
        when 'vape'      then coalesce((b.baseline->>'puffs_per_day')::numeric, 0) * 0.1
      end) as daily_units
    from first_baseline b group by 1
  ),
  weekly_units as (
    select t.user_id, date_trunc('week', t.occurred_at)::date as week, sum(
      case t.product_type
        when 'cigarette' then coalesce(t.cigarette_quantity, 0)
        when 'hookah'    then coalesce(t.hookah_session_count, 0) * 10
        when 'vape'      then coalesce(t.vape_puffs, 0) * 0.1
      end) as units
    from public.tobacco_events t
    where t.deleted_at is null and t.occurred_at >= since
    group by 1, 2
  ),
  ratios as (
    -- Приведение к numeric обязательно: percentile_cont возвращает double precision,
    -- а round с точностью существует только для numeric.
    select w.week,
           percentile_cont(0.5) within group (
             order by (w.units / nullif(b.daily_units * 7, 0))::double precision
           )::numeric as ratio,
           count(*) as observations
    from weekly_units w join baseline_units b on b.user_id = w.user_id
    where b.daily_units > 0
    group by 1
  )
  select
    l.week,
    coalesce(d.people, 0),
    coalesce(f.people, 0),
    case when r.observations >= 3 then round(r.ratio, 3) end,
    coalesce(r.observations, 0),
    coalesce(r.observations, 0) >= 3,
    case
      when r.observations is null then 'нет записей расхода и исходного уровня за неделю'
      when r.observations < 3 then 'наблюдений меньше трёх — разрез подавлен'
    end
  from weeks_list l
  left join done d on d.week = l.week
  left join fresh f on f.week = l.week
  left join ratios r on r.week = l.week
  order by l.week;
end;
$$;

create or replace function public.admin_flow_steps(days integer default 30)
returns table (
  step_no integer,
  views bigint,
  people bigint,
  median_seconds numeric,
  drop_off_pct numeric
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_flow_steps доступна только администраторам приложения';
  end if;

  -- `duration_ms` в событии — время на **предыдущем** шаге: событие отправляется при
  -- входе на экран. Поэтому медиана сдвигается на шаг назад оконной функцией.
  return query
  with steps as (
    select e.numeric_value::integer as step_no, e.user_id, e.duration_ms
    from public.analytics_events e
    where e.event_type = 'flow_step_view' and e.occurred_at >= since
      and e.numeric_value is not null
  ),
  agg as (
    select s.step_no, count(*) as views, count(distinct s.user_id) as people,
           (percentile_cont(0.5) within group (order by s.duration_ms) / 1000.0)::numeric as median_prev
    from steps s group by 1
  )
  select a.step_no, a.views, a.people,
         round(lead(a.median_prev) over (order by a.step_no), 1),
         case when lag(a.people) over (order by a.step_no) > 0
              then round(100 - a.people * 100.0 / lag(a.people) over (order by a.step_no), 1) end
  from agg a order by a.step_no;
end;
$$;

create or replace function public.admin_retention(weeks integer default 8)
returns table (
  cohort_week date,
  cohort_size bigint,
  horizon_days integer,
  retained bigint,
  retained_pct numeric
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(weeks, 8), 52));
  since timestamptz := date_trunc('week', now()) - make_interval(weeks => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_retention доступна только администраторам приложения';
  end if;

  -- Все ссылки на cohort_week квалифицированы: без этого имя колонки CTE совпадает с
  -- именем выходного параметра функции, и запрос отказывается угадывать, что имелось в виду.
  return query
  with cohorts as (
    select p.id as user_id, date_trunc('week', p.created_at)::date as cohort_week, p.created_at
    from public.profiles p where p.created_at >= since
  ),
  sizes as (
    select c.cohort_week as week, count(*) as cohort_size
    from cohorts c group by c.cohort_week
  ),
  horizons as (select unnest(array[1, 7, 14, 28, 56]) as horizon_days),
  hits as (
    select c.cohort_week as week, h.horizon_days as horizon, count(distinct c.user_id) as retained
    from cohorts c cross join horizons h
    join public.episodes e on e.user_id = c.user_id and e.deleted_at is null
     and e.started_at > c.created_at + make_interval(days => h.horizon_days - 1)
     and e.started_at <= c.created_at + make_interval(days => h.horizon_days + 1)
    group by c.cohort_week, h.horizon_days
  )
  select s.week, s.cohort_size, h.horizon_days,
         case when s.cohort_size >= 3 then coalesce(t.retained, 0) end,
         case when s.cohort_size >= 3
              then round(coalesce(t.retained, 0) * 100.0 / s.cohort_size, 1) end
  from sizes s cross join horizons h
  left join hits t on t.week = s.week and t.horizon = h.horizon_days
  order by s.week, h.horizon_days;
end;
$$;

create or replace function public.admin_sources(days integer default 30)
returns table (
  source_kind text,
  detail text,
  visitors bigint,
  signups bigint,
  reached_result bigint,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_sources доступна только администраторам приложения';
  end if;

  return query
  with v as (
    select coalesce(av.source_kind, 'direct') as source_kind,
           coalesce(nullif(av.utm_source, ''), av.referrer_host, '—') as detail,
           av.visitor_id, av.claimed_by
    from public.analytics_visitors av where av.first_seen_at >= since
  ),
  done as (
    select distinct e.user_id from public.episodes e
     where e.deleted_at is null and e.completed_at is not null and e.outcome <> 'open'
  )
  select v.source_kind, v.detail,
         count(*)::bigint,
         count(v.claimed_by)::bigint,
         count(d.user_id)::bigint,
         null::text
  from v left join done d on d.user_id = v.claimed_by
  group by 1, 2
  having count(*) >= 3
  order by 3 desc;
end;
$$;

create or replace function public.admin_user_states()
returns table (
  state text,
  probable_direction text,
  participants bigint,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if not private.is_alive_admin() then
    raise exception 'admin_user_states доступна только администраторам приложения';
  end if;

  -- Окно ожидания считается по личному ритму участника, а не общим порогом: для
  -- писавшего пять раз в день три дня тишины — сигнал, для писавшего раз в неделю —
  -- норма. Потолок задаёт фаза жизни; рубеж на 28 днях — принятая мера результата в
  -- исследованиях по отказу от курения, а не круглое число.
  return query
  with base as (
    select p.id as user_id, p.created_at, p.onboarding_completed_at,
           (now()::date - p.created_at::date) as life_days
    from public.profiles p where p.status = 'active'
  ),
  eps as (
    select e.user_id, e.started_at, e.completed_at, e.outcome,
           lag(e.started_at) over (partition by e.user_id order by e.started_at) as prev_at
    from public.episodes e where e.deleted_at is null
  ),
  rhythm as (
    select eps.user_id,
           percentile_disc(0.8) within group (
             order by extract(epoch from (eps.started_at - eps.prev_at)) / 86400
           ) as p80_days
    from eps where eps.prev_at is not null and eps.started_at > now() - interval '30 days'
    group by eps.user_id
  ),
  activity as (
    select eps.user_id,
           max(eps.started_at) as last_at,
           count(*) as episodes_total,
           count(*) filter (where eps.completed_at is not null and eps.outcome <> 'open') as finished_total,
           count(*) filter (where eps.started_at > now() - interval '7 days') as last_week,
           count(*) filter (where eps.started_at between now() - interval '28 days' and now() - interval '7 days') as prior_three_weeks
    from eps group by eps.user_id
  ),
  windowed as (
    select b.user_id, b.life_days, b.onboarding_completed_at,
           a.last_at, a.episodes_total, a.finished_total, a.last_week, a.prior_three_weeks,
           case
             when b.life_days <= 7 then 3
             when b.life_days <= 28 then least(greatest(coalesce(r.p80_days, 3) * 1.5, 3), 10)
             else least(greatest(coalesce(r.p80_days, 3) * 1.5, 3), 21)
           end as expected_days
    from base b
    left join rhythm r on r.user_id = b.user_id
    left join activity a on a.user_id = b.user_id
  ),
  judged as (
    select
      case
        when w.last_at is null then 'затих'
        when w.last_at > now() - make_interval(days => w.expected_days::integer) then 'активен'
        else 'затих'
      end as state,
      -- Успех выглядит как затухание, отвал — как ступенька. Если сокращать модель до
      -- одного признака, останется этот.
      case
        when w.onboarding_completed_at is null then 'не дошёл до сути'
        when w.episodes_total > 0 and w.finished_total * 100 / greatest(w.episodes_total, 1) < 30
          then 'трение сценария'
        when w.life_days >= 28 and w.prior_three_weeks > 0 and w.last_week = 0
          and w.prior_three_weeks <= 3 then 'вероятно справился'
        when w.prior_three_weeks >= 4 and w.last_week = 0 then 'обрыв'
        else 'неизвестно'
      end as direction
    from windowed w
  ),
  shown as (
    select j.state as state,
           case when j.state = 'активен' then '—' else j.direction end as direction
    from judged j
  )
  select sh.state, sh.direction, count(*)::bigint,
         case when sh.direction = 'неизвестно'
              then 'признаков не хватило; точный ответ даёт вопрос человеку, а не запрос' end
  from shown sh
  group by sh.state, sh.direction
  having count(*) >= 3
  order by sh.state, count(*) desc;
end;
$$;
