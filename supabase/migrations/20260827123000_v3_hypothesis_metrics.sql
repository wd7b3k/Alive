-- Витрина метрик гипотез.
--
-- `docs/HYPOTHESES_AND_METRICS.md` перечисляет десять гипотез и их метрики, но ни одной
-- формулы в репозитории не было: ни view, ни функции, ни скрипта. Через две недели
-- пилота решать GO / ITERATE / PIVOT / STOP было бы буквально не по чему — пришлось бы
-- писать SQL по памяти, на живых данных, в тот же вечер.
--
-- Функция возвращает по строке на метрику. У метрики есть значение, знаменатель (сколько
-- наблюдений за ним стоит) и признак `computable`. Признак — не украшение: часть метрик
-- из документа посчитать нельзя, потому что данные не собираются, и об этом честнее
-- сказать строкой в таблице, чем показать ноль. Ноль и «нечем считать» — разные ответы,
-- и на пилоте из пяти человек их особенно легко перепутать.
--
-- Идентификаторов пользователей функция не возвращает ни в одном поле — как и
-- `admin_product_health` (20260825120000), по той же причине: «посмотреть результат
-- эксперимента» не должно превращаться в «выгрузить, кто когда курил».

create or replace function public.admin_hypothesis_metrics(days integer default 14)
returns table (
  hypothesis text,
  metric text,
  value numeric,
  unit text,
  observations bigint,
  computable boolean,
  note text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  window_days integer := greatest(1, least(coalesce(days, 14), 365));
  since timestamptz := now() - make_interval(days => window_days);
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
$$;

revoke all on function public.admin_hypothesis_metrics(integer) from public, anon;
grant execute on function public.admin_hypothesis_metrics(integer) to authenticated;

comment on function public.admin_hypothesis_metrics(integer) is
  'Метрики гипотез H-ALIVE-001..010 за окно. Только агрегаты, ни одного идентификатора пользователя. Метрики, которые посчитать нечем, возвращаются с computable = false и объяснением.';
