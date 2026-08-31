-- Воронка на пересечении источника и этапа, и три числа, которые видно первыми.
--
-- ПОЧЕМУ ВОРОНКА ПО ИСТОЧНИКАМ. `admin_sources` знает, откуда пришли; `admin_funnel` —
-- сколько дошло. Пересечения не было, а вопрос стоит именно на нём: какой источник
-- приводит людей, доходящих до результата, а какой — только визиты. Источник, давший сто
-- визитов и ноль разборов, хуже источника с пятью и пятью, и без этого разреза они
-- выглядят наоборот.
--
-- ПОЧЕМУ ДЕЛЬТЫ СЧИТАЮТСЯ ЗДЕСЬ, А НЕ НА ЭКРАНЕ. Число без «было» не говорит ничего.
-- Но «было» — это не вычитание: у долей и уникальных людей предыдущий период считается
-- отдельным запросом, а не разностью двух окон. Сложить два периода и вычесть один из
-- другого можно только для сумм; для `count(distinct)` это даёт неверный ответ тихо.
-- Поэтому предыдущее окно считается тем же кодом по сдвинутым границам.
--
-- ЧЕГО ЗДЕСЬ НЕТ. Идентификаторов участников — ни в одном поле. Разрезы меньше трёх
-- посетителей подавляются, как везде. Там, где считать нечем, возвращается причина, а не
-- ноль: ноль читается как «всё плохо», а не как «мы это не измеряем».

create or replace function public.admin_source_funnel(days integer default 30)
returns table (
  source_kind text,
  detail text,
  visitors bigint,
  signed_up bigint,
  onboarded bigint,
  first_episode bigint,
  with_result bigint,
  retained_week2 bigint
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_source_funnel доступна только администраторам приложения';
  end if;

  -- Связь визита с человеком — `claimed_by`, и другой у нас нет. Отсюда следствие,
  -- которое надо помнить при чтении: человек, зашедший с телефона и зарегистрировавшийся
  -- с ноутбука, попадёт в источник того визита, который его «забрал». Это не ошибка
  -- расчёта, а граница метода.
  return query
  with v as (
    select av.visitor_id,
           coalesce(av.source_kind, 'direct') as kind,
           coalesce(nullif(av.utm_source, ''), av.referrer_host, '—') as detail,
           av.claimed_by
    from public.analytics_visitors av
    where av.first_seen_at >= since
  ),
  eps as (
    select e.user_id,
           bool_or(e.deleted_at is null) as any_episode,
           bool_or(e.deleted_at is null
                   and e.completed_at is not null
                   and e.outcome <> 'open') as any_result
    from public.episodes e
    group by e.user_id
  ),
  ret as (
    -- Возврат на второй неделе считается от даты регистрации самого человека, а не от
    -- начала окна: иначе «вторая неделя» будет означать разное для пришедших в разные дни.
    select e.user_id
    from public.episodes e
    join public.profiles p on p.id = e.user_id
    where e.deleted_at is null
      and e.started_at between p.created_at + interval '7 days'
                           and p.created_at + interval '14 days'
    group by e.user_id
  )
  select
    v.kind,
    v.detail,
    count(*)::bigint,
    count(v.claimed_by)::bigint,
    (count(*) filter (where pr.onboarding_completed_at is not null))::bigint,
    (count(*) filter (where ep.any_episode))::bigint,
    (count(*) filter (where ep.any_result))::bigint,
    (count(*) filter (where rt.user_id is not null))::bigint
  from v
  left join public.profiles pr on pr.id = v.claimed_by
  left join eps ep on ep.user_id = v.claimed_by
  left join ret rt on rt.user_id = v.claimed_by
  group by v.kind, v.detail
  having count(*) >= 3
  order by 3 desc, 1, 2;
end;
$$;

comment on function public.admin_source_funnel(integer) is
  'Воронка на пересечении источника и этапа: от визита до результата и возврата. Разрезы меньше трёх посетителей подавлены.';

-- --------------------------------------------------------------------------------
-- Три числа, которые видно первыми
-- --------------------------------------------------------------------------------

create or replace function public.admin_headline(days integer default 30)
returns table (
  metric text,
  title text,
  hint text,
  value numeric,
  unit text,
  previous numeric,
  better_when text,
  computable boolean,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  now_from timestamptz := now() - make_interval(days => window_days);
  prev_from timestamptz := now() - make_interval(days => window_days * 2);

  week_now bigint;
  week_prev bigint;

  visitors_now bigint;
  result_now bigint;
  visitors_prev bigint;
  result_prev bigint;

  base_now bigint;
  gone_now bigint;
  base_prev bigint;
  gone_prev bigint;
begin
  if not private.is_alive_admin() then
    raise exception 'admin_headline доступна только администраторам приложения';
  end if;

  -- 1. Метрика жизни: люди, доведшие разбор до результата. Окно здесь всегда неделя, а не
  -- выбранный период: это недельная метрика по определению, и растягивать её на квартал
  -- значит показывать другое число под тем же названием.
  select count(distinct e.user_id) into week_now
  from public.episodes e
  where e.deleted_at is null and e.completed_at is not null and e.outcome <> 'open'
    and e.completed_at >= now() - interval '7 days';

  select count(distinct e.user_id) into week_prev
  from public.episodes e
  where e.deleted_at is null and e.completed_at is not null and e.outcome <> 'open'
    and e.completed_at >= now() - interval '14 days'
    and e.completed_at <  now() - interval '7 days';

  -- 2. Конверсия визит → результат. Считается по посетителям окна и по тому, дошёл ли
  -- человек, которого этот визит привёл.
  select count(*), count(*) filter (where ep.any_result)
    into visitors_now, result_now
  from public.analytics_visitors av
  left join lateral (
    select bool_or(e.deleted_at is null and e.completed_at is not null
                   and e.outcome <> 'open') as any_result
    from public.episodes e where e.user_id = av.claimed_by
  ) ep on true
  where av.first_seen_at >= now_from;

  select count(*), count(*) filter (where ep.any_result)
    into visitors_prev, result_prev
  from public.analytics_visitors av
  left join lateral (
    select bool_or(e.deleted_at is null and e.completed_at is not null
                   and e.outcome <> 'open') as any_result
    from public.episodes e where e.user_id = av.claimed_by
  ) ep on true
  where av.first_seen_at >= prev_from and av.first_seen_at < now_from;

  -- 3. Доля затихших. Определение windowed и потому сравнимое с прошлым периодом: среди
  -- тех, кто вёл записи в предыдущем окне, какая часть не сделала ни одной в текущем.
  -- Это не та же величина, что состояние «затих» в модели оттока: там окно ожидания
  -- считается по личному ритму человека. Здесь — грубее и сравнимо во времени.
  select count(*) into base_now from (
    select e.user_id from public.episodes e
    where e.deleted_at is null and e.started_at >= prev_from and e.started_at < now_from
    group by e.user_id
  ) t;

  select count(*) into gone_now from (
    select e.user_id from public.episodes e
    where e.deleted_at is null and e.started_at >= prev_from and e.started_at < now_from
    group by e.user_id
    having not exists (
      select 1 from public.episodes e2
      where e2.user_id = e.user_id and e2.deleted_at is null and e2.started_at >= now_from
    )
  ) t;

  select count(*) into base_prev from (
    select e.user_id from public.episodes e
    where e.deleted_at is null
      and e.started_at >= now() - make_interval(days => window_days * 3)
      and e.started_at < prev_from
    group by e.user_id
  ) t;

  select count(*) into gone_prev from (
    select e.user_id from public.episodes e
    where e.deleted_at is null
      and e.started_at >= now() - make_interval(days => window_days * 3)
      and e.started_at < prev_from
    group by e.user_id
    having not exists (
      select 1 from public.episodes e2
      where e2.user_id = e.user_id and e2.deleted_at is null
        and e2.started_at >= prev_from and e2.started_at < now_from
    )
  ) t;

  return query
  select * from (values
    (
      'weekly_with_result',
      'Недельные с результатом',
      'Сколько человек за последние семь дней довели разбор тяги до результата. Метрика жизни: двигается быстро и первой показывает, что продукт кому-то нужен.',
      week_now::numeric,
      'человек',
      week_prev::numeric,
      'up',
      true,
      null::text
    ),
    (
      'visit_to_result',
      'Визит → результат',
      'Какая доля пришедших дошла до первого записанного результата. Главное число воронки: всё, что выше него, — это трафик, а не польза.',
      case when visitors_now >= 3 then round(result_now * 100.0 / visitors_now, 1) end,
      '%',
      case when visitors_prev >= 3 then round(result_prev * 100.0 / visitors_prev, 1) end,
      'up',
      visitors_now >= 3,
      case when visitors_now < 3
           then 'посетителей за период меньше трёх — разрез подавлен' end
    ),
    (
      'gone_share',
      'Затихли',
      'Среди тех, кто вёл записи в прошлом периоде, какая часть не сделала ни одной в этом. Грубее модели оттока и потому сравнима во времени.',
      case when base_now >= 3 then round(gone_now * 100.0 / base_now, 1) end,
      '%',
      case when base_prev >= 3 then round(gone_prev * 100.0 / base_prev, 1) end,
      'down',
      base_now >= 3,
      case when base_now < 3
           then 'в прошлом периоде писали меньше трёх человек — сравнивать нечего' end
    )
  ) as t(metric, title, hint, value, unit, previous, better_when, computable, note);
end;
$$;

comment on function public.admin_headline(integer) is
  'Три опорных числа с предыдущим периодом: недельные с результатом, конверсия визит → результат, доля затихших.';

revoke all on function public.admin_source_funnel(integer) from public;
revoke all on function public.admin_headline(integer) from public;

grant execute on function public.admin_source_funnel(integer) to authenticated;
grant execute on function public.admin_headline(integer) to authenticated;

notify pgrst, 'reload schema';
