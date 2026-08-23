-- Content for «Факты и Мифы»: 18 new sources, 6 facts, 9 myths.
--
-- Read this as content, not as schema. Every claim below is a statement ALIVE makes to
-- a person about their own health, and the rules it was written under are these:
--
-- 1. Nothing is asserted without a source that was actually opened. Every URL here was
--    fetched on 2026-08-23 and confirmed to be the document claimed. Where a source
--    could not be opened, the claim it would have supported is NOT in this file.
-- 2. Where the popular version of a fact is better known than the evidence for it, the
--    popular version loses. Three things people expect to see here are deliberately
--    absent, and their absence is the point:
--
--    * «Тяга длится 3–5 минут». No traceable study. The NCI and Smokefree.gov pages
--      that discuss cravings conspicuously give no number, and provoked craving in
--      laboratory work can persist well past a few minutes. Telling someone to wait
--      five minutes sets them up to conclude the method failed when minute six arrives.
--      The card says what is actually documented: urges come in waves and weaken over
--      weeks.
--    * «Вейп на 95% безопаснее». A 2015 expert-panel estimate, not a measurement. The
--      2022 OHID review pointedly does not restate it as a number.
--    * «Один кальян = N сигарет». No head-to-head study exists. Per session a waterpipe
--      delivers more smoke, more CO and more nicotine — that is measured and is what
--      the card says. A lifetime-harm ratio is not.
-- 3. Where the evidence is weaker than the conclusion sounds, scope_note_ru says so.
--    That field is required by the schema for this reason.
-- 4. P4 applies: nothing here shames anybody. A myth card corrects a belief, never the
--    person holding it, and «что это меняет для тебя» is a next step rather than a
--    verdict.

-- Explicit transaction. The schema migration enforces "a published card claiming
-- evidence must cite a source" with a DEFERRABLE INITIALLY DEFERRED constraint trigger,
-- which only defers to the end of a transaction. Run statement-by-statement under
-- psql's autocommit, the cards would be committed before their citations exist and the
-- trigger would correctly reject them. Wrapping the whole file is not a workaround for
-- the rule — it is the rule working: a card and its sources land together or not at all.
begin;

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------
-- Added to the same evidence_sources table the replacements use, so a document cited
-- by both a replacement and a myth is one row, not two.
insert into public.evidence_sources
  (code, title, url, publisher, kind, year, verified_on, sort_order) values
  ('bmj_tar_yields_2004',
   'Cigarette tar yields in relation to mortality from lung cancer in the cancer prevention study II prospective cohort, 1982-8',
   'https://www.bmj.com/content/328/7431/72', 'BMJ', 'study', 2004, date '2026-08-23', 100),
  ('cochrane_reduction_vs_abrupt_2019',
   'Smoking reduction interventions for smoking cessation (Cochrane Review CD013183)',
   'https://www.cochrane.org/evidence/CD013183_can-people-stop-smoking-cutting-down-amount-they-smoke-first',
   'Cochrane', 'review', 2019, date '2026-08-23', 110),
  ('bmj_mental_health_after_cessation_2014',
   'Change in mental health after smoking cessation: systematic review and meta-analysis',
   'https://www.bmj.com/content/348/bmj.g1151', 'BMJ', 'review', 2014, date '2026-08-23', 120),
  ('nhs_smoking_stress_mental_health',
   'The truth about smoking, stress and mental health',
   'https://www.nhs.uk/better-health/quit-smoking/why-quit-smoking/the-truth-about-smoking-stress-and-mental-health/',
   'NHS Better Health', 'guideline', 2026, date '2026-08-23', 130),
  ('cochrane_ecigarettes_2025',
   'Electronic cigarettes for smoking cessation (Cochrane Review CD010216, 11-е обновление)',
   'https://www.cochrane.org/evidence/CD010216_can-electronic-cigarettes-help-people-stop-smoking-and-do-they-have-any-unwanted-effects',
   'Cochrane', 'review', 2025, date '2026-08-23', 140),
  ('ohid_nicotine_vaping_england_2022',
   'Nicotine vaping in England: an evidence update including health risks and perceptions, 2022',
   'https://assets.publishing.service.gov.uk/media/633469fc8fa8f5066d28e1a2/Nicotine-vaping-in-England-2022-report.pdf',
   'Office for Health Improvement and Disparities', 'review', 2022, date '2026-08-23', 150),
  ('cdc_hookahs',
   'Hookahs — Smoking and Tobacco Use',
   'https://www.cdc.gov/tobacco/other-tobacco-products/hookahs.html',
   'Centers for Disease Control and Prevention', 'guideline', 2024, date '2026-08-23', 160),
  ('waterpipe_meta_2025',
   'The waterpipe smoking and human health: a systematic review and meta-analysis of 191 observational studies',
   'https://link.springer.com/article/10.1186/s13643-025-02799-y',
   'Systematic Reviews', 'review', 2025, date '2026-08-23', 170),
  ('doll_british_doctors_2004',
   'Mortality in relation to smoking: 50 years'' observations on male British doctors',
   'https://www.bmj.com/content/328/7455/1519', 'BMJ', 'study', 2004, date '2026-08-23', 180),
  ('surgeon_general_cessation_2020',
   'Smoking Cessation: A Report of the Surgeon General',
   'https://www.hhs.gov/sites/default/files/2020-cessation-sgr-full-report.pdf',
   'U.S. Department of Health and Human Services', 'guideline', 2020, date '2026-08-23', 190),
  ('fda_nrt_labeling_2013',
   'Modifications To Labeling of Nicotine Replacement Therapy Products for Over-the-Counter Human Use',
   'https://www.federalregister.gov/documents/2013/04/02/2013-07528/modifications-to-labeling-of-nicotine-replacement-therapy-products-for-over-the-counter-human-use',
   'U.S. Food and Drug Administration', 'guideline', 2013, date '2026-08-23', 200),
  ('cochrane_nrt_2018',
   'Nicotine replacement therapy versus control for smoking cessation (Cochrane Review CD000146)',
   'https://www.cochrane.org/about-us/news/featured-review-nicotine-replacement-therapy-versus-control-smoking-cessation',
   'Cochrane', 'review', 2018, date '2026-08-23', 210),
  ('bmj_weight_gain_2012',
   'Weight gain in smokers after quitting cigarettes: meta-analysis',
   'https://www.bmj.com/content/345/bmj.e4439', 'BMJ', 'review', 2012, date '2026-08-23', 220),
  ('cochrane_combined_support_2016',
   'Combined pharmacotherapy and behavioural interventions for smoking cessation (Cochrane Review CD008286)',
   'https://www.cochrane.org/evidence/CD008286_combined-pharmacotherapy-and-behavioural-interventions-smoking-cessation',
   'Cochrane', 'review', 2016, date '2026-08-23', 230),
  ('mmwr_adult_cessation_2024',
   'Adult Smoking Cessation — United States, 2022',
   'https://www.cdc.gov/mmwr/volumes/73/wr/mm7329a1.htm',
   'MMWR / Centers for Disease Control and Prevention', 'study', 2024, date '2026-08-23', 240),
  ('ussher_urge_52_weeks_2013',
   'Urge to smoke over 52 weeks of abstinence',
   'https://link.springer.com/article/10.1007/s00213-012-2886-7',
   'Psychopharmacology', 'study', 2013, date '2026-08-23', 250),
  ('hughes_withdrawal_time_course_2007',
   'Effects of Abstinence From Tobacco: Valid Symptoms and Time Course',
   'https://academic.oup.com/ntr/article/9/3/315/1100099',
   'Nicotine & Tobacco Research', 'review', 2007, date '2026-08-23', 260),
  ('who_cessation_benefits_2020',
   'Tobacco: Health benefits of smoking cessation',
   'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation',
   'Всемирная организация здравоохранения', 'guideline', 2020, date '2026-08-23', 270),
  ('jnci_lifetime_smoking_lung_cancer_2018',
   'Lifetime Smoking History and Risk of Lung Cancer: Results From the Framingham Heart Study',
   'https://academic.oup.com/jnci/article/110/11/1201/4996947',
   'Journal of the National Cancer Institute', 'study', 2018, date '2026-08-23', 280)
on conflict (code) do update
  set title = excluded.title, url = excluded.url, publisher = excluded.publisher,
      kind = excluded.kind, year = excluded.year, verified_on = excluded.verified_on,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Facts
-- ---------------------------------------------------------------------------
insert into public.knowledge_catalog
  (code, kind, claim_ru, known_ru, changes_ru, evidence_level, scope_note_ru,
   product_types, surfaces, sort_order) values

  ('craving_comes_in_waves', 'fact',
   'Тяга приходит волной и уходит сама.',
   'Тяга нарастает, доходит до пика и спадает — независимо от того, закурил ты или нет. За год воздержания сила позывов падает: через полгода сильные позывы отмечали 13% бывших курильщиков, через год — уже никто, хотя какие-то позывы оставались у трети.',
   'В момент тяги задача не «перетерпеть навсегда», а пройти одну волну. Именно поэтому ALIVE предлагает короткое действие, а не подвиг.',
   'B',
   'Никто не измерил, сколько длится отдельная волна. Цифра «3–5 минут» гуляет по интернету без источника, и ALIVE её не приводит: если волна окажется длиннее, ты решишь, что метод не работает. Известна динамика по неделям и месяцам, а не длина одного эпизода.',
   array['cigarette','hookah','vape']::text[], array['flow','links','today']::text[], 10),

  ('relief_is_withdrawal', 'fact',
   'Облегчение от сигареты — это чаще всего снятие собственной отмены.',
   'Никотин уходит из крови за несколько часов, и организм отвечает раздражительностью и тревогой. Следующая сигарета убирает именно это состояние — то есть возвращает к норме, а не поднимает выше неё. По метаанализу тех, кто бросил, через шесть и более недель тревога, стресс и подавленность ниже, чем у продолжающих курить, а положительные эмоции выше.',
   'Если сигарета «успокаивает» — стоит проверить, что именно она снимает. Ответ на настоящее напряжение и ответ на отмену — это разные действия, и ALIVE предлагает разные замены под них.',
   'A',
   'Механизм «облегчение = снятие отмены» — позиция NHS и мейнстрим специалистов, но отдельного систематического обзора именно на механизм найти не удалось. Улучшение состояния измерено начиная примерно с шестой недели: первые дни после отказа действительно тяжелее, и это не противоречие. Исследования наблюдательные, поэтому обратная причинность полностью не исключена.',
   array['cigarette','hookah','vape']::text[], array['flow','links','today']::text[], 20),

  ('withdrawal_time_course', 'fact',
   'Самое тяжёлое — первая неделя, а не первый месяц.',
   'Симптомы отмены — злость, тревога, подавленность, трудности с концентрацией, нетерпеливость, бессонница, беспокойство — достигают пика в течение первой недели и в большинстве случаев держатся две-четыре недели.',
   'Если сейчас третий день и кажется, что так будет всегда — по данным это пик, а не новая норма. Отмечай состояние в вечернем чек-ине: через две недели тебе будет что сравнить.',
   'A',
   'Обзор Хьюза о симптомах отмены; саму тягу он из анализа сроков сознательно исключил — она живёт по другой траектории, см. карточку про волну. Сроки — это среднее: у части людей отдельные симптомы держатся дольше.',
   array['cigarette','hookah','vape']::text[], array['today']::text[], 30),

  ('benefit_at_any_age', 'fact',
   'Бросить поздно не бывает — вопрос только в том, сколько лет это вернёт.',
   'В 50-летнем наблюдении за британскими врачами отказ в 60, 50, 40 и 30 лет добавлял примерно 3, 6, 9 и 10 лет жизни по сравнению с продолжающими курить. Доклад Главного хирурга США 2020 года начинается с вывода, что отказ полезен в любом возрасте, включая людей с уже диагностированными болезнями сердца и ХОБЛ.',
   'Возраст и стаж — не аргумент против попытки. Они меняют размер выигрыша, а не его знак.',
   'A',
   'Выигрыш уменьшается с возрастом, и риск не возвращается к уровню никогда не куривших: у бывших много куривших риск рака лёгкого оставался почти вчетверо выше даже через 25 лет после отказа. Когорта британских врачей — только мужчины, только Британия, рождённые примерно в 1900–1930 годах.',
   array['cigarette','hookah','vape']::text[], array['today','public']::text[], 40),

  ('support_beats_solo', 'fact',
   'Поддержка и препараты примерно удваивают шансы — но большинство пробует без них.',
   'Сочетание поведенческой поддержки с препаратами против короткого совета или обычной практики: шансы бросить выше на 70–100% (52 исследования, 19 488 участников, высокая достоверность). При этом в США в 2022 году попытку бросить делали 53% курильщиков, а 62% из них не использовали вообще никакой помощи.',
   'ALIVE — это поведенческая половина. Вторая половина — препараты и специалист, и это не признак слабости, а то, что по данным работает.',
   'A',
   'Эффект измерен в исследованиях, где участники получали контакт, наблюдение и бесплатные препараты — в жизни он меньше. И честная вторая половина: поскольку без помощи бросают в разы чаще просто по количеству попыток, большинство ныне живущих бывших курильщиков бросили сами. Это статистика базовых частот, а не доказательство, что без помощи лучше.',
   array['cigarette','hookah','vape']::text[], array['today','public']::text[], 50),

  ('recovery_timeline_who', 'fact',
   'Тело начинает восстанавливаться в первые часы — но «как у некурящего» не становится.',
   'ВОЗ приводит шкалу: за 20 минут снижаются пульс и давление, за 12 часов угарный газ в крови возвращается к норме, за 2–12 недель улучшаются кровообращение и функция лёгких, за 1–9 месяцев уменьшаются кашель и одышка. Дальше — заметное снижение риска болезней сердца, инсульта и рака лёгкого по сравнению с теми, кто продолжает курить.',
   'Первые изменения происходят раньше, чем появляется ощущение результата. Это повод не ждать «знака», а смотреть на факты.',
   'B',
   'Шкала ВОЗ опирается на доклад Главного хирурга США 1990 года. Ранние физиологические пункты правдоподобны, но «20 минут» — круглое число, а не измеренный порог. Поздние рубежи ALIVE намеренно не приводит в популярной формулировке: «через 10 лет риск рака лёгкого вдвое ниже» — это сравнение с продолжающими курить, а не возвращение к норме. По данным Фрамингемского исследования 2018 года через 10–14 лет после отказа риск рака лёгкого у много куривших был примерно в восемь раз выше, чем у никогда не куривших.',
   array['cigarette','hookah','vape']::text[], array['today']::text[], 60);

-- ---------------------------------------------------------------------------
-- Myths
-- ---------------------------------------------------------------------------
insert into public.knowledge_catalog
  (code, kind, claim_ru, known_ru, changes_ru, evidence_level, scope_note_ru,
   product_types, surfaces, sort_order) values

  ('myth_light_cigarettes', 'myth',
   '«Лёгкие сигареты менее вредны».',
   'В когорте примерно из 364 000 курильщиков смертность от рака лёгкого у «лёгких» сигарет (≤7 мг смолы) и обычных фильтрованных практически не различалась. Причина известна: человек компенсирует — затягивается глубже и закрывает пальцами вентиляционные отверстия фильтра, поэтому цифры, измеренные машиной, не описывают то, что попадает в лёгкие. С 2010 года FDA запретила надписи «лёгкие» и «мягкие» именно как вводящие в заблуждение.',
   'Переход на «лёгкие» — не шаг к отказу, а замена шага. Если цель — меньше вреда, работает меньшее число эпизодов, а не другая пачка.',
   'A',
   'Данные о фильтрованных сигаретах и собраны в 1982–88 годах; конструкция сигарет с тех пор менялась. Нефильтрованные сигареты с очень высоким содержанием смолы действительно были хуже остальных — «все сигареты одинаковы» было бы преувеличением.',
   array['cigarette']::text[], array['public']::text[], 110),

  ('myth_taper_is_safer', 'myth',
   '«Бросать резко опаснее и хуже работает, чем постепенно».',
   'Кокрейновский обзор 22 исследований (9 219 участников): постепенное снижение и резкий отказ дают одинаковый результат — RR 1,01, достоверность средняя. Ни один способ не лучше другого. А вот снижение вместе с препаратами работает лучше, чем снижение в одиночку.',
   'Способ можно выбрать по себе, а не по страху. Единственное, что по данным действительно меняет шансы, — не темп, а наличие поддержки.',
   'A',
   'В большинстве испытаний обе группы получали препараты и поддержку, поэтому «одинаково» проверено именно для такого варианта, а не для отказа без всякой помощи. Отдельно: слово «опасно» доказательной базы не имеет — отмена никотина неприятна, но не опасна. Реальное исключение одно и медицинское: табачный дым ускоряет метаболизм ряда препаратов (клозапин, оланзапин, теофиллин), и при отказе их концентрация в крови растёт. Это повод предупредить своего врача, а не повод не бросать.',
   array['cigarette','hookah','vape']::text[], array['today']::text[], 120),

  ('myth_smoking_relieves_stress', 'myth',
   '«Курение помогает справиться со стрессом».',
   'Метаанализ показывает обратное направление: у бросивших через шесть и более недель тревога, стресс и подавленность ниже, чем у продолжающих курить, а положительные эмоции и качество жизни выше. Размер эффекта сопоставим с действием антидепрессантов, и он одинаков у людей с психиатрическим диагнозом и без. NHS формулирует механизм прямо: уходящий никотин вызывает раздражительность и тревогу, и курильщики часто принимают отмену за обычный стресс.',
   'Если сигарета — твой способ справляться с напряжением, отбирать этот способ, не дав другого, бессмысленно. Поэтому в потоке тяги ALIVE сначала спрашивает, какое состояние ты ищешь, и только потом предлагает замену.',
   'A',
   'Это самый спорный пункт из здесь перечисленных, и честно сказать об этом важнее, чем звучать убедительно. Исследования наблюдательные, Кокрейн оценил достоверность по тревоге как низкую, а по подавленности как очень низкую, и обратная причинность не исключена: возможно, часть людей успешно бросила потому, что состояние уже улучшалось. И измерения начинаются с шестой недели — в первые дни после отказа тревога действительно выше.',
   array['cigarette','hookah','vape']::text[], array['links','today']::text[], 130),

  ('myth_vaping_is_harmless', 'myth',
   '«Вейп безвреден».',
   'Безвредным он не является, но и равным сигаретам — тоже. У перешедших на вейп биомаркеры вредных веществ резко ниже, чем у курильщиков: летучие органические соединения на 71–94%, табакоспецифичные нитрозамины на 58–90%. Как инструмент отказа никотиновые электронные сигареты работают: Кокрейновский обзор 2025 года даёт высокую достоверность превосходства над никотин-заместительной терапией — примерно четыре дополнительных бросивших на сотню.',
   'Если вейп — это твой путь уйти от сигарет, у этого есть подтверждение. Если это дополнительный продукт «потому что безвреден» — основание неверное, и в ALIVE вейп остаётся отдельным учитываемым продуктом.',
   'B',
   'Британская и американская официальные позиции расходятся: доклад Главного хирурга США 2020 года считает данных недостаточно, чтобы заключить, что электронные сигареты помогают бросить. Обзор OHID прямо пишет, что «степень остаточного риска остаётся неясной», и не смог обобщить данные по использованию дольше 12 месяцев. Долгосрочных исходов по сердцу и лёгким нет. Устройства на солевом никотине в основном появились уже после этих исследований. Цифру «на 95% безопаснее» ALIVE не приводит: это экспертная оценка 2015 года, а не измерение.',
   array['cigarette','vape']::text[], array['links','public']::text[], 140),

  ('myth_hookah_is_safer', 'myth',
   '«Кальян безопаснее сигарет».',
   'За часовую сессию через лёгкие проходит около 90 000 мл дыма — это в 100–200 раз больше, чем за одну сигарету; одна сессия даёт почти в 9 раз больше угарного газа и в 1,7 раза больше никотина, чем сигарета. Метаанализ 191 наблюдательного исследования (807 174 участника) показывает повышенный риск: рак лёгкого OR 2,61, ишемическая болезнь сердца 1,56, инсульт 3,10, общая смертность 1,47.',
   'Кальян — не безопасная альтернатива и не «пауза от никотина». В ALIVE он поэтому и учитывается как отдельный продукт с собственным baseline, а не как исключение.',
   'A',
   'Все эти сравнения — с никогда не курившими, а не с курильщиками сигарет: прямого сравнения «кальян против сигарет» никто не проводил. Кальян обычно курят эпизодически, а сигареты ежедневно, поэтому сравнение суммарной дозы за жизнь остаётся открытым вопросом, и авторы обзора 2025 года сами отмечают низкое качество доказательств. Конкретного соотношения «один кальян = N сигарет» ALIVE не приводит: такого измерения не существует.',
   array['hookah']::text[], array['links','public']::text[], 150),

  ('myth_too_late_to_quit', 'myth',
   '«После стольких лет бросать уже поздно».',
   'Отказ в 60 лет добавлял в среднем около 3 лет жизни, в 50 — около 6, в 40 — около 9, в 30 — около 10, по сравнению с теми, кто продолжал курить. Доклад Главного хирурга США 2020 года выносит в первый же вывод: отказ полезен в любом возрасте, в том числе при уже имеющихся болезнях сердца и ХОБЛ. Риск для сердца снижается быстро — у много куривших отказ в пределах пяти лет давал риск сердечно-сосудистых событий примерно на 39% ниже, чем у продолжающих.',
   'Стаж меняет размер выигрыша, а не его наличие. Это довод начать сегодня, а не довод, что поезд ушёл.',
   'A',
   'К уровню никогда не куривших риск не возвращается: у бывших много куривших риск рака лёгкого оставался примерно в четыре раза выше даже через 25 лет. Честная формулировка — «отказ покупает годы и заметно снижает риск», а не «организм полностью восстановится».',
   array['cigarette','hookah','vape']::text[], array['today','public']::text[], 160),

  ('myth_nrt_is_same_addiction', 'myth',
   '«Никотиновый пластырь или жвачка — это просто замена одной зависимости другой».',
   'FDA рассматривала этот вопрос напрямую и заключила, что безрецептурные препараты никотин-заместительной терапии не обладают значимым потенциалом злоупотребления или зависимости, что рисков при использовании дольше 12 недель не выявлено и что одновременное использование с сигаретами не создаёт значимых проблем безопасности. По Кокрейновскому обзору 136 исследований (64 640 участников) НЗТ повышает шансы бросить примерно в полтора раза.',
   'Если ты откладывал НЗТ из-за этого убеждения — оснований у него нет. ALIVE не считает НЗТ срывом и не назначает дозировку: это вопрос к инструкции препарата и к врачу.',
   'A',
   '«Совсем не вызывает привыкания» было бы преувеличением: часть людей, особенно на жвачке и леденцах, продолжает пользоваться ими долго. Корректная формулировка — потенциал зависимости несопоставимо ниже, чем у сигарет, потому что никотин поступает медленно через слизистую или кожу, а не быстрым импульсом с дымом.',
   array['cigarette']::text[], array['public']::text[], 170),

  ('myth_inevitable_weight_gain', 'myth',
   '«Бросишь — обязательно сильно поправишься».',
   'В среднем прибавка есть: около 2,9 кг за три месяца и около 4,7 кг за год, причём большая часть — в первые три месяца. Но среднее здесь скрывает главное. Через год после отказа без лечения 16% людей похудели, 37% набрали меньше 5 кг, 34% — от 5 до 10 кг и 13% — больше 10 кг.',
   'Значит, у большинства сценарий «сильно поправлюсь» не сбывается, а у примерно одного человека из восьми — да. Это повод заранее продумать еду и движение, а не повод не бросать.',
   'A',
   'Данные в основном из групп плацебо в исследованиях по отказу, то есть от участников испытаний, а не от населения в целом, и уверенно не распространяются дальше 12 месяцев. Отдельно: утверждение «польза для сердца перевешивает прибавку веса» ALIVE здесь не приводит — источники, которые его подтверждают, в этот проход открыть не удалось, а ссылаться на непроверенное в разделе про доказательства нельзя.',
   array['cigarette','hookah','vape']::text[], array['links']::text[], 180),

  ('myth_willpower_only', 'myth',
   '«Бросают только силой воли».',
   'Сочетание поведенческой поддержки и препаратов повышает шансы на 70–100% против короткого совета (52 исследования, 19 488 участников, высокая достоверность). В сетевом метаанализе 319 исследований: там, где без помощи бросают примерно 6 человек из 100, с никотиновыми электронными сигаретами, варениклином, цитизином или комбинированной НЗТ — от 10 до 19 из 100.',
   'Сила воли — это не метод, а ресурс, который стоит тратить на то, что даёт эффект. Помощь не заменяет решение, она умножает его.',
   'A',
   'Обратная сторона, о которой обычно молчат: попыток без помощи в разы больше, поэтому большинство ныне живущих бывших курильщиков действительно бросили сами. Это следствие количества попыток, а не превосходство метода. И сравнивать «с помощью против без помощи» по наблюдательным данным нельзя: за помощью чаще идут те, у кого зависимость сильнее, и это занижает эффект. Цифры выше — из рандомизированных испытаний, где участники получали контакт и бесплатные препараты; в жизни эффект меньше.',
   array['cigarette','hookah','vape']::text[], array['today','public']::text[], 190);

-- ---------------------------------------------------------------------------
-- Sources per card
-- ---------------------------------------------------------------------------
insert into public.knowledge_evidence (knowledge_code, source_id, sort_order)
select v.knowledge_code, s.id, v.sort_order
  from (values
    ('craving_comes_in_waves', 'ussher_urge_52_weeks_2013', 10),
    ('craving_comes_in_waves', 'hughes_withdrawal_time_course_2007', 20),
    ('relief_is_withdrawal', 'bmj_mental_health_after_cessation_2014', 10),
    ('relief_is_withdrawal', 'nhs_smoking_stress_mental_health', 20),
    ('withdrawal_time_course', 'hughes_withdrawal_time_course_2007', 10),
    ('benefit_at_any_age', 'doll_british_doctors_2004', 10),
    ('benefit_at_any_age', 'surgeon_general_cessation_2020', 20),
    ('benefit_at_any_age', 'jnci_lifetime_smoking_lung_cancer_2018', 30),
    ('support_beats_solo', 'cochrane_combined_support_2016', 10),
    ('support_beats_solo', 'mmwr_adult_cessation_2024', 20),
    ('recovery_timeline_who', 'who_cessation_benefits_2020', 10),
    ('recovery_timeline_who', 'jnci_lifetime_smoking_lung_cancer_2018', 20),
    ('myth_light_cigarettes', 'bmj_tar_yields_2004', 10),
    ('myth_taper_is_safer', 'cochrane_reduction_vs_abrupt_2019', 10),
    ('myth_smoking_relieves_stress', 'bmj_mental_health_after_cessation_2014', 10),
    ('myth_smoking_relieves_stress', 'nhs_smoking_stress_mental_health', 20),
    ('myth_vaping_is_harmless', 'cochrane_ecigarettes_2025', 10),
    ('myth_vaping_is_harmless', 'ohid_nicotine_vaping_england_2022', 20),
    ('myth_hookah_is_safer', 'cdc_hookahs', 10),
    ('myth_hookah_is_safer', 'waterpipe_meta_2025', 20),
    ('myth_too_late_to_quit', 'doll_british_doctors_2004', 10),
    ('myth_too_late_to_quit', 'surgeon_general_cessation_2020', 20),
    ('myth_nrt_is_same_addiction', 'fda_nrt_labeling_2013', 10),
    ('myth_nrt_is_same_addiction', 'cochrane_nrt_2018', 20),
    ('myth_inevitable_weight_gain', 'bmj_weight_gain_2012', 10),
    ('myth_willpower_only', 'cochrane_combined_support_2016', 10),
    ('myth_willpower_only', 'mmwr_adult_cessation_2024', 20)
  ) as v(knowledge_code, source_code, sort_order)
  join public.evidence_sources s on s.code = v.source_code
on conflict (knowledge_code, source_id) do nothing;

-- ---------------------------------------------------------------------------
-- Cards per trigger
-- ---------------------------------------------------------------------------
-- Only where the card genuinely belongs to that moment. A card mapped to everything is
-- a card that means nothing in particular, and in the craving flow it would be noise at
-- the worst possible time.
insert into public.knowledge_trigger_map (knowledge_code, trigger_code, sort_order)
values
  -- The wave applies wherever the pull arrives without a situation to solve.
  ('craving_comes_in_waves', 'spontaneous', 10),
  ('craving_comes_in_waves', 'boredom', 20),
  ('craving_comes_in_waves', 'wake_up', 30),
  ('craving_comes_in_waves', 'before_sleep', 40),
  -- The states where a cigarette is read as relief.
  ('relief_is_withdrawal', 'tension', 10),
  ('relief_is_withdrawal', 'anxiety', 20),
  ('relief_is_withdrawal', 'irritability', 30),
  ('relief_is_withdrawal', 'anger', 40),
  ('relief_is_withdrawal', 'uncertainty', 50),
  ('myth_smoking_relieves_stress', 'tension', 10),
  ('myth_smoking_relieves_stress', 'anxiety', 20),
  ('myth_smoking_relieves_stress', 'irritability', 30),
  ('myth_smoking_relieves_stress', 'anger', 40),
  -- Product-specific contexts.
  ('myth_hookah_is_safer', 'hookah_venue', 10),
  ('myth_hookah_is_safer', 'social', 20),
  ('myth_vaping_is_harmless', 'work_computer', 10),
  ('myth_vaping_is_harmless', 'phone', 20),
  -- Eating and the evening are where the weight worry actually shows up.
  ('myth_inevitable_weight_gain', 'after_meal', 10),
  ('myth_inevitable_weight_gain', 'evening', 20),
  ('withdrawal_time_course', 'insomnia', 10)
on conflict (knowledge_code, trigger_code) do nothing;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
do $$
declare
  facts integer;
  myths integer;
  unsourced text;
  mismatched text;
begin
  select count(*) into facts from public.knowledge_catalog where kind = 'fact';
  select count(*) into myths from public.knowledge_catalog where kind = 'myth';

  -- Belt and braces alongside the constraint trigger: a card claiming A or B while
  -- citing nothing is the one failure mode this whole section must not have.
  select string_agg(k.code, ', ')
    into unsourced
    from public.knowledge_catalog k
   where k.evidence_level in ('A', 'B')
     and not exists (select 1 from public.knowledge_evidence e where e.knowledge_code = k.code);
  if unsourced is not null then
    raise exception 'Knowledge cards claim evidence but cite no source: %', unsourced;
  end if;

  -- A card must not be mapped to a trigger that no product it applies to can reach —
  -- the waterpipe myth attached to a vape-only trigger would never surface, and nothing
  -- would report it as broken.
  select string_agg(distinct m.knowledge_code || '→' || m.trigger_code, ', ')
    into mismatched
    from public.knowledge_trigger_map m
    join public.knowledge_catalog k on k.code = m.knowledge_code
    join public.triggers_catalog t on t.code = m.trigger_code
   where not (k.product_types && t.product_types);
  if mismatched is not null then
    raise exception 'Knowledge card mapped to a trigger it can never appear for: %', mismatched;
  end if;

  raise notice 'Knowledge catalog: % fact(s), % myth(s), % citation(s), % trigger link(s)',
    facts, myths,
    (select count(*) from public.knowledge_evidence),
    (select count(*) from public.knowledge_trigger_map);
end
$$;

commit;
