-- Публикация четырёх новых карточек и правка их уровней доказательности.
--
-- Уровни. Словарь в app/src/domain/evidence-levels.ts определяет A как вывод
-- систематического обзора или клинического руководства. Под это подходит только
-- withdrawal_shape (обзор достоверных симптомов воздержания). У остальных трёх источник —
-- одиночное исследование: наблюдательное на 16 участниках, одно РКИ на 261 человеке и
-- одно РКИ по функции лёгких. По словарю это B: «исследования есть, но они об отдельном
-- эффекте, а не о самом отказе». Уровень печатается рядом с утверждением и уходит в
-- разметку, поэтому правится до включения, а не после.
--
-- lung_decline_slows понижен до B сознательно, хотя утверждение сильное и воспроизведено
-- в докладах органов здравоохранения: карточка ссылается на конкретное РКИ, и уровень
-- должен соответствовать её источнику, а не общему весу темы в литературе.
--
-- Публикация. Решение владельца получено 06.09.2026 в чате: карточки должны быть на проде.

begin;

update public.myths_catalog set
  evidence_level = 'B',
  updated_at = now()
where code = 'no_minute_timeline';

update public.facts_catalog set
  evidence_level = 'B',
  updated_at = now()
where code in ('quit_vaping_is_task','lung_decline_slows');

update public.facts_catalog set
  published = true,
  updated_at = now()
where code in ('withdrawal_shape','quit_vaping_is_task','lung_decline_slows');

update public.myths_catalog set
  published = true,
  updated_at = now()
where code = 'no_minute_timeline';

-- Проверка: четыре карточки опубликованы, уровень соответствует источнику,
-- обязательное для публикации на месте.
do $guard$
declare
  bad text;
  cnt integer;
begin
  select count(*) into cnt from (
    select code from public.facts_catalog
      where code in ('withdrawal_shape','quit_vaping_is_task','lung_decline_slows')
        and published
    union all
    select code from public.myths_catalog where code = 'no_minute_timeline' and published
  ) t;
  if cnt <> 4 then
    raise exception 'Опубликовано % карточек из четырёх', cnt;
  end if;

  select string_agg(code, ', ') into bad from (
    select code from public.facts_catalog
      where code in ('withdrawal_shape','quit_vaping_is_task','lung_decline_slows')
        and (source_id is null or question_ru is null or btrim(question_ru) = ''
             or 'flow' = any(coalesce(surfaces, '{}')))
    union all
    select code from public.myths_catalog
      where code = 'no_minute_timeline'
        and (source_id is null or question_ru is null or btrim(question_ru) = ''
             or 'flow' = any(coalesce(surfaces, '{}')))
  ) t;
  if bad is not null then
    raise exception 'Публикуется карточка без источника, без вопроса или с flow: %', bad;
  end if;

  if exists (select 1 from public.facts_catalog
             where code = 'withdrawal_shape' and evidence_level <> 'A') then
    raise exception 'withdrawal_shape должен остаться уровня A: его источник — обзор';
  end if;
  if exists (select 1 from public.facts_catalog
             where code in ('quit_vaping_is_task','lung_decline_slows') and evidence_level <> 'B')
     or exists (select 1 from public.myths_catalog
                where code = 'no_minute_timeline' and evidence_level <> 'B') then
    raise exception 'Карточки на одиночном исследовании должны быть уровня B';
  end if;
end
$guard$;

commit;
