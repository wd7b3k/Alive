-- Латиница из текстов, которые читает человек, 27.08.2026.
--
-- Правило «продукт говорит по-русски» существовало с редакторского прохода 24.08
-- (20260824130000), но его guard закрывал только facts_catalog и myths_catalog. Поле
-- `evidence_scope` — «Границы» под карточкой факта, мифа и замены — осталось снаружи, и
-- в нём английский язык дожил до прода: «Population cardiovascular risk», «Cue-restructuring
-- эвристика Habitoff», «эффективность проверяется по личным outcomes». Всего 63 строки в
-- 29 разных формулировках.
--
-- Заодно вычищены две вещи, попавшие в тексты из прошлого проекта и из служебного словаря:
-- «адаптированная из HumanOS» (продукт называется Habitoff) и NRT вместо НЗТ.
--
-- Смысл оговорок не меняется: где было «не индивидуальный прогноз», там и осталось.
-- Уровни доказательности, числа и источники не трогаются вовсе.

do $do$
declare
  r        record;
  changed  int;
  applied  int := 0;
  skipped  text[] := '{}';
  -- Слова, которым латиница разрешена: имя продукта, аббревиатуры организаций и журналов,
  -- маркировка пачек и N как «сколько-то» в формуле «один кальян = N сигарет».
  allowed  constant text := '(Habitoff|ALIVE|CDC|JAMA|NEJM|BMJ|WHO|light|low-tar|Freedom Fund|N)';
  offenders text;
begin
  for r in
    select * from (values
  ($q$Cue-restructuring эвристика Habitoff$q$, $q$Эвристика Habitoff: перестройка привычного сигнала$q$),
  ($q$Self-regulation эвристика Habitoff, адаптированная из HumanOS$q$, $q$Эвристика Habitoff для саморегуляции$q$),
  ($q$Короткая self-regulation эвристика Habitoff, адаптированная из HumanOS$q$, $q$Короткая эвристика Habitoff для саморегуляции$q$),
  ($q$Self-regulation эвристика Habitoff$q$, $q$Эвристика Habitoff для саморегуляции$q$),
  ($q$Attention-reset эвристика Habitoff, адаптированная из HumanOS$q$, $q$Эвристика Habitoff: возврат внимания$q$),
  ($q$Acute activity может снижать craving; конкретная дозировка Habitoff экспериментальна$q$, $q$Короткая физическая нагрузка может снижать тягу; конкретная дозировка в Habitoff экспериментальна$q$),
  ($q$Поведенческая эвристика Habitoff; эффективность проверяется по личным outcomes$q$, $q$Поведенческая эвристика Habitoff; эффективность проверяется по твоим собственным результатам$q$),
  ($q$Evidence относится к состоянию/arousal, а не к гарантии прекращения курения$q$, $q$Исследования говорят о состоянии и возбуждении нервной системы, а не о гарантии бросить$q$),
  ($q$Есть smoking-specific evidence для кратковременного уменьшения craving$q$, $q$Есть исследования именно про курение: кратковременное снижение тяги$q$),
  ($q$Поддержка состояния/arousal; long-term smoking cessation outcome не установлен$q$, $q$Помогает состоянию здесь и сейчас; долгосрочный эффект для отказа от курения не установлен$q$),
  ($q$Habitoff behavioural hypothesis$q$, $q$Поведенческая гипотеза Habitoff$q$),
  ($q$EMA antecedent evidence; конкретная Habitoff замена экспериментальна$q$, $q$Дневниковые исследования о предвестниках срыва; конкретная замена в Habitoff экспериментальна$q$),
  ($q$Behavioural decomposition hypothesis$q$, $q$Гипотеза о разборе привычки на составляющие$q$),
  ($q$Withdrawal mechanism + mental-health cessation evidence$q$, $q$Механизм отмены и исследования психического состояния после отказа$q$),
  ($q$Cue-restructuring Habitoff hypothesis$q$, $q$Гипотеза Habitoff о перестройке привычного сигнала$q$),
  ($q$Identity reframe + factual health support$q$, $q$Переосмысление образа себя и фактические данные о здоровье$q$),
  ($q$Environmental/social cue evidence$q$, $q$Исследования о сигналах среды и социальном контексте$q$),
  ($q$Authoritative public-health evidence$q$, $q$Позиция авторитетных организаций общественного здоровья$q$),
  ($q$Population cardiovascular risk; не индивидуальный прогноз$q$, $q$Сердечно-сосудистый риск по популяции; не индивидуальный прогноз$q$),
  ($q$Authoritative tobacco-harm evidence$q$, $q$Авторитетные данные о вреде табака$q$),
  ($q$Cessation medication safety$q$, $q$Безопасность препаратов для отказа от курения$q$),
  ($q$Cessation vs harm distinction$q$, $q$Разграничение отказа от курения и снижения вреда$q$),
  ($q$Population weight-change evidence$q$, $q$Данные об изменении веса по популяции$q$),
  ($q$Population mortality/cessation benefit; не индивидуальный прогноз$q$, $q$Смертность и выигрыш от отказа по популяции; не индивидуальный прогноз$q$),
  ($q$Relapse-prevention guidance$q$, $q$Рекомендации по профилактике возврата к курению$q$),
  ($q$Prospective expectancy evidence + withdrawal support$q$, $q$Проспективные исследования ожиданий и поддержка в период отмены$q$),
  ($q$Outcome expectancy evidence; Myth Engine remains experimental$q$, $q$Исследования ожидаемого эффекта; разбор мифов в Habitoff остаётся экспериментальным$q$),
  ($q$Systematic review evidence$q$, $q$Данные систематического обзора$q$),
  ($q$Withdrawal/concentration mechanism$q$, $q$Механизм отмены и концентрации$q$)
    ) as t(old_value, new_value)
  loop
    -- На чистой базе сиды несут ещё старое имя продукта («эвристика ALIVE»), в проде
    -- оно уже заменено. Сверяем по нормализованному значению, чтобы миграция вела себя
    -- одинаково и в CI, и на боевой базе.
    update public.replacements_catalog set evidence_scope = r.new_value
     where replace(evidence_scope, 'ALIVE', 'Habitoff') = r.old_value;
    get diagnostics changed = row_count;
    applied := applied + changed;

    update public.myths_catalog set evidence_scope = r.new_value
     where replace(evidence_scope, 'ALIVE', 'Habitoff') = r.old_value;
    get diagnostics changed = row_count;
    applied := applied + changed;

    -- facts_catalog колонки evidence_scope не имеет: границы там живут в full_text.
  end loop;

  raise notice 'Латиница: переписано границ — %', applied;

  for r in
    select * from (values
  ($q$replacements_catalog$q$, $q$short_action_ru$q$, $q$NRT — помощь при отказе от курения, а не срыв.$q$, $q$НЗТ — помощь при отказе от курения, а не срыв.$q$),
  ($q$replacements_catalog$q$, $q$instruction$q$, $q$Используй согласно инструкции своего препарата. Habitoff не назначает дозировку и не считает NRT курением.$q$, $q$Используй согласно инструкции своего препарата. Habitoff не назначает дозировку и не считает НЗТ курением.$q$)
    ) as t(tbl, col, old_value, new_value)
  loop
    execute format('update public.%I set %I = $1 where %I = $2', r.tbl, r.col, r.col)
      using r.new_value, r.old_value;
    get diagnostics changed = row_count;
    if changed = 0 then
      skipped := skipped || format('%s.%s', r.tbl, r.col);
    end if;
  end loop;

  if array_length(skipped, 1) is not null then
    raise notice 'Латиница: не совпали со значением в базе — %', array_to_string(skipped, ', ');
  end if;

  -- Guard. Проверяются только те колонки, которые видит человек: служебные коды
  -- (`mechanism`, `category`) остаются машинными ключами, их русские подписи живут в
  -- интерфейсе, а не в базе.
  for r in
    select * from (values
      ('triggers_catalog','title'),('triggers_catalog','description'),('triggers_catalog','recognition_prompt_ru'),
      ('needs_catalog','title'),('needs_catalog','description'),
      ('replacements_catalog','title'),('replacements_catalog','summary'),('replacements_catalog','instruction'),
      ('replacements_catalog','evidence_scope'),('replacements_catalog','safety'),
      -- benefit у фактов — булев флаг, а не текст, поэтому в списке его нет.
      ('facts_catalog','title'),('facts_catalog','short_text'),('facts_catalog','full_text'),
      ('facts_catalog','changes_ru'),
      ('myths_catalog','title'),('myths_catalog','short_reframe'),('myths_catalog','explanation'),
      ('myths_catalog','changes_ru'),('myths_catalog','evidence_scope'),
      ('goals_catalog','title_ru'),('goals_catalog','body_ru'),('goals_catalog','reflection_prompt_ru'),
      ('meanings_catalog','title'),('meanings_catalog','body'),
      ('awareness_content','title_ru'),('awareness_content','hook_ru'),('awareness_content','explanation_ru'),
      ('awareness_content','motivation_ru'),('awareness_content','caveat_ru'),
      ('evidence_claims','claim_ru'),('evidence_claims','population_ru'),('evidence_claims','limitations_ru'),
      ('supports_catalog','body'),
      ('rewards_catalog','title'),('rewards_catalog','description'),
      ('identity_scripts_catalog','title'),('identity_scripts_catalog','old_pattern'),('identity_scripts_catalog','new_choice')
    ) as t(tbl, col)
  loop
    execute format(
      'select string_agg(left(%I, 60), E''\n  '') from public.%I where regexp_replace(%I, $1, '''', ''gi'') ~ ''[A-Za-z]''',
      r.col, r.tbl, r.col
    ) using allowed into offenders;

    if offenders is not null then
      raise exception 'Латиница осталась в %.%:%  %', r.tbl, r.col, E'\n  ', offenders;
    end if;
  end loop;

  raise notice 'Латиница: guard пройден по всем видимым человеку колонкам';
end
$do$;
