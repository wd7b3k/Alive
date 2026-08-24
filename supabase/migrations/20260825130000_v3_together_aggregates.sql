-- «Вместе» — слой социальной нормализации, а не рейтинг.
--
-- Спецификация раздела была написана в PRODUCT_STRATEGY ещё до этой ветки и здесь
-- выполняется буквально: показывать можно только разрешённые агрегаты, основное
-- сравнение — человек относительно собственного baseline, лидербордов нет.
--
-- Зачем это вообще нужно продукту: человек в зависимости почти всегда считает, что он
-- один такой и что срыв означает, что у него не получится. Оба убеждения — ложные, и
-- оба ломаются одним и тем же фактом: сегодня столько-то людей прошли такой же момент,
-- и столько-то вернулись после срыва. Это не мотивация, это поправка к картине мира.
--
-- Три правила, встроенные в саму функцию, а не в интерфейс:
--
-- 1. Наружу выходят только числа по группе. Ни одного user_id, ни одной записи, ни
--    одного имени. Интерфейс физически не может показать чужую строку, потому что
--    строк ему не выдают.
--
-- 2. Порог когорты. Пока активных людей меньше COHORT_FLOOR, функция возвращает
--    enough_people = false и нули. «Один человек вернулся после срыва» в маленькой
--    группе — это не статистика, это указание пальцем: любой, кто знает состав группы,
--    поймёт, о ком речь. Порог снимает это целиком.
--
-- 3. Никаких максимумов и рекордов. Никаких «лучший результат недели». Продукт,
--    который рядом с человеком в срыве показывает чужой рекорд, делает ровно то, чего
--    обещал не делать.

create or replace function public.together_pulse(days integer default 7)
returns table (
  period_days integer,
  enough_people boolean,
  people_active bigint,
  episodes_resolved bigint,
  people_returned_after_lapse bigint,
  pause_minutes bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  -- Ниже этого числа активных людей группа не показывается вообще.
  cohort_floor constant integer := 5;
  -- Одна пауза длиннее получаса — это почти всегда незакрытый экран, а не выдержанная
  -- тяга. Обрезаем, чтобы забытая вкладка не превращалась в «группа продержалась
  -- девять часов».
  max_pause_minutes constant integer := 30;
  window_days integer := greatest(1, least(coalesce(days, 7), 90));
  since timestamptz := now() - make_interval(days => window_days);
  active_count bigint;
begin
  select count(*) into active_count from (
    select e.user_id from public.episodes e
      where e.started_at >= since and e.deleted_at is null
    union
    select t.user_id from public.tobacco_events t
      where t.occurred_at >= since and t.deleted_at is null
  ) a;

  if active_count < cohort_floor then
    return query select window_days, false, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  with resolved as (
    select e.user_id, e.started_at, e.completed_at
      from public.episodes e
     where e.started_at >= since and e.deleted_at is null
       and e.outcome = 'successful_response'
  ),
  lapsed as (
    select distinct t.user_id, min(t.occurred_at) as first_lapse
      from public.tobacco_events t
     where t.occurred_at >= since and t.deleted_at is null
     group by t.user_id
  )
  select
    window_days,
    true,
    active_count,
    (select count(*) from resolved),
    -- Вернулся после срыва: был эпизод употребления, а ПОСЛЕ него — разобранный момент,
    -- закончившийся без никотина. Порядок важен: без него это считало бы просто людей,
    -- у которых за неделю было и то и другое.
    (select count(distinct r.user_id) from resolved r
       join lapsed l on l.user_id = r.user_id
      where r.started_at > l.first_lapse),
    (select coalesce(sum(least(
        greatest(extract(epoch from (r.completed_at - r.started_at)) / 60, 0),
        max_pause_minutes
      ))::bigint, 0)
       from resolved r where r.completed_at is not null);
end;
$$;

-- Только для вошедших. До входа группа не показывается: посетителю без аккаунта эти
-- числа ничего не говорят, а функция, открытая анониму, — это счётчик активности
-- продукта, доступный кому угодно.
revoke all on function public.together_pulse(integer) from public, anon;
grant execute on function public.together_pulse(integer) to authenticated;
