-- ALIVE R1 — расширение доказательной базы: смертность, сердце, малое число сигарет, сон и вес.

insert into public.evidence_sources
(source_type,title_original,source_label_ru,authors,publication,publication_date,url,doi)
values
('исследование','Smoking Cessation and Short- and Longer-Term Mortality','Международное исследование смертности после прекращения курения','Eo Rin Cho; Ilene K Brill; Inger T Gram; Patrick E Brown; Prabhat Jha','NEJM Evidence','2024-02-08','https://pubmed.ncbi.nlm.nih.gov/38329816/','10.1056/EVIDoa2300272'),
('исследование','Smoking Cessation and Incident Cardiovascular Disease','Исследование сердечно-сосудистого риска после прекращения курения','Jun Hwan Cho; Seung Yong Shin; Hoseob Kim и соавторы','JAMA Network Open','2024-11-01','https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2825743','10.1001/jamanetworkopen.2024.42639'),
('систематический обзор','Conditions of sleep restoration after smoking cessation: A systematic review','Систематический обзор сна после прекращения курения','Sibylle Mauries и соавторы','Sleep Medicine Reviews','2024-12-09','https://pubmed.ncbi.nlm.nih.gov/39893864/','10.1016/j.smrv.2024.102041'),
('исследование','Weight Gain After Smoking Cessation and Risk of Major Chronic Diseases and Mortality','Исследование набора веса и здоровья после прекращения курения','Ding Ding и соавторы','JAMA Network Open','2021-05-11','https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2779121','10.1001/jamanetworkopen.2021.10445'),
('метаанализ','Low cigarette consumption and risk of coronary heart disease and stroke: meta-analysis of 141 cohort studies in 55 study reports','Метаанализ сердечно-сосудистого риска даже при одной сигарете в день','Allan Hackshaw; Joan K Morris; Siladitya Boniface; Jianhua Tang; David Milenković','BMJ','2018-01-24','https://www.bmj.com/content/360/bmj.j5855','10.1136/bmj.j5855')
on conflict(url) do update set
  source_label_ru=excluded.source_label_ru,
  publication_date=excluded.publication_date,
  doi=excluded.doi,
  updated_at=now();

insert into public.evidence_claims
(code,topic,claim_ru,population_ru,limitations_ru,evidence_level,status,last_reviewed_at,review_due_at)
values
('mortality_benefit_early_2024','польза отказа','Польза прекращения курения для выживаемости становится заметной уже в первые годы, а более длительный отказ связан с всё большим выигрышем по сравнению с продолжением курения.','1,48 миллиона взрослых из четырёх национальных когорт США, Великобритании, Норвегии и Канады.','Наблюдательные данные показывают ассоциации, а не гарантированный выигрыш конкретного человека. Величина эффекта зависит от возраста, стажа и других факторов.','умеренная уверенность','проверено','2026-08-17','2027-02-17'),
('cvd_risk_declines_after_quit_2024','сердце','Прекращение курения связано со снижением сердечно-сосудистого риска, но скорость приближения к риску никогда не куривших зависит от накопленного стажа курения.','Более 5,3 миллиона участников корейской национальной базы медицинского страхования.','Это наблюдательное когортное исследование. У людей с большим накопленным стажем остаточный риск может сохраняться много лет; это не означает отсутствия пользы от прекращения.','умеренная уверенность','проверено','2026-08-17','2027-02-17'),
('light_smoking_cvd_2018','сердце','Одна сигарета в день несёт намного больше сердечно-сосудистого риска, чем можно ожидать из простой пропорции от пачки: в метаанализе она давала примерно 40–50% избыточного риска ишемической болезни сердца/инсульта от уровня 20 сигарет в день.','Метаанализ 141 когортного исследования.','Работа опубликована в 2018 году и остаётся одним из ключевых количественных анализов малой интенсивности курения. Оценка относится к популяционному относительному риску, а не к вероятности события у конкретного человека.','умеренная уверенность','проверено','2026-08-17','2027-02-17'),
('sleep_withdrawal_2025','сон','В первые недели после прекращения курения нарушения сна могут сохраняться или временно усиливаться; это часть периода отмены и фактор риска возврата, а не доказательство, что курение улучшает сон в долгосрочной перспективе.','27 исследований, включённых в систематический обзор сна и прекращения курения.','Результаты исследований неоднородны, данных о долгосрочном восстановлении сна пока ограниченно. Нельзя обещать конкретный срок нормализации сна.','предварительные данные','проверено','2026-08-17','2027-02-17'),
('weight_gain_does_not_cancel_benefit_2021','вес','Набор веса после прекращения курения не отменяет основную пользу отказа для снижения смертности; в крупном когортном исследовании прекратившие курить имели более низкий риск смерти независимо от изменения веса.','16 663 взрослых из национально репрезентативной австралийской когорты.','После прекращения курения вес действительно может увеличиваться; отдельные метаболические риски требуют внимания. Это не означает, что вес нужно игнорировать, а означает, что страх набора веса не делает продолжение курения более безопасным выбором.','умеренная уверенность','проверено','2026-08-17','2027-02-17')
on conflict(code) do update set
  claim_ru=excluded.claim_ru,
  population_ru=excluded.population_ru,
  limitations_ru=excluded.limitations_ru,
  evidence_level=excluded.evidence_level,
  status='проверено',
  last_reviewed_at=excluded.last_reviewed_at,
  review_due_at=excluded.review_due_at,
  updated_at=now();

insert into public.evidence_claim_sources(claim_code,source_id,source_role)
select 'mortality_benefit_early_2024',id,'основной' from public.evidence_sources where url='https://pubmed.ncbi.nlm.nih.gov/38329816/' on conflict do nothing;
insert into public.evidence_claim_sources select 'cvd_risk_declines_after_quit_2024',id,'основной' from public.evidence_sources where url='https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2825743' on conflict do nothing;
insert into public.evidence_claim_sources select 'light_smoking_cvd_2018',id,'основной' from public.evidence_sources where url='https://www.bmj.com/content/360/bmj.j5855' on conflict do nothing;
insert into public.evidence_claim_sources select 'sleep_withdrawal_2025',id,'основной' from public.evidence_sources where url='https://pubmed.ncbi.nlm.nih.gov/39893864/' on conflict do nothing;
insert into public.evidence_claim_sources select 'weight_gain_does_not_cancel_benefit_2021',id,'основной' from public.evidence_sources where url='https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2779121' on conflict do nothing;

insert into public.awareness_content
(code,content_type,title_ru,hook_ru,explanation_ru,motivation_ru,caveat_ru,claim_code,product_types,context_tags,published,sort_order)
values
('fact_benefit_starts_early','факт','Организм не ждёт десятилетия, чтобы начать выигрывать','Большое международное исследование 2024 года обнаружило заметную связь между прекращением курения и снижением избыточной смертности уже в первые три года.','Чем дольше сохраняется отказ, тем больше накопленный выигрыш. Но важная мысль проще: решение бросить начинает работать на будущее намного раньше, чем кажется.','Тебе не нужно ждать десять лет, чтобы сегодняшний выбор приобрёл смысл. Первые годы уже относятся к другой траектории, чем продолжение курения.','Это наблюдательные популяционные данные. Они не обещают конкретному человеку определённое число дополнительных лет.','mortality_benefit_early_2024',array['cigarette']::text[],array['мотивация','будущее','здоровье']::text[],true,135),
('fact_heart_risk_changes','факт','Сердцу важен не только сегодняшний день, но и накопленный стаж','Исследование более 5,3 миллиона человек показало: после прекращения курения сердечно-сосудистый риск снижается, но путь к уровню никогда не куривших зависит от накопленного стажа.','Если стаж большой, остаточный риск может сохраняться долго. Это аргумент не «уже поздно», а наоборот — чем раньше прекратить добавлять новые сигареты к накопленной дозе, тем лучше.','Ты не можешь удалить прошлые годы. Но можешь перестать делать прошлое длиннее уже сегодня.','Это наблюдательное исследование; сроки снижения риска различаются между людьми и не являются персональным прогнозом.','cvd_risk_declines_after_quit_2024',array['cigarette']::text[],array['сердце','стаж','мотивация']::text[],true,140),
('myth_few_cigarettes_safe','миф','«Пара сигарет в день — почти безопасный уровень»','Для сердца риск уменьшается совсем не так линейно, как количество сигарет. В крупном метаанализе одна сигарета в день несла примерно 40–50% избыточного сердечно-сосудистого риска уровня двадцати сигарет в день.','Сокращение количества может быть полезным этапом и снижает часть вреда, но оно не превращает оставшиеся сигареты в мелочь. Особенно для сердца важна полная граница с горючим табаком.','Каждая убранная сигарета — прогресс. Просто не позволяй промежуточному прогрессу убедить тебя, что конечная цель больше не нужна.','Метаанализ опубликован в 2018 году; это популяционный относительный риск, а не вероятность инфаркта или инсульта у конкретного человека.','light_smoking_cvd_2018',array['cigarette']::text[],array['сокращение','самообман','сердце']::text[],true,145),
('myth_sleep_worse','миф','«Я хуже сплю без сигарет — значит, отказ мне вредит»','Нарушения сна действительно могут быть частью первых недель отмены. Свежий систематический обзор показывает, что проблемы со сном в этот период встречаются часто и связаны с риском возврата к курению.','Это повод отдельно помогать сном и учитывать его как триггер, а не доказательство, что сигарета была полезным снотворным. Данные о восстановлении сна есть, но они неоднородны.','Плохая ночь — не приговор твоей попытке. Иногда мозгу и телу нужно время научиться жить без привычного никотинового цикла.','Нельзя обещать, что сон восстановится за конкретное число дней; при стойкой бессоннице нужна отдельная оценка причин.','sleep_withdrawal_2025',array['cigarette']::text[],array['сон','отмена','самообман']::text[],true,150),
('myth_weight_gain','миф','«Если я наберу вес, бросать станет вреднее, чем курить»','После отказа часть людей действительно набирает вес. Но данные не показывают, что этот набор отменяет главное преимущество прекращения курения для выживаемости.','В крупной австралийской когорте прекратившие курить имели более низкий риск смерти, чем продолжавшие, независимо от изменения веса. Вес можно решать как отдельную задачу — сигарета не становится безопасным способом его контроля.','Не нужно выбирать между зависимостью и телом. Сначала убираем дым, затем спокойно настраиваем питание, движение и новый ритм без самообмана.','Вес после отказа действительно может увеличиться; людям с метаболическими рисками полезно отдельно следить за питанием, активностью и показателями здоровья.','weight_gain_does_not_cancel_benefit_2021',array['cigarette']::text[],array['вес','самообман','мотивация']::text[],true,155)
on conflict(code) do update set
  title_ru=excluded.title_ru,
  hook_ru=excluded.hook_ru,
  explanation_ru=excluded.explanation_ru,
  motivation_ru=excluded.motivation_ru,
  caveat_ru=excluded.caveat_ru,
  claim_code=excluded.claim_code,
  product_types=excluded.product_types,
  context_tags=excluded.context_tags,
  published=true,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.awareness_content_contexts(content_code,trigger_code,product_type,moment,priority) values
('fact_benefit_starts_early',null,'cigarette','путь',25),
('fact_heart_risk_changes',null,'cigarette','библиотека',40),
('myth_few_cigarettes_safe',null,'cigarette','микроосознанность',25),
('myth_sleep_worse','insomnia','cigarette','микроосознанность',10),
('myth_weight_gain',null,'cigarette','библиотека',55)
on conflict do nothing;
