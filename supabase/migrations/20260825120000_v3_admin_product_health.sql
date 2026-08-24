-- Сводка здоровья продукта одним вызовом.
--
-- Администратор и раньше мог читать журнал событий: политика
-- analytics_events_admin_read (20260817170000) пускает того, для кого
-- private.is_alive_admin() истинна. Прежняя админка этим и пользовалась — тянула сырые
-- строки в браузер и считала на клиенте.
--
-- Здесь добавляется не второй способ доступа, а недостающий: функция, возвращающая
-- только агрегаты. Разница практическая, а не эстетическая. Сырые строки содержат
-- user_id, и «посмотреть здоровье продукта» превращается в «выгрузить, кто когда курил».
-- Ответ на вопрос «живёт ли ALIVE» этого не требует ни в одной своей части.
--
-- Права на чтение таблиц у администратора при этом остаются: отбирать их здесь значило
-- бы ломать существующую админку одной миграцией. Но продуктовый экран пользуется этой
-- функцией, и всё, что он умеет показать, — числа.

create or replace function public.admin_product_health(days integer default 30)
returns table (
  period_days integer,
  people_total bigint,
  people_new bigint,
  people_active bigint,
  people_returning bigint,
  people_first_episode bigint,
  episodes_total bigint,
  episodes_resolved bigint,
  resolved_share numeric,
  people_improving bigint,
  errors_total bigint,
  error_surfaces text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
  prev_since timestamptz := now() - make_interval(days => window_days * 2);
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
$$;

revoke all on function public.admin_product_health(integer) from public, anon;
grant execute on function public.admin_product_health(integer) to authenticated;

comment on function public.admin_product_health(integer) is
  'Агрегаты здоровья продукта для администратора. Не возвращает ни одного идентификатора пользователя и ни одной строки данных.';
