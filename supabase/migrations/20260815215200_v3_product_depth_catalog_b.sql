-- ALIVE v3.0 rich contextual replacements (part B).

insert into public.replacements_catalog
(code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety)
values
  ('empty_pause','Ничего не заполнять','Поставь 90 секунд. Не читай, не листай телефон, не решай задачу. Просто смотри вокруг.','observation',array['pause','self_presence','meaning']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,190,'—','90 сек','Потренировать способность быть в паузе без обязательного действия.','Не использовать в ситуациях, где требуется активное внимание к безопасности.'),
  ('one_line_question','Одна строка: вопрос','Запиши одним предложением: «Что именно я сейчас пытаюсь понять?» Сделай короткую паузу и вернись к вопросу.','journal',array['self_presence','closure','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,200,'?','30–60 сек','Сохранить пространство для размышления без сигареты.','Не превращай запись в длинный анализ в момент сильной тяги.'),
  ('one_line_conclusion','Одна строка: вывод','Запиши: «Я понял / решил: …». Одной строки достаточно. Закрой заметку и перейди дальше.','journal',array['closure','meaning']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,210,'✓','30–60 сек','Поставить точку после мысли или решения.','Цель — завершение, а не идеальная формулировка.'),
  ('boundary_note','Что требует границы?','После первичной разрядки запиши: «Что именно нарушено?» и «Что я сделаю с причиной злости?»','journal',array['release_tension','closure','meaning']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,220,'△','1–3 мин','Перевести злость из импульса в действие по существу.','Не отправляй сообщения на пике возбуждения.'),
  ('next_step','Один следующий шаг','Сформулируй один физически выполнимый шаг на несколько минут и начни его сразу после записи.','journal',array['switch','closure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,230,'→','30–90 сек','Разорвать зависание и перейти к действию без никотинового запуска.','Не составляй большой план; нужен только один шаг.'),
  ('meaning_card','Прочитать одну опору','Открой «Смысл» и прочитай одну карточку, которая сегодня действительно откликается. Не убеждай себя — просто вспомни направление.','meaning',array['meaning','self_presence','closure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,240,'∞','20–40 сек','Вернуться от короткого импульса к выбранной жизни.','Если формулировка раздражает, не спорь с собой: выбери другую замену.'),
  ('future_resource','Вернуть ресурс в жизнь','Спроси: «Куда я хочу направить эти внимание, деньги, время или энергию сегодня?» Назови один реальный объект.','meaning',array['meaning','closure','pleasure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,250,'↟','30–60 сек','Связать неиспользованный никотиновый ритуал с тем, что получает его ресурс.','Не превращай это в требование немедленно быть продуктивным.'),
  ('stay_close','Остаться рядом','Если рядом близкий человек — останься рядом, прикоснись, поговори или побудь в тишине.','contact',array['connection','pleasure','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,260,'♡','3–10 мин','Сохранить близость после сильного контакта без перехода в следующий стимул.','Только если контакт взаимно желанен и комфортен.'),
  ('message_person','Написать своему человеку','Напиши короткое настоящее сообщение человеку, с которым тебе важна связь, о том, чем действительно хочется поделиться.','contact',array['connection','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,270,'↗','1–3 мин','Получить реальный контакт вместо социальной функции перекура.','Не превращай это в компульсивный поиск подтверждения. Одного сообщения достаточно.'),
  ('savor_conversation','Оставить разговор внутри','После звонка или встречи остановись и отметь: что в этом контакте было живым, приятным или важным?','contact',array['connection','closure','pleasure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,280,'♡','30–90 сек','Не закрывать хороший разговор никотином или новым стимулом.','Если разговор был конфликтным, лучше выбрать движение или запись границы.'),
  ('savor_result','Присвоить результат','Назови конкретно, что ты сделал. Позволь удовлетворению быть заметным: результат уже существует.','reward',array['pleasure','closure','meaning']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,290,'✦','1–2 мин','Получить награду непосредственно от сделанного, а не через никотин.','Не превращай это в самооценку «достаточно ли хорошо».'),
  ('five_min_rest','Пять минут без задачи','Поставь 5 минут и сознательно ничего полезного не делай.','reward',array['pause','pleasure','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,300,'◌','5 мин','Вернуть себе право на паузу без никотина и без обязанности быть продуктивным.','Не превращай паузу в бесконечный скроллинг.'),
  ('warm_shower','Тёплый душ','Прими тёплый душ как отдельный переход. Обрати внимание на температуру воды и расслабление тела.','reward',array['closure','pleasure','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,310,'≈','5–10 мин','Телесно завершить день или сильное событие без никотина.','Избегай слишком горячей воды при плохом самочувствии или головокружении.'),
  ('water_gum_drive','Вода / жвачка в дороге','Вода и жвачка должны быть подготовлены до поездки. Во время тяги не открывай приложение.','ritual',array['switch','pause']::text[],array['cigarette','vape']::text[],'{}'::jsonb,true,320,'🚗','сразу','Безопасно занять привычный ритуальный канал во время движения.','Используй только так, чтобы это не отвлекало от управления автомобилем.'),
  ('safe_stop','Безопасная остановка','Остановись только в разрешённом безопасном месте, припаркуйся, выйди, немного пройдись и продолжи маршрут.','movement',array['release_tension','pause','switch']::text[],array['cigarette','vape']::text[],'{}'::jsonb,true,330,'⏸','3–7 мин','Сохранить саму паузу в дороге, но убрать из неё перекур.','Сначала полностью остановить и припарковать автомобиль.'),
  ('dim_light_pause','Приглушить свет','Встань ненадолго, оставь приглушённый свет, не бери яркий экран, сделай что-то спокойное и вернись в постель.','rest',array['self_presence','pause']::text[],array['cigarette','vape']::text[],'{}'::jsonb,true,340,'☾','3–5 мин','Не превращать бессонницу в повод для никотиновой стимуляции.','Если бессонница становится регулярной и выраженной, её стоит рассматривать отдельно.'),
  ('calm_reading','Несколько спокойных страниц','Прочитай несколько спокойных страниц. Остановись, как только появится сонливость.','rest',array['self_presence','pause']::text[],array['cigarette','vape']::text[],'{}'::jsonb,true,350,'▤','5–10 мин','Дать бессоннице нейтральное занятие без никотиновой стимуляции.','Не выбирай возбуждающий контент или рабочие материалы.')
on conflict (code) do update set
  title=excluded.title,
  instruction=excluded.instruction,
  category=excluded.category,
  need_codes=excluded.need_codes,
  product_types=excluded.product_types,
  published=true,
  sort_order=excluded.sort_order,
  icon=excluded.icon,
  duration=excluded.duration,
  summary=excluded.summary,
  safety=excluded.safety;

-- v3-specific additions kept separate from legacy parity.
update public.replacements_catalog set
  icon='↗', duration='2–5 мин', summary='Сменить состояние движением и вернуть внимание в тело.'
where code='short_walk';

update public.replacements_catalog set
  icon='◌', duration='30–60 сек', summary='Простой напиток как короткая пауза, а не новый автоматизм.'
where code='water';

update public.replacements_catalog set
  icon='🍎', duration='2–5 мин', summary='Пищевой вариант с дневным лимитом предложений, чтобы не превращать тягу в заедание.'
where code='fruit_portion';

update public.replacements_catalog set
  icon='N', duration='по инструкции', summary='NRT — помощь при отказе от курения, а не срыв.'
where code in ('nrt_spray','nrt_gum');

update public.replacements_catalog set
  icon='↗', duration='10 мин', summary='Для вейпа: физически увеличить дистанцию до устройства и создать интервал.'
where code='vape_out_of_reach';
