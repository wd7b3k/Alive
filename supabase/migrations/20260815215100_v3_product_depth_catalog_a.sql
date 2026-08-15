-- ALIVE v3.0 rich catalog — triggers + contextual replacements (part A).

insert into public.triggers_catalog (code,title,description,product_types,published,sort_order)
values
  ('wake_up','После пробуждения','Начало дня и привычный утренний сценарий.',array['cigarette','vape']::text[],true,10),
  ('coffee','Кофе','Кофе или другой привычный напиток.',array['cigarette','vape']::text[],true,20),
  ('after_meal','После еды','Завершение еды.',array['cigarette','vape','hookah']::text[],true,30),
  ('phone','Телефон / скроллинг','Автоматизм рядом с телефоном и входящим потоком.',array['cigarette','vape']::text[],true,40),
  ('driving','За рулём','Автоматизм во время поездки.',array['cigarette','vape']::text[],true,50),
  ('thinking','Размышление','Никотин как сопровождение сложной или глубокой мысли.',array['cigarette','vape']::text[],true,60),
  ('thought_complete','Мысль закончена','Ритуал точки после размышления или решения.',array['cigarette','vape']::text[],true,70),
  ('task_start','Перед началом дела','Никотин как запуск или сборка перед задачей.',array['cigarette','vape']::text[],true,80),
  ('task_transition','Между задачами','Переход и микропауза между делами.',array['cigarette','vape']::text[],true,90),
  ('task_reward','После сделанного','Награда и фиксация результата.',array['cigarette','vape','hookah']::text[],true,100),
  ('important_decision','После важного решения','Ритуал после сильного внутреннего решения.',array['cigarette','vape']::text[],true,110),
  ('significant_action','После значимого действия','Награда и присвоение результата после важного шага.',array['cigarette','vape','hookah']::text[],true,120),
  ('after_sex','После близости','Переход после сильного телесного и эмоционального контакта.',array['cigarette','vape']::text[],true,130),
  ('anger','Злость','Сильное возбуждение, границы, конфликт.',array['cigarette','vape','hookah']::text[],true,140),
  ('irritability','Раздражительность','Фоновое раздражение и желание быстро сменить состояние.',array['cigarette','vape']::text[],true,150),
  ('anxiety','Тревога','Тревожное напряжение, неопределённость, ожидание.',array['cigarette','vape']::text[],true,160),
  ('uncertainty','Неопределённость','Зависание перед решением или следующим шагом.',array['cigarette','vape']::text[],true,170),
  ('before_sleep','Перед сном','Последний вечерний ритуал.',array['cigarette','vape']::text[],true,180),
  ('insomnia','Не спится','Бодрствование ночью и поиск способа изменить состояние.',array['cigarette','vape']::text[],true,190),
  ('spontaneous','Просто захотелось','Импульс без очевидного контекста — важный материал для наблюдения.',array['cigarette','vape','hookah']::text[],true,200),
  ('work_computer','Работа за компьютером','Фоновое непрерывное использование во время концентрации.',array['vape']::text[],true,210),
  ('social','Компания / общение','Социальный ритуал и принадлежность.',array['cigarette','vape','hookah']::text[],true,220),
  ('evening','Вечер / отдых','Переход к отдыху и награде.',array['cigarette','vape','hookah']::text[],true,230),
  ('boredom','Скука','Нужна стимуляция или заполнение пустого промежутка.',array['cigarette','vape','hookah']::text[],true,240),
  ('hookah_venue','Бар / кальянная','Контекст, где кальян является частью события и пространства.',array['hookah']::text[],true,250),
  ('other','Другое','Если подходящего варианта нет — это сигнал улучшать каталог.',array['cigarette','vape','hookah']::text[],true,999)
on conflict (code) do update set
  title=excluded.title,
  description=excluded.description,
  product_types=excluded.product_types,
  published=true,
  sort_order=excluded.sort_order;

insert into public.replacements_catalog
(code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety)
values
  ('wall_pushups','Отжимания от стены','Сделай спокойную серию отжиманий от стены, сохраняя шею нейтральной и продолжая дышать.','movement',array['release_tension','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,10,'↗','30–60 сек','Короткая работа грудью и корпусом, когда нужно быстро сменить состояние.','Не делай через боль, онемение, прострел или головокружение.'),
  ('scapular_retractions','Сведение лопаток','Сведи лопатки назад и немного вниз, задержи на 3–5 секунд, полностью отпусти.','movement',array['release_tension','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,20,'↔','30–60 сек','Мягко вернуть тело из застывшего рабочего или телефонного положения.','Шея остаётся нейтральной; не форсируй амплитуду.'),
  ('core_brace','Брейсинг корпуса','Создай умеренное круговое напряжение живота на 8–10 секунд и продолжай спокойно дышать. Повтори 4–5 раз.','movement',array['release_tension','self_presence','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,30,'◎','40–60 сек','Собрать внимание через умеренную работу центра тела.','Не задерживай дыхание и не напрягайся максимально.'),
  ('glute_bridge','Ягодичный мост','Сделай 10–20 контролируемых подъёмов таза, чувствуя ягодицы и не добирая высоту поясницей.','movement',array['release_tension','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,40,'⌁','1–2 мин','Перевести возбуждение в спокойную работу крупных мышц.','Не выполнять через боль в пояснице или колене.'),
  ('wall_press','Умеренная изометрия','Дави ладонями в стену или друг в друга примерно на 30–50% силы 8–10 секунд, затем полностью расслабься. Повтори 3 раза.','movement',array['release_tension']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,50,'⚡','30–60 сек','Дать телу безопасный выход при злости и сильном возбуждении.','Не задерживай дыхание. Это разрядка, а не силовой тест.'),
  ('walk','Короткая ходьба','Пройди несколько минут в естественном темпе. Мягко верни внимание в стопы, дыхание и пространство вокруг.','movement',array['release_tension','pause','switch','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,60,'→','2–5 мин','Сменить состояние движением и дать тяге пройти без немедленного ответа.','Не взаимодействуй с телефоном там, где это небезопасно.'),
  ('beautiful_view','Посмотреть вдаль','Подойди к окну или выйди туда, где есть обзор. Найди свет, горизонт, дерево, небо, архитектуру или движение и несколько минут просто смотри.','orienting',array['pause','self_presence','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,70,'◇','1–3 мин','Вернуть внимание из туннеля тяги в реальный мир вокруг.','Не использовать во время управления автомобилем.'),
  ('three_details','Три новые детали','Найди три детали, которые раньше не замечал: оттенок, отражение, фактуру, форму или звук. Просто замечай.','orienting',array['pause','self_presence','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,80,'···','60–90 сек','Собрать внимание на простых вещах вокруг.','Безопасный вариант почти в любом спокойном контексте.'),
  ('sensory_reset','Сенсорный reset','Назови 5 вещей, которые видишь, 3 звука, которые слышишь, почувствуй обе стопы и сделай один длинный спокойный выдох.','orienting',array['release_tension','pause','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,90,'◉','1–2 мин','Снизить фоновую раздражительность через ориентирование, а не борьбу.','Если внимание к телу усиливает тревогу — вернись к внешним объектам.'),
  ('water_pause','Стакан воды','Налей воду, выпей медленно несколькими глотками и только потом решай, что делать дальше.','ritual',array['pause','switch','closure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,100,'◌','30 сек','Простой телесный переход без нового обязательного ритуала.','Не превращай воду в обязательную замену каждой тяге.'),
  ('tea_ritual','Чай или мате','Завари напиток осознанно: запах, температура, вкус. Первые минуты не листай телефон.','ritual',array['pause','pleasure','closure','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,110,'☕','3–8 мин','Сохранить паузу и удовольствие, убрав из них табак.','Если конкретный напиток становится триггером — выбери другой вариант.'),
  ('herbal_evening','Вечерний фиточай','Выбери привычный вечерний фиточай, приглуши свет и выпей его без параллельного скроллинга.','ritual',array['closure','self_presence','pleasure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,120,'☾','5–10 мин','Перевести вечер из последнего никотинового ритуала в спокойное завершение дня.','Не используй стимулирующие напитки перед сном.'),
  ('mouth_reset','Освежить рот после еды','Встань из-за стола, прополощи рот или почисти зубы, затем перейди в другое пространство.','ritual',array['closure','switch']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,130,'○','1–2 мин','Поставить телесную точку после еды без никотина.','После кислой пищи лучше начать с воды или ополаскивания.'),
  ('favorite_song','Одна любимая песня','Включи одну любимую песню и дослушай её целиком. Пусть это будет отдельный короткий опыт.','music',array['pleasure','switch','release_tension','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,140,'♪','3–5 мин','Дать нервной системе полноценную эмоциональную смену через музыку.','За рулём запускай звук только безопасным способом и не взаимодействуй с экраном.'),
  ('calm_music','Спокойная музыка','Включи спокойный трек и несколько минут ничего не решай.','music',array['pause','self_presence','pleasure']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,150,'♫','3–8 мин','Снизить активацию вечером или при фоновом напряжении.','Если музыка усиливает возбуждение, выбери тишину или ориентирование.'),
  ('audiobook','Аудиокнига / лекция','Заранее запусти интересный фрагмент и продолжай дорогу без дополнительных действий с телефоном.','music',array['switch','pleasure','self_presence']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,160,'▷','5–20 мин','Заполнить монотонную дорогу содержанием вместо никотинового ритуала.','Только заранее включённый звук; не управляй приложением во время движения.'),
  ('urge_observe','Наблюдать волну тяги','Найди тягу в теле. Не пытайся убрать её. Наблюдай, как ощущения меняются сами, и ничего не решай до конца таймера.','observation',array['self_presence','pause','meaning']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,170,'◐','1–3 мин','Увидеть желание как состояние, а не как команду.','Если наблюдение резко усиливает тревогу, перейди к внешнему ориентированию или ходьбе.'),
  ('body_locate','Найти напряжение в теле','Спроси: «Где именно это сейчас в теле?» Найди 1–2 зоны и разреши ощущениям существовать без анализа причин.','observation',array['self_presence','release_tension']::text[],array['cigarette','hookah','vape']::text[],'{}'::jsonb,true,180,'◎','1–2 мин','Отделить эмоциональное состояние от автоматического ответа никотином.','Не форсируй дыхание и не используй задержки.')
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
