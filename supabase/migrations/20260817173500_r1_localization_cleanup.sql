-- ALIVE R1 — качественная русская локализация пользовательского каталога.
-- Машинные code/category остаются техническими и не выводятся пользователю.

update public.replacements_catalog set
  title = 'Сенсорная перезагрузка',
  summary = 'Вернуть внимание из внутреннего напряжения в конкретные ощущения вокруг.'
where code = 'sensory_reset';

update public.replacements_catalog set
  title = 'Прочитать своё «Зачем»',
  instruction = 'Открой своё «Зачем» и прочитай одну формулировку, которая сегодня действительно откликается. Не убеждай себя — просто вспомни направление.',
  summary = 'Вернуться от короткого импульса к выбранной жизни.'
where code = 'meaning_card';

update public.replacements_catalog set
  title = 'Прочитать своё «Зачем»',
  instruction = 'Открой свои причины свободы от зависимости и прочитай их медленно как собственный выбор, а не лозунг.',
  summary = 'Вернуться к личной причине не идти за автоматическим импульсом.'
where code = 'meaning_read';

update public.replacements_catalog set
  title = 'Никотиновый спрей',
  summary = 'Никотин-заместительная терапия — помощь при отказе от курения, а не срыв.',
  icon = 'НЗТ'
where code = 'nrt_spray';

update public.replacements_catalog set
  title = 'Никотиновая жвачка',
  summary = 'Никотин-заместительная терапия — помощь при отказе от курения, а не срыв.',
  icon = 'НЗТ'
where code = 'nrt_gum';

update public.replacements_catalog set
  instruction = replace(instruction, 'ALIVE не будет предлагать фрукт', 'ALIVE не будет предлагать еду')
where code = 'fruit_portion' and instruction like '%ALIVE не будет предлагать фрукт%';

update public.methodology_versions set
  title = 'Метод ALIVE, версия 1',
  description = 'Экспериментальная поведенческая методология ALIVE, версия 1.'
where id = 'alive-method-v1';

update public.equivalence_models set
  title = 'Поведенческая шкала ALIVE, версия 1',
  description = 'Внутренняя нормализация поведения. Не является медицинским эквивалентом вреда или количества никотина.'
where id = 'alive-equivalence-v1';

update public.equivalence_weights set explanation = case
  when product_type='cigarette' then '1 сигарета = 1 условная единица ALIVE. Это поведенческая шкала, а не единица вреда.'
  when product_type='hookah' then '1 кальянная сессия = 10 условных единиц ALIVE — рабочая поведенческая эвристика, не сравнение вреда.'
  when product_type='vape' then '10 затяжек электронной сигареты = 1 условная единица ALIVE — рабочая поведенческая эвристика, не сравнение вреда или никотина.'
  else explanation end
where model_id='alive-equivalence-v1';
