-- Вехи воронки: считать людей, а не строки.
--
-- Клиент пишет строку `funnel_stage` каждый раз, когда веха случается, и это осознанно.
-- Предыдущая редакция гасила запись отметкой в браузере — и вместе с повтором гасила
-- второго человека за тем же ноутбуком: он не попадал в воронку вовсе, ни целью, ни
-- собственной строкой. Гарантии разные, и источники у них разные:
--
--   * «цель уходит один раз на человека» знает браузер — только он видит, что уже
--     отправлял в кабинет;
--   * «человек дошёл до вехи один раз» знает база — она видит всех людей, все браузеры
--     и всю историю.
--
-- Отсюда правило: клиент пишет всегда, повторы снимает запрос. Дедупликация здесь, и
-- если появится вторая витрина по вехам, она обязана взять её отсюда же — иначе двойной
-- счёт просто переедет из клиента в отчёт.
--
-- Ключ дедупликации — пара «человек + этап», первая строка по времени. Человек — это
-- `user_id`, а до входа `visitor_id`: у гостя аккаунта ещё нет, но веха `landing` у него
-- уже есть, и складывать всех гостей в одну строку с `user_id is null` значило бы
-- посчитать их за одного.
--
-- Разрезы здесь не подавляются, и это не исключение из правила, а его прочтение: порог
-- в три человека защищает срез по признаку — источник, регион, устройство, — по которому
-- участника можно узнать. «Сколько людей дошло до настройки» признаком не является; так
-- же не подавляет и `admin_funnel`, считающий те же шаги по таблицам.
--
-- Что эта витрина НЕ заменяет: `admin_funnel` считает шаги по `profiles` и `episodes`,
-- то есть по фактам. Здесь — по тому, что успел записать клиент. Числа разойдутся, и
-- расхождение само по себе полезно: оно измеряет, сколько событий не доехало.

create or replace function public.admin_funnel_stages(days integer default 30)
returns table (
  stage text,
  title text,
  people bigint,
  rows_written bigint,
  first_at timestamptz,
  last_at timestamptz
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
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
$$;

comment on function public.admin_funnel_stages(integer) is
  'Вехи воронки по событиям клиента: люди, а не строки. Дедупликация — первая запись на пару «человек + этап».';

revoke all on function public.admin_funnel_stages(integer) from public;
grant execute on function public.admin_funnel_stages(integer) to authenticated;

notify pgrst, 'reload schema';
