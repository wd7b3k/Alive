-- Мониторинг перестаёт врать: граница наблюдений и порог доверия к проценту.
--
-- Экран показывал «Авария» и 86.81% доступности. Разбор 31.08 нашёл три разные причины,
-- и только две из них лечатся здесь.
--
-- ПРИЧИНА, КОТОРУЮ НЕ НАДО ЛЕЧИТЬ. Основной вклад в «аварию» давал `build_fingerprint`:
-- 1186 отказов подряд с вечера 30.08 с сообщением «прод отстаёт от origin/main на N
-- коммитов». Это правда, проверка работает как задумано, и чинится она выкладкой, а не
-- миграцией. Записано здесь, чтобы через месяц никто не искал в этой миграции причину,
-- по которой экран когда-то краснел.
--
-- ПРИЧИНА ПЕРВАЯ. `auth_health` получал 401, `yandex_bridge` ждал ровно 302 вместо 303.
-- Обе проверки были неверны, обе починены 30.08. Но снятые до починки записи остались и
-- считаются наравне со свежими: один отказ на четыре наблюдения — это 75% «доступности»
-- у исправной службы.
--
-- Решение владельца 31.08: историю периода разработки не учитывать — границей, а не
-- удалением. Три довода, и первый важнее прочих:
--
--   1. удаление стирает улику. Строки с 401 и 303 — доказательство, что проверка была
--      неверной, и единственный материал, чтобы научиться узнавать ложный отказ;
--   2. граница обратима: сдвинуть дату — одна строка, вернуть удалённое — нечем;
--   3. чистка уже есть. `roll_up_and_prune` убирает сырьё старше 90 дней сам.
--
-- ПРИЧИНА ВТОРАЯ. Процент считался по горстке точек. «69.81% доступности» при четырёх
-- наблюдениях — это не измерение, а анекдот в форме измерения, и стоит он рядом со
-- словом «доступность». Меньше тридцати наблюдений — процент не показывается вовсе.
-- Тот же принцип, что у подавления разрезов меньше трёх человек в аналитике: отказ
-- отвечать честнее уверенного ответа по трём точкам.
--
-- Заодно порог молчания снижен с трёх интервалов до двух — решение владельца 31.08.

-- --------------------------------------------------------------------------------
-- Граница наблюдений
-- --------------------------------------------------------------------------------

create table if not exists ops.settings (
  key text primary key,
  value text not null,
  -- Причина, по которой значение такое. Настройка без причины через месяц становится
  -- числом, которое никто не решается тронуть.
  note text
);

comment on table ops.settings is
  'Настройки эксплуатации, у которых есть причина. Меняются миграцией, как и всё остальное.';

insert into ops.settings (key, value, note) values (
  'observations_since',
  '2026-08-30T15:18:29Z',
  'Первый прогон починенных проверок auth_health и yandex_bridge. До этого момента обе давали ложный отказ: 401 без заголовка apikey и ожидание ровно 302 вместо 303. Записи остаются в ops.check_results как улика, но в агрегаты не входят. Сдвигать только вместе с причиной здесь же.'
)
on conflict (key) do update set value = excluded.value, note = excluded.note;

-- Момент, с которого измерения считаются настоящими. Отсутствие настройки означает
-- «считать всё»: слой наблюдаемости не должен ослепнуть оттого, что строку забыли.
create or replace function ops.observations_since() returns timestamptz
  language sql stable as $fn$
  select coalesce(
    (select s.value::timestamptz from ops.settings s where s.key = 'observations_since'),
    '-infinity'::timestamptz
  );
$fn$;

-- Сколько наблюдений нужно, чтобы называть долю успешных «доступностью». Тридцать —
-- не расчёт, а граница здравого смысла: на минутной проверке это полчаса, на
-- пятиминутной — два с половиной часа. Меньше — прочерк и слова «мало наблюдений».
create or replace function ops.min_observations() returns integer
  language sql immutable as 'select 30';

-- Порог молчания снижен с трёх интервалов до двух: решение владельца 31.08. Три
-- интервала прощали пропуск и ещё половину следующего; два означают, что пропущенный
-- запуск виден сразу. Плата — на минутной проверке случайная задержка таймера тоже
-- станет видна; это осознанный размен в пользу более чуткого экрана.
create or replace function ops.stale_factor() returns integer
  language sql immutable as 'select 2';

-- --------------------------------------------------------------------------------
-- Состояние считается только по настоящим наблюдениям
-- --------------------------------------------------------------------------------

create or replace view ops.check_state as
with latest as (
  select distinct on (r.check_name, coalesce(r.target, ''))
         r.check_name, r.target, r.status, r.latency_ms, r.value, r.detail, r.observed_at
  from ops.check_results r
  where r.observed_at >= ops.observations_since()
  order by r.check_name, coalesce(r.target, ''), r.observed_at desc
)
select
  coalesce(k.check_name, l.check_name) as check_name,
  l.target,
  k.component_id,
  coalesce(k.title, k.check_name, l.check_name) as title,
  coalesce(
    k.hint,
    'Проверка пишет в ops.check_results, но не описана в ops.check_catalog: что она означает — неизвестно.'
  ) as hint,
  k.unit,
  k.period_seconds,
  coalesce(k.sort_order, 999) as sort_order,
  l.value,
  l.latency_ms,
  coalesce(l.detail->>'note', nullif(l.detail::text, '{}')) as note,
  l.observed_at,
  extract(epoch from now() - l.observed_at)::integer as age_seconds,
  case
    when l.observed_at is null then 'silent'
    when k.period_seconds is not null
     and now() - l.observed_at
         > make_interval(secs => k.period_seconds * ops.stale_factor()) then 'stale'
    else l.status
  end as status
from ops.check_catalog k
full join latest l on l.check_name = k.check_name;

-- Суточная свёртка тоже считает только настоящее. Иначе граница действовала бы ровно до
-- первого прогона свёртки, после чего ложный отказ вернулся бы — уже в виде агрегата,
-- где его происхождение не разглядеть.
create or replace function ops.roll_up_and_prune(keep_days integer default 90)
returns void
language plpgsql
as $$
begin
  insert into ops.check_daily (
    check_name, day, samples, ok_count, warn_count, fail_count,
    latency_p50_ms, latency_p95_ms, latency_max_ms
  )
  select
    check_name,
    (observed_at at time zone 'UTC')::date as day,
    count(*),
    count(*) filter (where status = 'ok'),
    count(*) filter (where status = 'warn'),
    count(*) filter (where status = 'fail'),
    percentile_disc(0.5) within group (order by latency_ms)::integer,
    percentile_disc(0.95) within group (order by latency_ms)::integer,
    max(latency_ms)
  from ops.check_results
  where observed_at < date_trunc('day', now())
    and observed_at >= ops.observations_since()
  group by 1, 2
  on conflict (check_name, day) do update set
    samples = excluded.samples,
    ok_count = excluded.ok_count,
    warn_count = excluded.warn_count,
    fail_count = excluded.fail_count,
    latency_p50_ms = excluded.latency_p50_ms,
    latency_p95_ms = excluded.latency_p95_ms,
    latency_max_ms = excluded.latency_max_ms;

  -- Сырьё чистится по сроку, а не по границе: улика живёт положенные 90 дней и уходит
  -- сама. Специально удалять период разработки не нужно и не следует.
  delete from ops.check_results
  where observed_at < now() - make_interval(days => keep_days);
end;
$$;

revoke all on ops.settings from public;
revoke all on function ops.observations_since() from public;
revoke all on function ops.min_observations() from public;

-- --------------------------------------------------------------------------------
-- Витрины: граница, порог наблюдений и момент начала наблюдений на экране
-- --------------------------------------------------------------------------------
--
-- Функции пересоздаются, а не заменяются: у сводки и у состояния частей меняется список
-- возвращаемых колонок, а `create or replace` этого не умеет. Права выдаются заново —
-- `drop` уносит их с собой.

drop function if exists public.admin_service_summary(integer);

create or replace function public.admin_service_summary(p_hours integer default 24)
returns table (
  status text,
  worst_component text,
  window_hours integer,
  generated_at timestamptz,
  observations_since timestamptz,
  components_live integer,
  components_failing integer,
  components_warning integer,
  components_silent integer,
  components_planned integer,
  checks_total integer,
  checks_unregistered integer,
  uptime_pct numeric,
  uptime_samples integer
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := greatest(now() - make_interval(hours => span), ops.observations_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_summary доступна только администраторам приложения';
  end if;

  return query
  with parts as (
    select cs.component_id, cs.title, cs.lifecycle, cs.critical, cs.status, cs.sort_order
    from ops.component_state cs
  ),
  orphans as (
    select count(*)::integer as total,
           (count(*) filter (where k.status <> 'ok'))::integer as bad
    from ops.check_state k
    where k.component_id is null
  ),
  uptime as (
    select count(*)::integer as samples,
           (count(*) filter (where r.status = 'ok'))::integer as ok_samples
    from ops.check_results r
    join ops.check_catalog c on c.check_name = r.check_name
    join ops.components m on m.id = c.component_id and m.critical and m.lifecycle = 'live'
    where r.observed_at >= since
  )
  select
    case
      when exists (select 1 from parts p
                    where p.critical and p.lifecycle = 'live' and p.status = 'fail')
        then 'down'
      when exists (select 1 from parts p
                    where p.critical and p.lifecycle = 'live'
                      and p.status in ('stale', 'silent'))
        then 'unknown'
      when exists (select 1 from parts p
                    where p.lifecycle = 'live' and p.status <> 'ok')
        or (select o.bad from orphans o) > 0 then 'degraded'
      else 'ok'
    end,
    (select p.title from parts p
      where p.lifecycle = 'live' and p.status <> 'ok'
      order by ops.severity(p.status) desc, p.sort_order
      limit 1),
    span,
    now(),
    ops.observations_since(),
    (select count(*)::integer from parts p where p.lifecycle = 'live'),
    (select count(*)::integer from parts p where p.lifecycle = 'live' and p.status = 'fail'),
    (select count(*)::integer from parts p where p.lifecycle = 'live' and p.status = 'warn'),
    (select count(*)::integer from parts p
      where p.lifecycle = 'live' and p.status in ('stale', 'silent')),
    (select count(*)::integer from parts p where p.lifecycle = 'planned'),
    (select count(*)::integer from ops.check_state k),
    (select o.total from orphans o),
    -- Процент появляется только когда его есть из чего считать.
    (select case when u.samples >= ops.min_observations()
                 then round(u.ok_samples * 100.0 / u.samples, 2) end from uptime u),
    (select u.samples from uptime u);
end;
$$;

comment on function public.admin_service_summary(integer) is
  'Один ответ на вопрос «что с сервисом»: вердикт, худшая часть и доступность критичных частей за окно.';

drop function if exists public.admin_service_health(integer);

create or replace function public.admin_service_health(p_hours integer default 24)
returns table (
  component_id text,
  layer text,
  title text,
  hint text,
  lifecycle text,
  critical boolean,
  status text,
  checks_total integer,
  checks_failing integer,
  checks_warning integer,
  checks_silent integer,
  worst_check text,
  last_seen timestamptz,
  uptime_pct numeric,
  latency_p95_ms integer,
  uptime_samples integer
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := greatest(now() - make_interval(hours => span), ops.observations_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_health доступна только администраторам приложения';
  end if;

  return query
  with win as (
    select c.component_id as cid,
           count(*)::integer as samples,
           (count(*) filter (where r.status = 'ok'))::integer as ok_samples,
           (percentile_disc(0.95) within group (order by r.latency_ms))::integer as p95
    from ops.check_results r
    join ops.check_catalog c on c.check_name = r.check_name
    where r.observed_at >= since
    group by c.component_id
  )
  select
    cs.component_id, cs.layer, cs.title, cs.hint, cs.lifecycle, cs.critical, cs.status,
    cs.checks_total, cs.checks_failing, cs.checks_warning, cs.checks_silent,
    cs.worst_check, cs.last_seen,
    case when w.samples >= ops.min_observations()
         then round(w.ok_samples * 100.0 / w.samples, 2) end,
    w.p95,
    coalesce(w.samples, 0)
  from ops.component_state cs
  left join win w on w.cid = cs.component_id
  order by
    case cs.layer when 'frontend' then 1 when 'backend' then 2 else 3 end,
    cs.sort_order;
end;
$$;

comment on function public.admin_service_health(integer) is
  'Состояние каждой части сервиса: статус, доступность и задержка за окно.';

create or replace function public.admin_service_checks(p_hours integer default 24)
returns table (
  component_id text,
  component_title text,
  layer text,
  check_name text,
  target text,
  title text,
  hint text,
  unit text,
  status text,
  value numeric,
  latency_ms integer,
  note text,
  observed_at timestamptz,
  age_seconds integer,
  period_seconds integer,
  samples integer,
  uptime_pct numeric
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := greatest(now() - make_interval(hours => span), ops.observations_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_checks доступна только администраторам приложения';
  end if;

  return query
  with win as (
    select r.check_name as cn, coalesce(r.target, '') as tg,
           count(*)::integer as samples,
           (count(*) filter (where r.status = 'ok'))::integer as ok_samples
    from ops.check_results r
    where r.observed_at >= since
    group by r.check_name, coalesce(r.target, '')
  )
  select
    cst.component_id,
    m.title,
    m.layer,
    cst.check_name, cst.target, cst.title, cst.hint, cst.unit,
    cst.status, cst.value, cst.latency_ms, cst.note,
    cst.observed_at, cst.age_seconds, cst.period_seconds,
    coalesce(w.samples, 0),
    case when w.samples >= ops.min_observations()
         then round(w.ok_samples * 100.0 / w.samples, 2) end
  from ops.check_state cst
  left join ops.components m on m.id = cst.component_id
  left join win w on w.cn = cst.check_name and w.tg = coalesce(cst.target, '')
  order by
    case m.layer when 'frontend' then 1 when 'backend' then 2 when 'platform' then 3
      else 4 end,
    m.sort_order nulls last,
    cst.sort_order,
    cst.check_name,
    cst.target nulls first;
end;
$$;

comment on function public.admin_service_checks(integer) is
  'Каждая проверка по отдельности: последнее значение, возраст и доступность за окно.';

create or replace function public.admin_service_incidents(p_days integer default 7)
returns table (
  check_name text,
  title text,
  component_title text,
  target text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  samples integer,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_days, 7), 90));
  since timestamptz := greatest(now() - make_interval(days => span), ops.observations_since());
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_incidents доступна только администраторам приложения';
  end if;

  return query
  with marked as (
    select r.check_name as cn,
           coalesce(r.target, '') as tg,
           r.status as st,
           r.detail as dt,
           r.observed_at as at,
           (r.status <> 'ok') as bad,
           row_number() over (
             partition by r.check_name, coalesce(r.target, '') order by r.observed_at)
           - row_number() over (
             partition by r.check_name, coalesce(r.target, ''), (r.status <> 'ok')
             order by r.observed_at) as grp
    from ops.check_results r
    where r.observed_at >= since
  ),
  runs as (
    select mk.cn, mk.tg,
           min(mk.at) as started_at,
           max(mk.at) as ended_at,
           count(*)::integer as samples,
           case when bool_or(mk.st = 'fail') then 'fail' else 'warn' end as sev,
           (array_agg(coalesce(mk.dt->>'note', nullif(mk.dt::text, '{}')) order by mk.at desc)
             filter (where mk.dt is not null))[1] as note
    from marked mk
    where mk.bad
    group by mk.cn, mk.tg, mk.grp
  )
  select
    rn.cn,
    coalesce(c.title, rn.cn),
    m.title,
    nullif(rn.tg, ''),
    rn.sev,
    rn.started_at,
    rn.ended_at,
    rn.samples,
    rn.note
  from runs rn
  left join ops.check_catalog c on c.check_name = rn.cn
  left join ops.components m on m.id = c.component_id
  order by rn.started_at desc
  limit 100;
end;
$$;

comment on function public.admin_service_incidents(integer) is
  'Полосы неудач за период, свёрнутые в случаи: когда началось, когда кончилось, чем объяснено.';

revoke all on function public.admin_service_summary(integer) from public;
revoke all on function public.admin_service_health(integer) from public;
revoke all on function public.admin_service_checks(integer) from public;
revoke all on function public.admin_service_incidents(integer) from public;

grant execute on function public.admin_service_summary(integer) to authenticated;
grant execute on function public.admin_service_health(integer) to authenticated;
grant execute on function public.admin_service_checks(integer) to authenticated;
grant execute on function public.admin_service_incidents(integer) to authenticated;

notify pgrst, 'reload schema';
