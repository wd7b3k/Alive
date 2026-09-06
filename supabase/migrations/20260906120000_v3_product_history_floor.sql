-- Окна витрин не начинаются раньше боевой истории.
--
-- Экран показывал «Затихли: −2 к прошлому периоду» при нулевом трафике. Число настоящее,
-- но считалось оно по записям периода разработки: в базе три профиля и два эпизода, все
-- от 27.08.2026 — дня, когда сводили контентный слой и проверяли сценарий руками. Ни
-- одного участника с тех пор не появилось, потому что и трафика не было.
--
-- Такие записи нельзя оставлять в окне. «Затихли» отвечает на вопрос «сколько людей
-- перестало писать» — а перестал писать тот, кто и не начинал: это была проверка, а не
-- человек. Метрика, посчитанная по проверкам, врёт не величиной, а смыслом.
--
-- Граница ставится там же, где уже стоит граница наблюдений мониторинга, и по той же
-- причине: удаление стирает улику, а дату можно сдвинуть одной строкой. 30.08.2026 —
-- день, когда счётчики впервые отработали в браузере (`COUNTERS_LIVE_SINCE`), и первый
-- день, начиная с которого в базе лежат данные посетителей, а не разработки.
--
-- Затронуты десять витрин с временным окном. Определения взяты с боевой базы и
-- изменены механически в одном месте каждая — там, где вычисляется начало окна; тела
-- функций больше нигде не тронуты.
--
-- `admin_user_states` окна не имеет вовсе — она отвечает про «сейчас», и три тестовых
-- профиля попадут в неё до тех пор, пока не будут убраны или пока у неё не появится
-- окно. Это записано как остаток, а не закрыто молча.

insert into ops.settings (key, value, note) values (
  'product_history_since',
  '2026-08-30T00:00:00Z',
  'Начало боевой истории продукта. Всё, что раньше, — период разработки: три профиля и два эпизода от 27.08.2026, заведённые владельцем при проверке сценария. День совпадает с COUNTERS_LIVE_SINCE: 30.08 счётчики впервые отработали в браузере. Сдвигать только вместе с причиной здесь же.'
)
on conflict (key) do update set value = excluded.value, note = excluded.note;

-- Момент, раньше которого продуктовые витрины не смотрят. Отсутствие настройки означает
-- «считать всё»: аналитика не должна ослепнуть оттого, что строку забыли.
create or replace function ops.product_history_since() returns timestamptz
  language sql stable as $fn$
  select coalesce(
    (select s.value::timestamptz from ops.settings s where s.key = 'product_history_since'),
    '-infinity'::timestamptz
  );
$fn$;

revoke all on function ops.product_history_since() from public;

-- admin_core_metrics: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_core_metrics(weeks integer DEFAULT 12)
 RETURNS TABLE(week date, participants_with_result bigint, new_participants bigint, median_baseline_ratio numeric, ratio_observations bigint, computable boolean, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  span integer := greatest(1, least(coalesce(weeks, 12), 104));
  since timestamptz := greatest(date_trunc('week', now()) - make_interval(weeks => span), ops.product_history_since());
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
$function$;

-- admin_flow_steps: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_flow_steps(days integer DEFAULT 30)
 RETURNS TABLE(step_no integer, views bigint, people bigint, median_seconds numeric, drop_off_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
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
$function$;

-- admin_funnel: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_funnel(days integer DEFAULT 30)
 RETURNS TABLE(step_no integer, step text, people bigint, conversion_pct numeric, median_hours numeric, computable boolean, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
  visitors bigint;
  signups bigint;
  onboarded bigint;
  started bigint;
  finished bigint;
  three_in_week bigint;
  returned bigint;
begin
  if not private.is_alive_admin() then
    raise exception 'admin_funnel доступна только администраторам приложения';
  end if;

  select count(distinct v.visitor_id) into visitors
  from public.analytics_visitors v where v.first_seen_at >= since;

  select count(*) into signups from public.profiles p where p.created_at >= since;

  select count(*) into onboarded from public.profiles p
   where p.created_at >= since and p.onboarding_completed_at is not null;

  select count(distinct e.user_id) into started from public.episodes e
    join public.profiles p on p.id = e.user_id
   where p.created_at >= since and e.deleted_at is null;

  select count(distinct e.user_id) into finished from public.episodes e
    join public.profiles p on p.id = e.user_id
   where p.created_at >= since and e.deleted_at is null
     and e.completed_at is not null and e.outcome <> 'open';

  select count(*) into three_in_week from (
    select e.user_id from public.episodes e
      join public.profiles p on p.id = e.user_id
     where p.created_at >= since and e.deleted_at is null
       and e.started_at <= p.created_at + interval '7 days'
     group by e.user_id having count(*) >= 3
  ) t;

  select count(*) into returned from (
    select e.user_id from public.episodes e
      join public.profiles p on p.id = e.user_id
     where p.created_at >= since and e.deleted_at is null
       and e.started_at between p.created_at + interval '7 days' and p.created_at + interval '14 days'
     group by e.user_id
  ) t;

  return query
  select * from (values
    (1, 'Визит',                          visitors,      null::numeric, null::numeric, visitors > 0,
     case when visitors = 0 then 'анонимных событий нет: слой посетителей работает с 28.08.2026' end),
    (2, 'Регистрация с согласием',        signups,
        case when visitors > 0 then round(signups * 100.0 / visitors, 1) end, null::numeric, true, null),
    (3, 'Первичная настройка завершена',  onboarded,
        case when signups > 0 then round(onboarded * 100.0 / signups, 1) end, null::numeric, true, null),
    (4, 'Первый эпизод начат',            started,
        case when onboarded > 0 then round(started * 100.0 / onboarded, 1) end, null::numeric, true, null),
    (5, 'Эпизод доведён до результата',   finished,
        case when started > 0 then round(finished * 100.0 / started, 1) end, null::numeric, true, null),
    (6, 'Три эпизода за первые 7 дней',   three_in_week,
        case when finished > 0 then round(three_in_week * 100.0 / finished, 1) end, null::numeric, true, null),
    (7, 'Возврат на второй неделе',       returned,
        case when three_in_week > 0 then round(returned * 100.0 / three_in_week, 1) end, null::numeric, true, null)
  ) as t(step_no, step, people, conversion_pct, median_hours, computable, note);
end;
$function$;

-- admin_funnel_stages: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_funnel_stages(days integer DEFAULT 30)
 RETURNS TABLE(stage text, title text, people bigint, rows_written bigint, first_at timestamp with time zone, last_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_funnel_stages доступна только администраторам приложения';
  end if;

  return query
  with raw as (
    select
      e.funnel_stage as stage,
      coalesce(e.user_id::text, e.visitor_id::text) as person,
      e.occurred_at
    from public.analytics_events e
    where e.event_type = 'funnel_stage'
      and e.funnel_stage is not null
      and e.occurred_at >= since
      and coalesce(e.user_id::text, e.visitor_id::text) is not null
  ),
  -- Первая строка по времени на пару «человек + этап». Именно первая, а не любая:
  -- вопрос воронки — когда человек дошёл, а не когда об этом написали в последний раз.
  deduped as (
    select distinct on (r.person, r.stage) r.person, r.stage, r.occurred_at
    from raw r
    order by r.person, r.stage, r.occurred_at
  ),
  ordering as (
    select * from (values
      ('landing', 'Открыл продукт', 1),
      ('signed_in', 'Вошёл', 2),
      ('onboarded', 'Прошёл первичную настройку', 3),
      ('first_episode', 'Записал первый эпизод', 4),
      ('episode_with_result', 'Довёл эпизод до результата', 5),
      ('repeat_episode', 'Вернулся за следующим', 6)
    ) as t(stage, title, sort_order)
  )
  select
    o.stage,
    o.title,
    count(d.person)::bigint,
    (select count(*) from raw r where r.stage = o.stage)::bigint,
    min(d.occurred_at),
    max(d.occurred_at)
  from ordering o
  left join deduped d on d.stage = o.stage
  group by o.stage, o.title, o.sort_order
  order by o.sort_order;
end;
$function$;

-- admin_headline: окно не начинается раньше боевой истории (2).
CREATE OR REPLACE FUNCTION public.admin_headline(days integer DEFAULT 30)
 RETURNS TABLE(metric text, title text, hint text, value numeric, unit text, previous numeric, better_when text, computable boolean, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  now_from timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
  prev_from timestamptz := greatest(now() - make_interval(days => window_days * 2), ops.product_history_since());

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
    and e.completed_at >= greatest(now() - interval '7 days', ops.product_history_since());

  select count(distinct e.user_id) into week_prev
  from public.episodes e
  where e.deleted_at is null and e.completed_at is not null and e.outcome <> 'open'
    and e.completed_at >= greatest(now() - interval '14 days', ops.product_history_since())
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
$function$;

-- admin_hypothesis_metrics: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_hypothesis_metrics(days integer DEFAULT 14)
 RETURNS TABLE(hypothesis text, metric text, value numeric, unit text, observations bigint, computable boolean, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 14), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_hypothesis_metrics доступна только администраторам приложения';
  end if;

  return query
  with
  -- Разборы тяги окна. `quick_use` сюда не входит: это запись факта, а не сценарий.
  ep as (
    select * from public.episodes e
     where e.deleted_at is null
       and e.started_at >= since
       and coalesce(e.episode_kind, 'craving') = 'craving'
  ),
  -- Эпизоды, где экран ответа действительно открывался: только их можно сравнивать
  -- между собой по персонализации.
  offered as (
    select * from ep where array_length(offered_replacements, 1) is not null
  ),
  chosen as (
    select distinct a.episode_id from public.episode_actions a
      join ep on ep.id = a.episode_id
     where a.action_type = 'replacement'
  ),
  people as (
    select * from public.profiles p where p.role = 'participant'
  ),
  people_window as (
    select * from people p where p.created_at >= since
  ),
  -- Никотин в окне: и как исход разбора, и как отдельная запись.
  lapse as (
    select e.user_id, min(e.started_at) as first_lapse
      from ep e where e.outcome = 'nicotine_used' group by e.user_id
  )

  -- ── H-ALIVE-001. Разбор момента снижает тягу и меняет ответ ──────────────────────
  select 'H-ALIVE-001', 'Разборов тяги за окно',
         count(*)::numeric, 'шт', count(*), true, null::text from ep
  union all
  select 'H-ALIVE-001', 'Доля разборов с ответом на ползунок «до»',
         round(100.0 * count(*) filter (where craving_before is not null) / nullif(count(*), 0), 1),
         '%', count(*), true,
         'Качество данных, а не поведение. До 27.08 ползунки были предзаполнены, и «7» записывалось молча.'
    from ep
  union all
  select 'H-ALIVE-001', 'Средняя разница тяги до и после',
         round(avg(craving_before - craving_after)::numeric, 2), 'баллов',
         count(*) filter (where craving_before is not null and craving_after is not null), true,
         'Считается только по разборам, где человек ответил на оба ползунка.'
    from ep where craving_before is not null and craving_after is not null
  union all
  select 'H-ALIVE-001', 'Доля разборов с выбранной заменой',
         round(100.0 * (select count(*) from chosen) / nullif((select count(*) from offered), 0), 1),
         '%', (select count(*) from offered), true, null
  union all
  select 'H-ALIVE-001', 'Доля разборов без никотина',
         round(100.0 * count(*) filter (where outcome = 'successful_response')
               / nullif(count(*) filter (where outcome in ('successful_response', 'nicotine_used')), 0), 1),
         '%', count(*) filter (where outcome in ('successful_response', 'nicotine_used')), true, null
    from ep
  union all
  select 'H-ALIVE-001', 'Вернулись после срыва',
         count(*)::numeric, 'человек', (select count(*) from lapse), true,
         'Сколько людей сделали хотя бы один разбор после первого срыва в окне.'
    from lapse l where exists (
      select 1 from ep e where e.user_id = l.user_id and e.started_at > l.first_lapse)
  union all
  select 'H-ALIVE-001', 'Расход против исходного уровня',
         null::numeric, '%', 0::bigint, false,
         'Не считается: сохранение настроек перезаписывает строку продукта целиком, и прежний baseline исчезает без истории.'

  -- ── H-ALIVE-002. Персонализированный подбор лучше общего каталога ────────────────
  union all
  select 'H-ALIVE-002', 'Доля персонализированных подборов',
         round(100.0 * count(*) filter (where offer_personalized) / nullif(count(*), 0), 1),
         '%', count(*), true,
         'Пишется с 27.08. Разборы до этой даты в знаменатель не попадают.'
    from offered
  union all
  select 'H-ALIVE-002', 'Без никотина — персонализированный подбор',
         round(100.0 * count(*) filter (where outcome = 'successful_response')
               / nullif(count(*) filter (where outcome in ('successful_response', 'nicotine_used')), 0), 1),
         '%', count(*) filter (where outcome in ('successful_response', 'nicotine_used')), true, null
    from offered where offer_personalized
  union all
  select 'H-ALIVE-002', 'Без никотина — общий каталог',
         round(100.0 * count(*) filter (where outcome = 'successful_response')
               / nullif(count(*) filter (where outcome in ('successful_response', 'nicotine_used')), 0), 1),
         '%', count(*) filter (where outcome in ('successful_response', 'nicotine_used')), true,
         'Пара к строке выше. Это наблюдение, а не контролируемое сравнение: группа не назначается случайно.'
    from offered where offer_personalized is false
  union all
  select 'H-ALIVE-002', 'Средняя оценка «насколько помогло»',
         round(avg(helpfulness)::numeric, 2), 'из 5', count(*) filter (where helpfulness is not null), true, null
    from ep where helpfulness is not null
  union all
  select 'H-ALIVE-002', 'Замены, к которым возвращаются',
         count(*)::numeric, 'шт', count(*), true,
         'Замена, использованная одним человеком дважды и больше со средней оценкой от 4.'
    from public.user_replacement_stats s
   where s.attempts >= 2 and s.helpfulness_count > 0
     and s.helpfulness_sum / s.helpfulness_count >= 4

  -- ── H-ALIVE-003. Связки, названные самим человеком ───────────────────────────────
  union all
  select 'H-ALIVE-003', 'Создано Связок',
         count(*)::numeric, 'шт', count(*), true, null
    from public.user_links where deleted_at is null and created_at >= since
  union all
  select 'H-ALIVE-003', 'Повторное узнавание Связки в разборе',
         null::numeric, '%', 0::bigint, false,
         'Не считается: в эпизоде нет ссылки на user_links, только код триггера из каталога.'
  union all
  select 'H-ALIVE-003', 'Доля контекстов «другое»',
         null::numeric, '%', 0::bigint, false,
         'Не считается: варианта «другое» нет в интерфейсе, custom_trigger_text из UI недостижим и всегда пуст.'

  -- ── H-ALIVE-004. Смыслы ──────────────────────────────────────────────────────────
  union all
  select 'H-ALIVE-004', 'Создано Смыслов',
         count(*)::numeric, 'шт', count(*), true, null
    from public.user_meanings where deleted_at is null and created_at >= since
  union all
  select 'H-ALIVE-004', 'Отправлено в общий каталог',
         count(*)::numeric, 'шт', count(*), true, null
    from public.ugc_submissions where submitted_at >= since
  union all
  select 'H-ALIVE-004', 'Просмотры и польза Смыслов',
         null::numeric, '%', 0::bigint, false,
         'Не считается: событий просмотра Смысла нет, поля «помогло» у Смысла нет, ссылки из эпизода нет.'

  -- ── H-ALIVE-005. Онбординг и понятность ──────────────────────────────────────────
  union all
  select 'H-ALIVE-005', 'Дали согласие',
         round(100.0 * count(*) filter (where consent_accepted_at is not null) / nullif(count(*), 0), 1),
         '%', count(*), true,
         'Согласие спрашивается с 27.08. У тех, кто вошёл раньше, поле пустое.'
    from people
  union all
  select 'H-ALIVE-005', 'Дошли до конца настройки',
         round(100.0 * count(*) filter (where onboarding_completed_at is not null) / nullif(count(*), 0), 1),
         '%', count(*), true, null
    from people_window
  union all
  select 'H-ALIVE-005', 'Сделали первый разбор',
         round(100.0 * count(*) filter (where exists (
                 select 1 from public.episodes e where e.user_id = p.id and e.deleted_at is null))
               / nullif(count(*), 0), 1),
         '%', count(*), true, null
    from people_window p
  union all
  select 'H-ALIVE-005', 'Брошенных сценариев тяги',
         count(*)::numeric, 'шт', count(*), true,
         'Событие flow_abandoned. Обрыв на входе и на настройке не фиксируется — это другая дыра.'
    from public.analytics_events where event_type = 'flow_abandoned' and occurred_at >= since
  union all
  select 'H-ALIVE-005', 'Шаг, на котором чаще всего бросают',
         (select mode() within group (order by numeric_value)
            from public.analytics_events
           where event_type = 'flow_abandoned' and occurred_at >= since and numeric_value is not null),
         'номер шага',
         (select count(*) from public.analytics_events
           where event_type = 'flow_abandoned' and occurred_at >= since and numeric_value is not null),
         true, null

  -- ── H-ALIVE-006. Возвращаемость ──────────────────────────────────────────────────
  union all
  select 'H-ALIVE-006', 'Активных людей за окно',
         count(distinct user_id)::numeric, 'человек', count(distinct user_id), true, null
    from (select user_id from ep
          union all
          select user_id from public.tobacco_events where deleted_at is null and occurred_at >= since) a
  union all
  select 'H-ALIVE-006', 'Активных дней на человека',
         round(avg(d)::numeric, 2), 'дней', count(*), true, null
    from (select user_id, count(distinct date_trunc('day', started_at)) d from ep group by user_id) x
  union all
  select 'H-ALIVE-006', 'Возврат после напоминания',
         null::numeric, '%', 0::bigint, false,
         'Не считается: механизма напоминаний в продукте нет.'

  -- ── H-ALIVE-007. Единицы Habitoff понятны ────────────────────────────────────────
  union all
  select 'H-ALIVE-007', 'Понимание единиц',
         null::numeric, '%', 0::bigint, false,
         'Не считается: качественного канала нет. Нужен разговор с участником, а не запрос.'
  union all
  select 'H-ALIVE-007', 'Исправлений записей',
         null::numeric, 'шт', 0::bigint, false,
         'Не считается: редактирования эпизода не существует, только мягкое удаление, и оно не пишет события.'

  -- ── H-ALIVE-008. Вейп ────────────────────────────────────────────────────────────
  union all
  select 'H-ALIVE-008', 'Затяжек в день на человека',
         round(avg(v)::numeric, 1), 'затяжек', count(*), true, null
    from (select user_id, sum(vape_puffs)::numeric / window_days v
            from public.tobacco_events
           where deleted_at is null and occurred_at >= since and vape_puffs is not null
           group by user_id) v
  union all
  select 'H-ALIVE-008', 'Доля быстрых записей',
         round(100.0 * count(*) filter (where coalesce(episode_kind, 'craving') = 'quick_use')
               / nullif(count(*), 0), 1),
         '%', count(*), true, null
    from public.episodes where deleted_at is null and started_at >= since

  -- ── H-ALIVE-009. НЗТ и пищевые замены ────────────────────────────────────────────
  union all
  select 'H-ALIVE-009', 'Применений НЗТ',
         count(*)::numeric, 'шт', count(*), true, null
    from public.episode_actions where action_type = 'nrt' and occurred_at >= since
  union all
  select 'H-ALIVE-009', 'Доля отключивших пищевые замены',
         null::numeric, '%', 0::bigint, false,
         'Не считается: переключателя в интерфейсе нет вовсе, хранится только текущее состояние без истории.'

  -- ── H-ALIVE-010. Приватность ─────────────────────────────────────────────────────
  union all
  select 'H-ALIVE-010', 'Инцидентов приватности',
         null::numeric, 'шт', 0::bigint, false,
         'Не считается автоматически: реестра инцидентов нет. Ноль здесь означал бы «не проверяли», а не «не было».'
  union all
  select 'H-ALIVE-010', 'Ошибок продукта за окно',
         count(*)::numeric, 'шт', count(*), true,
         'Не метрика гипотезы, но соседний сигнал: молчащий продукт и сломанный выглядят одинаково.'
    from public.system_errors where occurred_at >= since;
end;
$function$;

-- admin_product_health: окно не начинается раньше боевой истории (2).
CREATE OR REPLACE FUNCTION public.admin_product_health(days integer DEFAULT 30)
 RETURNS TABLE(period_days integer, people_total bigint, people_new bigint, people_active bigint, people_returning bigint, people_first_episode bigint, episodes_total bigint, episodes_resolved bigint, resolved_share numeric, people_improving bigint, errors_total bigint, error_surfaces text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
  prev_since timestamptz := greatest(now() - make_interval(days => window_days * 2), ops.product_history_since());
begin
  -- Единственное, что стоит между обычным пользователем и всей базой: функция
  -- security definer, то есть внутри читает всё.
  if not private.is_alive_admin() then
    raise exception 'admin_product_health доступна только администраторам приложения';
  end if;

  return query
  with active_now as (
    select distinct e.user_id from public.episodes e
     where e.started_at >= since and e.deleted_at is null
    union
    select distinct t.user_id from public.tobacco_events t
     where t.occurred_at >= since and t.deleted_at is null
  ),
  active_prev as (
    select distinct e.user_id from public.episodes e
     where e.started_at >= prev_since and e.started_at < since and e.deleted_at is null
    union
    select distinct t.user_id from public.tobacco_events t
     where t.occurred_at >= prev_since and t.occurred_at < since and t.deleted_at is null
  ),
  craving_now as (
    select e.user_id, avg(e.craving_before)::numeric as avg_craving
      from public.episodes e
     where e.started_at >= since and e.deleted_at is null and e.craving_before is not null
     group by e.user_id
  ),
  craving_prev as (
    select e.user_id, avg(e.craving_before)::numeric as avg_craving
      from public.episodes e
     where e.started_at >= prev_since and e.started_at < since
       and e.deleted_at is null and e.craving_before is not null
     group by e.user_id
  ),
  episodes_window as (
    select * from public.episodes e where e.started_at >= since and e.deleted_at is null
  )
  select
    window_days,
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p where p.created_at >= since),
    (select count(*) from active_now),
    -- Удержание: активен и в этот период, и в предыдущий такой же. «Всего регистраций»
    -- растёт всегда и не значит ничего.
    (select count(*) from active_now a join active_prev b on b.user_id = a.user_id),
    (select count(distinct e.user_id) from public.episodes e
      where e.deleted_at is null and e.outcome is not null),
    (select count(*) from episodes_window),
    (select count(*) from episodes_window w where w.outcome = 'successful_response'),
    (select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where w.outcome = 'successful_response') / count(*), 1)
            end from episodes_window w),
    -- Прогресс относительно себя, а не рейтинг: средняя тяга ниже, чем была.
    (select count(*) from craving_now n join craving_prev p on p.user_id = n.user_id
      where n.avg_craving < p.avg_craving),
    (select count(*) from public.system_errors s where s.occurred_at >= since),
    (select coalesce(string_agg(x.surface || ': ' || x.n, ', ' order by x.n desc), '—')
       from (select s.surface, count(*) as n from public.system_errors s
              where s.occurred_at >= since group by s.surface order by count(*) desc limit 5) x);
end;
$function$;

-- admin_retention: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_retention(weeks integer DEFAULT 8)
 RETURNS TABLE(cohort_week date, cohort_size bigint, horizon_days integer, retained bigint, retained_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  span integer := greatest(1, least(coalesce(weeks, 8), 52));
  since timestamptz := greatest(date_trunc('week', now()) - make_interval(weeks => span), ops.product_history_since());
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
$function$;

-- admin_source_funnel: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_source_funnel(days integer DEFAULT 30)
 RETURNS TABLE(source_kind text, detail text, visitors bigint, signed_up bigint, onboarded bigint, first_episode bigint, with_result bigint, retained_week2 bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
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
$function$;

-- admin_sources: окно не начинается раньше боевой истории (1).
CREATE OR REPLACE FUNCTION public.admin_sources(days integer DEFAULT 30)
 RETURNS TABLE(source_kind text, detail text, visitors bigint, signups bigint, reached_result bigint, note text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := greatest(now() - make_interval(days => window_days), ops.product_history_since());
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
$function$;

notify pgrst, 'reload schema';
