-- Редакторский проход по тону контентных каталогов, 27.08.2026.
--
-- Что делает: приводит тексты, которые человек читает в момент тяги и в разделах,
-- к правилам docs/TONE_OF_VOICE.md. Три группы правок:
--   1) родовая нейтральность — тексты обращались к человеку в мужском роде;
--   2) редакторский язык там, где нужен человеческий (описания контекстов, жаргон
--      в заголовках карточек замен);
--   3) четыре карточки замен без короткой подписи: в потоке на её месте
--      показывалась инструкция целиком.
--
-- Смысл, числа, оговорки, уровни доказательности и источники не меняются ни в одной
-- строке. Правки только формулировок.
--
-- Каждая правка применяется только при совпадении со старым значением: если прод
-- разошёлся с дампом от 27.08.2026, строка не трогается и попадает в NOTICE.
-- Таблица журнала хранит и старое, и новое значение — это и есть точка отката.

create table if not exists public.content_tone_pass_20260827 (
  table_name  text not null,
  key_column  text not null,
  row_key     text not null,
  column_name text not null,
  old_value   text,
  new_value   text not null,
  applied     boolean not null default false,
  primary key (table_name, row_key, column_name)
);

-- Журнал служебный: он не часть продукта и наружу не отдаётся. RLS включён,
-- политик нет ни одной — значит, ни anon, ни authenticated не читают его вовсе.
alter table public.content_tone_pass_20260827 enable row level security;
revoke all on public.content_tone_pass_20260827 from anon, authenticated;

comment on table public.content_tone_pass_20260827 is
  'Журнал редакторского прохода 27.08.2026: старое и новое значение каждой изменённой строки каталога. Точка отката.';

insert into public.content_tone_pass_20260827
  (table_name, key_column, row_key, column_name, old_value, new_value)
values
  ($q$needs_catalog$q$, $q$code$q$, $q$self_presence$q$, $q$title$q$, $q$Побыть с собой$q$, $q$Побыть с тем, что есть$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$after_meal$q$, $q$description$q$, $q$Завершение еды.$q$, $q$Еда закончилась — и дальше идёт привычная точка.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$after_task$q$, $q$description$q$, $q$Привычная награда или ритуал закрытия задачи.$q$, $q$Дело закрыто, и сигарета работает как награда.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$coffee$q$, $q$description$q$, $q$Кофе или другой привычный напиток.$q$, $q$Кофе или другой привычный напиток — и сигарета рядом с ним.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$phone$q$, $q$description$q$, $q$Автоматизм рядом с телефоном и входящим потоком.$q$, $q$Лента и сигарета включаются вместе.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$tension$q$, $q$description$q$, $q$Эмоциональное или когнитивное напряжение.$q$, $q$Внутри натянуто — и хочется быстро сбросить.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$wake_up$q$, $q$description$q$, $q$Начало дня и привычный утренний сценарий.$q$, $q$Первые минуты дня идут по привычному сценарию.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$other$q$, $q$description$q$, $q$Если подходящего варианта нет — это сигнал улучшать каталог.$q$, $q$Момента нет в списке — опиши его своими словами.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$task_reward$q$, $q$description$q$, $q$Награда и фиксация результата.$q$, $q$Есть результат — и он привычно закрывается никотином.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$after_sex$q$, $q$description$q$, $q$Переход после сильного телесного и эмоционального контакта.$q$, $q$Переход после близости, когда хочется поставить точку.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$anger$q$, $q$description$q$, $q$Сильное возбуждение, границы, конфликт.$q$, $q$Задетые границы, конфликт, сильная реакция.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$anxiety$q$, $q$description$q$, $q$Тревожное напряжение, неопределённость, ожидание.$q$, $q$Неопределённость и ожидание, которые нечем занять.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$before_sleep$q$, $q$description$q$, $q$Последний вечерний ритуал.$q$, $q$Последний ритуал перед тем, как лечь.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$boredom$q$, $q$description$q$, $q$Нужна стимуляция или заполнение пустого промежутка.$q$, $q$Пустой промежуток, который нечем заполнить.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$hookah_venue$q$, $q$description$q$, $q$Контекст, где кальян является частью события и пространства.$q$, $q$Место, где кальян — часть вечера и компании.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$important_decision$q$, $q$description$q$, $q$Ритуал после сильного внутреннего решения.$q$, $q$Ритуал после того, как решение принято.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$insomnia$q$, $q$description$q$, $q$Бодрствование ночью и поиск способа изменить состояние.$q$, $q$Ночь без сна и поиск, чем изменить состояние.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$irritability$q$, $q$description$q$, $q$Фоновое раздражение и желание быстро сменить состояние.$q$, $q$Фоновое раздражение, которое хочется быстро сбить.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$significant_action$q$, $q$description$q$, $q$Награда и присвоение результата после важного шага.$q$, $q$Важный шаг сделан — и его хочется присвоить.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$social$q$, $q$description$q$, $q$Социальный ритуал и принадлежность.$q$, $q$Общий выход как способ быть со всеми.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$spontaneous$q$, $q$description$q$, $q$Импульс без очевидного контекста — важный материал для наблюдения.$q$, $q$Импульс без ясной причины — тоже материал для наблюдения.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$task_start$q$, $q$description$q$, $q$Никотин как запуск или сборка перед задачей.$q$, $q$Сначала перекур, потом работа — никотин как запуск.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$task_transition$q$, $q$description$q$, $q$Переход и микропауза между делами.$q$, $q$Микропауза на переходе от одного дела к другому.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$thinking$q$, $q$description$q$, $q$Никотин как сопровождение сложной или глубокой мысли.$q$, $q$Никотин как сопровождение долгой мысли.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$thought_complete$q$, $q$description$q$, $q$Ритуал точки после размышления или решения.$q$, $q$Точка после того, как мысль додумана.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$uncertainty$q$, $q$description$q$, $q$Зависание перед решением или следующим шагом.$q$, $q$Зависание перед следующим шагом.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$work_computer$q$, $q$description$q$, $q$Фоновое непрерывное использование во время концентрации.$q$, $q$Фоновые затяжки, пока идёт работа.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$driving$q$, $q$description$q$, $q$Автоматизм во время поездки.$q$, $q$Дорога, в которой курение стало частью маршрута.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$evening$q$, $q$description$q$, $q$Переход к отдыху и награде.$q$, $q$Переход к отдыху и привычная награда за день.$q$),
  ($q$triggers_catalog$q$, $q$code$q$, $q$work_computer$q$, $q$recognition_prompt_ru$q$, $q$Ты действительно решил использовать электронку или рука потянулась к ней сама?$q$, $q$Это твоё решение — или рука потянулась сама?$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$carrot_crunch$q$, $q$instruction$q$, $q$Если хочется именно пожевать и ты голоден, возьми небольшую порцию моркови.$q$, $q$Если хочется именно пожевать, а рядом голод, возьми небольшую порцию моркови.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$apple_crunch$q$, $q$instruction$q$, $q$Если ты действительно голоден, съешь небольшое яблоко и не торопись.$q$, $q$Если это правда голод, съешь небольшое яблоко и не торопись.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$berries_portion$q$, $q$instruction$q$, $q$Если ты голоден, выбери небольшую порцию ягод и ешь без телефона.$q$, $q$Если это голод, выбери небольшую порцию ягод и ешь без телефона.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$nuts_small$q$, $q$instruction$q$, $q$Если голоден, возьми небольшую заранее отмеренную порцию орехов и убери упаковку.$q$, $q$Если это голод, возьми небольшую заранее отмеренную порцию орехов и убери упаковку.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$savor_result$q$, $q$instruction$q$, $q$Назови конкретно, что ты сделал. Позволь удовлетворению быть заметным: результат уже существует.$q$, $q$Назови вслух, что именно сделано. Дай себе почувствовать результат — он уже есть.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$three_details$q$, $q$instruction$q$, $q$Найди три детали, которые раньше не замечал: оттенок, отражение, фактуру, форму или звук. Просто замечай.$q$, $q$Найди три детали, мимо которых обычно проходишь: оттенок, отражение, фактуру, форму или звук. Просто замечай.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$one_line_conclusion$q$, $q$instruction$q$, $q$Запиши: «Я понял / решил: …». Одной строки достаточно. Закрой заметку и перейди дальше.$q$, $q$Запиши: «Вывод: …». Одной строки достаточно. Закрой заметку и перейди дальше.$q$),
  ($q$facts_catalog$q$, $q$code$q$, $q$quit_before_40$q$, $q$changes_ru$q$, $q$Точка отсчёта — сегодняшний день, а не возраст, когда ты начал.$q$, $q$Точка отсчёта — сегодняшний день, а не возраст, в котором всё началось.$q$),
  ($q$facts_catalog$q$, $q$code$q$, $q$oral_health$q$, $q$changes_ru$q$, $q$Часть изменений ты заметишь сам: дёсны, вкус, запах.$q$, $q$Часть изменений заметна без анализов: дёсны, вкус, запах.$q$),
  ($q$myths_catalog$q$, $q$code$q$, $q$nrt_same_as_smoking$q$, $q$changes_ru$q$, $q$Если ты откладывал НЗТ из-за этого убеждения — это разговор с врачом или фармацевтом.$q$, $q$Если из-за этого убеждения НЗТ откладывалась — это разговор с врачом или фармацевтом.$q$),
  ($q$myths_catalog$q$, $q$code$q$, $q$lapse_resets_all$q$, $q$title$q$, $q$Если закурил — всё пропало$q$, $q$Одна сигарета — и всё пропало$q$),
  ($q$goals_catalog$q$, $q$code$q$, $q$money_back$q$, $q$body_ru$q$, $q$Я хочу оставлять деньги на жизнь, впечатления и вещи, которые выбираю сам.$q$, $q$Я хочу оставлять деньги на жизнь, впечатления и вещи, которые выбираю я.$q$),
  ($q$goals_catalog$q$, $q$code$q$, $q$self_respect$q$, $q$body_ru$q$, $q$Я хочу снова доверять себе: если я решил менять жизнь, мои действия постепенно начинают соответствовать этому решению.$q$, $q$Я хочу снова доверять себе: если решение менять жизнь принято, действия постепенно начинают ему соответствовать.$q$),
  ($q$goals_catalog$q$, $q$code$q$, $q$breathing_body$q$, $q$reflection_prompt_ru$q$, $q$Какое ощущение в теле ты хотел бы вернуть или усилить?$q$, $q$Какое ощущение в теле хочется вернуть или усилить?$q$),
  ($q$goals_catalog$q$, $q$code$q$, $q$morning_free$q$, $q$reflection_prompt_ru$q$, $q$Что ты хотел бы поставить первым действием своего утра?$q$, $q$Что хочется поставить первым действием утра?$q$),
  ($q$awareness_content$q$, $q$code$q$, $q$myth_nrt_relapse$q$, $q$title_ru$q$, $q$«Никотин-заместительная терапия означает, что я сорвался»$q$, $q$«Никотин-заместительная терапия — это уже срыв»$q$),
  ($q$awareness_content$q$, $q$code$q$, $q$myth_nrt_relapse$q$, $q$motivation_ru$q$, $q$Не обесценивай отказ от сигареты только потому, что воспользовался инструментом, который создан именно для помощи в отказе.$q$, $q$Отказ от сигареты не обесценивается тем, что в ход пошёл инструмент, созданный именно для помощи в отказе.$q$),
  ($q$awareness_content$q$, $q$code$q$, $q$myth_vape_harmless$q$, $q$motivation_ru$q$, $q$Цель Habitoff — не заставить тебя бояться устройства. Цель — чтобы ты видел реальную зависимость и мог выбирать, сколько места никотин вообще занимает в твоём дне.$q$, $q$Habitoff не пугает устройством. Задача другая: чтобы реальная зависимость была видна, а место никотина в твоём дне оставалось твоим решением.$q$),
  ($q$awareness_content$q$, $q$code$q$, $q$myth_dual_use$q$, $q$title_ru$q$, $q$«Если я в основном перешёл на вейп, несколько сигарет уже не важны»$q$, $q$«Раз основное теперь вейп, несколько сигарет уже не важны»$q$),
  ($q$meanings_catalog$q$, $q$title$q$, $q$Достоинство$q$, $q$body$q$, $q$Я хочу уважать не идеальный образ себя, а то, как живу обычный день и какие решения способен удерживать.$q$, $q$Я хочу уважать не идеальный образ себя, а то, как живу обычный день и какие решения удаётся удерживать.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$wall_press$q$, $q$title$q$, $q$Умеренная изометрия$q$, $q$Давление в стену$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$core_brace$q$, $q$title$q$, $q$Брейсинг корпуса$q$, $q$Напрячь живот на 10 секунд$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$glute_bridge$q$, $q$title$q$, $q$Ягодичный мост$q$, $q$Мостик лёжа$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$sensory_reset$q$, $q$title$q$, $q$Сенсорная перезагрузка$q$, $q$Вернуться в комнату$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$wall_press$q$, $q$summary$q$, $q$Дать телу безопасный выход при злости и сильном возбуждении.$q$, $q$Дать злости выход через мышцы, а не через дым.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$core_brace$q$, $q$summary$q$, $q$Собрать внимание через умеренную работу центра тела.$q$, $q$Собрать внимание коротким напряжением корпуса.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$glute_bridge$q$, $q$summary$q$, $q$Перевести возбуждение в спокойную работу крупных мышц.$q$, $q$Перевести возбуждение в спокойную работу мышц.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$protein_drink$q$, $q$summary$q$, null, $q$Плотный напиток, когда тяга совпала с голодом$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$tea_pause$q$, $q$summary$q$, null, $q$Та же пауза, но её держит чай, а не дым$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$long_exhale$q$, $q$summary$q$, null, $q$Замедлить дыхание, когда внутри разгон$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$kefir$q$, $q$summary$q$, null, $q$Простой перекус, если тяга совпала с голодом$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$water_gum_drive$q$, $q$instruction$q$, $q$Вода и жвачка должны быть подготовлены до поездки. Во время тяги не открывай приложение.$q$, $q$Вода и жвачка должны быть под рукой до поездки. За рулём приложение не открывай — разбор подождёт до остановки.$q$),
  ($q$replacements_catalog$q$, $q$code$q$, $q$sensory_reset$q$, $q$short_action_ru$q$, $q$Снизить фоновую раздражительность через ориентирование, а не борьбу.$q$, $q$Вернуть внимание в то, что вокруг, вместо борьбы с тягой.$q$)
on conflict (table_name, row_key, column_name) do nothing;

do $do$
declare
  r         record;
  changed   int;
  applied_n int := 0;
  pending   int;
  skipped   text[] := '{}';
begin
  select count(*) into pending from public.content_tone_pass_20260827 t where not t.applied;

  for r in select * from public.content_tone_pass_20260827 t where not t.applied loop
    execute format(
      'update public.%I set %I = $1 where %I = $2 and %I is not distinct from $3',
      r.table_name, r.column_name, r.key_column, r.column_name
    ) using r.new_value, r.row_key, r.old_value;

    get diagnostics changed = row_count;

    if changed > 0 then
      applied_n := applied_n + changed;
      update public.content_tone_pass_20260827 t
         set applied = true
       where t.table_name = r.table_name
         and t.row_key = r.row_key
         and t.column_name = r.column_name;
    else
      skipped := skipped || format('%s.%s.%s', r.table_name, r.row_key, r.column_name);
    end if;
  end loop;

  raise notice 'Редакторский проход: применено % правок, пропущено %', applied_n, coalesce(array_length(skipped, 1), 0);

  if array_length(skipped, 1) is not null then
    raise notice 'Пропущены (значение в базе разошлось с дампом): %', array_to_string(skipped, ', ');
  end if;

  if pending > 0 and applied_n = 0 then
    raise exception 'Редакторский проход не изменил ни одной строки — каталоги разошлись с дампом от 27.08.2026, проверьте вручную';
  end if;
end
$do$;
