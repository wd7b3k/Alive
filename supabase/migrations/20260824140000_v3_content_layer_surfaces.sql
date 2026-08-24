-- Где каждая карточка имеет право появиться.
--
-- Владелец выбрал четыре места, куда «Факты и Мифы» встраиваются помимо собственного
-- раздела: в потоке тяги, в Связках рядом с конкретным триггером, на «Сегодня» и на
-- первом экране до входа. Разделу нужно знать, какая карточка куда годится, и это
-- редакционное решение, а не правило, которое можно вывести из данных: длинная
-- карточка про смертность не должна перебивать человека в момент тяги, даже если по
-- всем формальным признакам она подходит.
--
-- Поэтому — колонка, а не эвристика в коде. Пустой массив — нормальное состояние:
-- карточка живёт в разделе и больше нигде.

begin;

alter table public.facts_catalog add column if not exists surfaces text[] not null default '{}'::text[];
alter table public.myths_catalog add column if not exists surfaces text[] not null default '{}'::text[];

alter table public.facts_catalog drop constraint if exists facts_catalog_surfaces_known;
alter table public.facts_catalog add constraint facts_catalog_surfaces_known
  check (surfaces <@ array['flow', 'links', 'today', 'public']::text[]);

alter table public.myths_catalog drop constraint if exists myths_catalog_surfaces_known;
alter table public.myths_catalog add constraint myths_catalog_surfaces_known
  check (surfaces <@ array['flow', 'links', 'today', 'public']::text[]);

-- ---------------------------------------------------------------------------
-- Факты
-- ---------------------------------------------------------------------------
-- В поток тяги попадают только две карточки — обе про то, что происходит прямо сейчас,
-- и обе заканчиваются действием. Всё, что про смертность, риск и статистику, в поток
-- не идёт: в этот момент человеку нужна следующая минута, а не прогноз на десять лет.
--
-- На первый экран до входа отобраны те, что показывают выигрыш и помощь, а не ущерб.
-- Посетитель, который ещё ничего не решил, не должен встречать продукт цифрой о
-- потерянном десятилетии.
update public.facts_catalog set surfaces = v.s
from (values
  ('craving_is_signal',        array['flow', 'links', 'today']),
  ('cues_matter',              array['links', 'today']),
  ('digital_support',          array['today']),
  ('expectancies_predict_lapse', array['links', 'today']),
  ('heavy_smoker_cvd_5y',      array['today', 'public']),
  ('hookah_not_safe',          array['today']),
  ('lapse_is_data',            array['flow', 'today']),
  ('light_not_safe',           array['today']),
  ('low_intensity_cvd',        array['today']),
  ('mental_health_after_quit', array['today', 'public']),
  ('mortality_decade',         array['today']),
  ('nrt_safer',                array['today', 'public']),
  ('oral_health',              array['today']),
  ('quit_before_40',           array['today', 'public']),
  ('rewards_work',             array['today', 'public']),
  ('secondhand_no_safe',       array['today']),
  ('treatment_plus_support',   array['today', 'public']),
  ('weight_varies',            array['today']),
  ('who_medications',          array['today', 'public'])
) as v(code, s)
where facts_catalog.code = v.code;

-- ---------------------------------------------------------------------------
-- Мифы
-- ---------------------------------------------------------------------------
-- У мифа есть trigger_codes, поэтому в Связках он встаёт ровно к своему моменту:
-- «кофе без сигареты уже не тот» — на карточке триггера «кофе», и нигде больше.
-- В поток идут те, что отвечают на мысль, возникающую прямо во время тяги.
update public.myths_catalog set surfaces = v.s
from (values
  ('calms_me',                    array['flow', 'links', 'today', 'public']),
  ('can_quit_anytime',            array['links', 'today']),
  ('coffee_needs_smoke',          array['flow', 'links']),
  ('focus_better',                array['flow', 'links']),
  ('hookah_is_mild',              array['links', 'today']),
  ('lapse_resets_all',            array['flow', 'today', 'public']),
  ('light_is_safer',              array['today']),
  ('meal_needs_smoke',            array['flow', 'links']),
  ('nrt_same_as_smoking',         array['today', 'public']),
  ('one_does_not_count',          array['flow', 'today']),
  ('one_of_few_pleasures',        array['flow', 'links', 'today']),
  ('only_real_pause',             array['flow', 'links']),
  ('smoking_is_style',            array['links']),
  ('social_helper',               array['flow', 'links']),
  ('too_late_to_quit',            array['today', 'public']),
  ('too_stressed_to_quit',        array['flow', 'links', 'public']),
  ('vape_is_harmless',            array['today']),
  ('weight_is_inevitable',        array['today', 'public']),
  ('without_smoking_more_anxious', array['flow', 'links', 'today'])
) as v(code, s)
where myths_catalog.code = v.code;

-- ---------------------------------------------------------------------------
-- Проверки
-- ---------------------------------------------------------------------------
do $$
declare
  bad text;
begin
  -- Карточка, назначенная в Связки, но не привязанная ни к одному триггеру, туда
  -- никогда не попадёт: экран ищет карточки по коду триггера. Молчаливо исчезнувшая
  -- карточка выглядит как «раздел не работает», поэтому это ошибка, а не предупреждение.
  select string_agg(code, ', ') into bad
    from public.myths_catalog
   where 'links' = any(surfaces) and coalesce(array_length(trigger_codes, 1), 0) = 0;
  if bad is not null then
    raise exception 'Миф назначен в Связки, но не привязан к триггеру: %', bad;
  end if;

  -- Каждая из четырёх поверхностей должна получить хотя бы одну карточку, иначе на
  -- экране будет пусто, и понять это можно будет только глазами.
  select string_agg(s, ', ') into bad from unnest(array['flow', 'links', 'today', 'public']) s
   where not exists (
     select 1 from public.facts_catalog where s = any(surfaces)
     union all
     select 1 from public.myths_catalog where s = any(surfaces)
   );
  if bad is not null then
    raise exception 'Поверхность осталась без единой карточки: %', bad;
  end if;
end $$;

commit;
