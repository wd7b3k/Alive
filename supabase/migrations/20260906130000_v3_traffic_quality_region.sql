-- «Откуда люди»: к делению по поведению добавляется разрез по месту.
--
-- Что показали данные 06.09. Из 293 посетителей 271 пришёл за двое суток после выкладки
-- раздела знаний. Из них 133 с часовым поясом UTC и языком en-US — 120 за два часа
-- равномерно по всем статьям, ни одного второго события; 98 с America/Los_Angeles и
-- en-US, счётчик у них выполнялся — это рендерер Google, он же «пользователи» в GA и
-- «США, отказ 97%» в Метрике; 60 с Europe/Moscow и ru — 55 за два часа на одну страницу,
-- в Метрике «Германия, 9 минут», то есть машина владельца через VPN. Россия в Метрике за
-- неделю — один посетитель.
--
-- Поведения для ответа недостаточно: у обходчика и у владельца через VPN разное поведение,
-- но одинаково бесполезное для вопроса «пришли ли люди». Место добавляет второй признак,
-- и вместе они дают ответ, ради которого экран и открывают.
--
-- Чем меряем место. Только тем, что уже лежит в `analytics_visitors`: часовым поясом и
-- языком браузера. Ни адреса, ни user-agent, ни геолокации — новых полей не заводится ни
-- одного. Это не геолокация и не претендует ею быть.
--
-- Правило и его граница. Пояс — сигнал сильнее языка: VPN меняет адрес, но не системное
-- время, и случай владельца это ровно показывает — Метрика видит Германию, пояс говорит
-- Москву. Поэтому «Россия» — это российский пояс; язык учитывается только там, где пояса
-- нет вовсе. Русскоязычный человек в нероссийском поясе попадёт в «не Россию», и это
-- осознанная цена: мы отвечаем на вопрос «откуда заходят», а не «кто по паспорту».
--
-- `Etc/Unknown` — это браузер, сказавший «не знаю», а не место. Считается отсутствием
-- пояса, а не отдельной страной.
--
-- Слов «бот» и «человек» в подписях нет и здесь. Один заход описывает поведение, а не
-- природу: так выглядит и обходчик, и человек, закрывший вкладку через две секунды.

drop function if exists public.admin_traffic_quality(integer);

create or replace function public.admin_traffic_quality(days integer default 30)
returns table (
  region text,
  region_title text,
  segment text,
  segment_title text,
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
  since timestamptz := greatest(
    now() - make_interval(days => window_days),
    ops.product_history_since()
  );
  total bigint;
  -- Список зон России по IANA. Держится здесь, а не выводится из смещения: смещение
  -- совпадает у Калининграда с Восточной Европой, а у Владивостока — с половиной Азии.
  ru_zones text[] := array[
    'Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Simferopol', 'Europe/Kirov',
    'Europe/Volgograd', 'Europe/Astrakhan', 'Europe/Saratov', 'Europe/Ulyanovsk',
    'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk',
    'Asia/Barnaul', 'Asia/Tomsk', 'Asia/Novokuznetsk', 'Asia/Krasnoyarsk',
    'Asia/Irkutsk', 'Asia/Chita', 'Asia/Yakutsk', 'Asia/Khandyga',
    'Asia/Vladivostok', 'Asia/Ust-Nera', 'Asia/Magadan', 'Asia/Sakhalin',
    'Asia/Srednekolymsk', 'Asia/Kamchatka', 'Asia/Anadyr'
  ];
begin
  if not private.is_alive_admin() then
    raise exception 'admin_traffic_quality доступна только администраторам приложения';
  end if;

  select count(*) into total
  from public.analytics_visitors av
  where av.first_seen_at >= since;

  return query
  with seen as (
    select
      av.visitor_id,
      av.claimed_by,
      nullif(nullif(av.client_timezone, ''), 'Etc/Unknown') as zone,
      nullif(av.client_language, '') as lang
    from public.analytics_visitors av
    where av.first_seen_at >= since
  ),
  placed as (
    select
      s.visitor_id,
      s.claimed_by,
      case
        when s.zone is null and s.lang is null then 'unknown'
        when s.zone = any (ru_zones) then 'russia'
        when s.zone is null and s.lang ilike 'ru%' then 'russia'
        else 'other'
      end as region,
      (
        select count(*) from public.analytics_events e where e.visitor_id = s.visitor_id
      ) as events
    from seen s
  ),
  counted as (
    select
      p.region,
      case when p.events > 1 then 'engaged' else 'single_event' end as segment,
      count(*)::bigint as visitors,
      count(p.claimed_by)::bigint as signed_up
    from placed p
    group by 1, 2
  ),
  regions as (
    select * from (values
      ('russia', 'Россия', 1),
      ('other', 'Не Россия', 2),
      ('unknown', 'Место неизвестно', 3)
    ) as t(region, region_title, region_order)
  ),
  segments as (
    select * from (values
      (
        'engaged',
        'За заходом кто-то есть',
        'После открытия страницы пришло хотя бы ещё одно событие.',
        1
      ),
      (
        'single_event',
        'Один заход и больше ничего',
        'Ровно одно событие за всё время: страница не удержала — кем бы ни был зашедший.',
        2
      )
    ) as t(segment, segment_title, hint, segment_order)
  )
  select
    r.region,
    r.region_title,
    g.segment,
    g.segment_title,
    g.hint,
    -- Разрез меньше трёх посетителей не показывает числа. Строка остаётся: спрятать её
    -- значило бы ответить «ноль» на вопрос, который мы не считали.
    case when coalesce(c.visitors, 0) >= 3 then c.visitors end,
    case when coalesce(c.visitors, 0) >= 3 and total > 0
         then round(c.visitors * 100.0 / total, 1) end,
    case when coalesce(c.visitors, 0) >= 3 then c.signed_up end,
    case
      when c.visitors is null then 'за период таких заходов не было'
      when c.visitors < 3 then 'меньше трёх посетителей — разрез подавлен'
    end
  from regions r
  cross join segments g
  left join counted c on c.region = r.region and c.segment = g.segment
  order by r.region_order, g.segment_order;
end;
$$;

comment on function public.admin_traffic_quality(integer) is
  'Матрица «место × поведение» по часовому поясу и языку: откуда заходят и остаётся ли за заходом второе событие. Персональных полей не добавляет.';

revoke all on function public.admin_traffic_quality(integer) from public;
grant execute on function public.admin_traffic_quality(integer) to authenticated;

notify pgrst, 'reload schema';
