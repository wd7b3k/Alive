-- Разделить заходы, за которыми кто-то есть, и заходы, за которыми ничего.
--
-- Повод конкретный. В Google Analytics за 3–30 августа шесть «активных пользователей»:
-- пять из США, один из Германии, города Boardman, Council Bluffs, Acton, Glenview,
-- New York. Boardman — Амазон, Council Bluffs — Гугл; остальные того же свойства. У
-- продукта на русском языке, который отдаётся из Москвы. Российских посетителей — ноль.
-- Это не аудитория, это обходчики и проверки доступности.
--
-- Вывод, который надо было сделать до того, как строить по этим числам что-либо: первые
-- данные счётчика — не люди. Если их не отделить, каждая метрика отравлена с первого дня,
-- а «источники трафика» показывают дата-центры.
--
-- Чем отделяем. Ничем внешним и ничем новым: у нас уже есть `analytics_visitors` и
-- `analytics_events`. Признак один и он поведенческий — сделал ли посетитель хоть что-то
-- после того, как страница открылась. Обходчик берёт страницу и уходит; человек, которому
-- интересно, оставляет второе событие.
--
-- Чего эта функция НЕ делает и почему:
--
--   * не называет никого ботом. «Один заход и больше ничего» — это описание поведения,
--     а не приговор. Так выглядит и человек, закрывший вкладку через две секунды, и это
--     тоже важное число, просто про другое;
--   * не хранит и не читает user-agent, адрес, отпечаток. Новых персональных полей не
--     заводится ни одного: разделение целиком выводится из того, что уже записано;
--   * не удаляет и не прячет строки. Разрезы меньше трёх посетителей не показывают
--     число — но сам разрез остаётся видимым вместе с причиной, потому что «мало
--     наблюдений» и «ноль» это разные ответы.

create or replace function public.admin_traffic_quality(days integer default 30)
returns table (
  segment text,
  title text,
  hint text,
  visitors bigint,
  share_pct numeric,
  signed_up bigint,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 30), 365));
  since timestamptz := now() - make_interval(days => window_days);
  total bigint;
begin
  if not private.is_alive_admin() then
    raise exception 'admin_traffic_quality доступна только администраторам приложения';
  end if;

  select count(*) into total
  from public.analytics_visitors av
  where av.first_seen_at >= since;

  return query
  with seen as (
    select av.visitor_id, av.claimed_by
    from public.analytics_visitors av
    where av.first_seen_at >= since
  ),
  counted as (
    select s.visitor_id,
           s.claimed_by,
           (select count(*) from public.analytics_events e where e.visitor_id = s.visitor_id)
             as events
    from seen s
  ),
  buckets as (
    select case when c.events > 1 then 'engaged' else 'single_event' end as segment,
           count(*)::bigint as visitors,
           count(c.claimed_by)::bigint as signed_up
    from counted c
    group by 1
  ),
  described as (
    select * from (values
      (
        'engaged',
        'За заходом кто-то есть',
        'После открытия страницы пришло хотя бы ещё одно событие. Обходчик берёт страницу и уходит; тот, кому интересно, оставляет второй след.',
        1
      ),
      (
        'single_event',
        'Один заход и больше ничего',
        'Ровно одно событие за всё время. Так выглядит и робот из дата-центра, и человек, закрывший вкладку через две секунды. Различить их нашими данными нельзя — и не нужно: обе доли говорят о том, что страница не удержала.',
        2
      )
    ) as t(segment, title, hint, sort_order)
  )
  select
    d.segment,
    d.title,
    d.hint,
    -- Разрез меньше трёх посетителей не показывает числа. Строка при этом остаётся:
    -- спрятать её значило бы ответить «ноль» на вопрос, который мы не считали.
    case when coalesce(b.visitors, 0) >= 3 then b.visitors end,
    case when coalesce(b.visitors, 0) >= 3 and total > 0
         then round(b.visitors * 100.0 / total, 1) end,
    case when coalesce(b.visitors, 0) >= 3 then b.signed_up end,
    case
      when b.visitors is null then 'за период таких заходов не было'
      when b.visitors < 3 then 'меньше трёх посетителей — разрез подавлен'
    end
  from described d
  left join buckets b on b.segment = d.segment
  order by d.sort_order;
end;
$$;

comment on function public.admin_traffic_quality(integer) is
  'Заходы, за которыми кто-то есть, против заходов с единственным событием. Признак поведенческий, персональных полей не добавляет.';

revoke all on function public.admin_traffic_quality(integer) from public;
grant execute on function public.admin_traffic_quality(integer) to authenticated;

notify pgrst, 'reload schema';
