-- Здоровье продукта: кто смотрит и что он видит.
--
-- Владелец должен видеть, живёт ли приложение: сколько людей пришло, сколько осталось,
-- дошли ли они до первого разобранного эпизода, двигается ли у них что-то, и не сыпется
-- ли продукт ошибками. Сейчас на эти вопросы нельзя ответить вообще.
--
-- Главное решение здесь — как устроен доступ. Соблазн выдать владельцу право читать
-- таблицы напрямую («это же мой продукт») стоит назвать вслух и отклонить: люди
-- записывают сюда, что с ними происходит в момент зависимости, и обещание приватности
-- в интерфейсе не должно держаться на том, что владелец не станет смотреть. Поэтому
-- прав на чтение нет ни у кого, включая администратора, а наружу выходит одна функция,
-- возвращающая только агрегаты.
--
-- Функция security definer: она читает таблицы правами владельца схемы, но сама
-- проверяет, кто её вызвал, и не отдаёт ни одной строки, по которой можно узнать
-- конкретного человека.

-- ---------------------------------------------------------------------------
-- Кто администратор
-- ---------------------------------------------------------------------------
-- Таблицей, а не константой в коде и не полем на профиле: список должен меняться без
-- релиза, а поле на профиле человек когда-нибудь сможет обновить сам через API.
-- Писать сюда клиент не может ни в какой роли — только через SQL Editor.
create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

-- Политик нет намеренно: с включённым RLS и без политик таблица недоступна клиенту
-- полностью. Функция ниже читает её как definer.

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Сводка здоровья
-- ---------------------------------------------------------------------------
-- Один вызов — одна строка чисел. Никаких user_id, никаких текстов, ничего, что можно
-- было бы связать с человеком.
--
-- Смысл полей:
--   people_total        — сколько всего профилей;
--   people_new          — сколько появилось за период;
--   people_active       — сколько за период хоть что-то делали (эпизод, событие, чекин);
--   people_returning    — из активных: сколько были активны и в предыдущем таком же
--                         периоде. Это и есть удержание, а не «всего регистраций»;
--   people_first_episode — сколько дошли до первого разобранного эпизода. Момент, где
--                         продукт впервые делает то, ради чего он есть;
--   episodes_total / episodes_resolved — сколько моментов тяги разобрано и сколько из
--                         них закончились без никотина;
--   resolved_share      — доля вторых в первых, в процентах;
--   people_improving    — сколько людей за период держали среднюю тягу ниже, чем в
--                         предыдущем периоде. Прогресс относительно себя, а не рейтинг;
--   errors_total / error_surfaces — здоровье приложения.
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
  if not public.is_app_admin() then
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
    (select count(*) from active_now a join active_prev b on b.user_id = a.user_id),
    (select count(distinct e.user_id) from public.episodes e
      where e.deleted_at is null and e.outcome is not null),
    (select count(*) from episodes_window),
    (select count(*) from episodes_window w where w.outcome = 'successful_response'),
    (select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where w.outcome = 'successful_response') / count(*), 1)
            end from episodes_window w),
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
