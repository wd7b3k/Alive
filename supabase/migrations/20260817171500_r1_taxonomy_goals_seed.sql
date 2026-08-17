-- ALIVE R1 — нормализация существующего богатого каталога и стартовая библиотека «Зачем».

insert into public.replacement_categories_catalog(code,title_ru,description_ru,sort_order) values
('ритуал','Новый ритуал','Сохранить полезную функцию паузы, завершения или переключения без никотина.',45),
('отдых','Отдых','Короткое восстановление без обязанности быть продуктивным.',85),
('награда','Награда без никотина','Присвоить результат или получить удовольствие без зависимого действия.',86),
('наблюдение','Наблюдение тяги','Не бороться с импульсом автоматически, а коротко выдержать и увидеть его изменение.',35)
on conflict(code) do update set title_ru=excluded.title_ru,description_ru=excluded.description_ru,sort_order=excluded.sort_order;

update public.replacements_catalog set category_code = case
  when category in ('movement','physical') then 'движение'
  when category = 'breath' then 'дыхание'
  when category in ('sensory','orienting') then 'внимание'
  when category = 'observation' then 'наблюдение'
  when category = 'drink' then 'напиток'
  when category = 'food' then 'еда'
  when category in ('journal','cognitive') then 'мысль'
  when category = 'music' then 'музыка'
  when category in ('social','connection','contact') then 'общение'
  when category = 'environment' then 'среда'
  when category = 'meaning' then 'зачем'
  when category = 'nrt' then 'лечение'
  when category = 'ritual' then 'ритуал'
  when category = 'rest' then 'отдых'
  when category = 'reward' then 'награда'
  else category_code
end;

-- Машинные category_code остаются внутренними; title/description для UI только русские.
update public.triggers_catalog set
  category_code = case
    when code in ('wake_up','morning','coffee','after_meal','before_sleep','evening','after_sex') then 'ритуал'
    when code in ('anger','irritability','anxiety','tension','uncertainty') then 'эмоции'
    when code in ('thinking','thought_complete','task_start','task_transition','task_reward','after_task','important_decision','significant_action') then 'переход'
    when code in ('social','phone') then 'социальное'
    when code in ('driving','work_computer','hookah_venue') then 'среда'
    when code in ('spontaneous','insomnia') then 'физиология'
    else coalesce(category_code,'ритуал')
  end,
  recognition_prompt_ru = case
    when code in ('after_meal') then 'Это знакомая тяга после еды или сейчас произошло что-то ещё?'
    when code in ('work_computer') then 'Ты действительно решил использовать электронку или рука потянулась к ней сама?'
    when code in ('thinking') then 'Тебе сейчас нужен никотин или пространство, чтобы продолжить мысль?'
    when code in ('task_transition') then 'Это тяга или привычная точка между двумя делами?'
    when code in ('social') then 'Тебе нужен сам никотин или участие в общем ритуале?'
    when code in ('hookah_venue') then 'Что здесь важнее: сам кальян или вечер, люди и атмосфера?'
    when code in ('anger','irritability','tension') then 'Что сейчас сильнее: физиологическая тяга или желание быстро изменить состояние?'
    else recognition_prompt_ru
  end;

-- Добавляем теги существующим популярным Заменам для будущего ранжирования.
update public.replacements_catalog set
  short_action_ru = coalesce(short_action_ru, summary, title),
  effort_level = coalesce(effort_level, case
    when category_code in ('наблюдение','зачем','напиток','дыхание') then 1
    when category_code in ('внимание','мысль','музыка','ритуал') then 2
    when category_code in ('движение','среда','общение') then 3
    else 2 end),
  context_tags = case
    when code in ('walk','short_walk','safe_stop') then array['нужно переключиться','напряжение','можно двигаться']::text[]
    when code in ('beautiful_view','three_details','sensory_reset','empty_pause') then array['перегруз','автоматизм','нужна пауза']::text[]
    when code in ('one_line_question','one_line_conclusion','next_step') then array['мысль','работа','переход']::text[]
    when code in ('favorite_song','calm_music') then array['эмоции','удовольствие','переключение']::text[]
    when code in ('meaning_card','future_resource') then array['мотивация','ценности','награда']::text[]
    when code in ('message_person','stay_close','savor_conversation') then array['общение','близость','социальное']::text[]
    when code in ('vape_out_of_reach') then array['вейп','автоматическое обращение','доступность']::text[]
    when code like 'nrt_%' then array['сильная тяга','лечение','сигареты']::text[]
    else context_tags end;

insert into public.goals_catalog(code,goal_type,title_ru,body_ru,reflection_prompt_ru,context_tags,sort_order)
values
('freedom_choice','ценность','Свобода выбора','Я хочу, чтобы решение принадлежало мне, а не следующему импульсу.','Что сегодня стало бы чуть свободнее без автоматического никотинового ответа?',array['свобода','контроль']::text[],10),
('full_power','направление','Жить в полную силу','Я хочу узнать, каким стану, если перестану ежедневно отдавать часть энергии зависимости.','На что сегодня можно направить хотя бы один освобождённый кусок внимания?',array['реализация','энергия']::text[],20),
('healthy_future','ценность','Больше здорового будущего','Я хочу увеличивать шанс прожить больше активных и здоровых лет.','Какое сегодняшнее решение работает на твоё будущее, а не только на ближайшие минуты?',array['здоровье','будущее']::text[],30),
('time_back','цель','Вернуть своё время','Я хочу вернуть часы, которые раньше уходили на курение, подготовку и поиск следующей возможности употребить никотин.','Что ты действительно хочешь делать с возвращённым временем?',array['время','свобода']::text[],40),
('money_back','цель','Перестать платить зависимости','Я хочу оставлять деньги на жизнь, впечатления и вещи, которые выбираю сам.','На что приятнее было бы потратить эту сумму?',array['деньги','выбор']::text[],50),
('breathing_body','цель','Чувствовать тело свободнее','Я хочу легче дышать, двигаться и чувствовать своё тело без постоянного дыма и никотинового ритуала.','Какое ощущение в теле ты хотел бы вернуть или усилить?',array['здоровье','тело']::text[],60),
('family_presence','ценность','Быть рядом дольше','Я хочу быть живым и присутствующим рядом с людьми, которые для меня важны.','С кем ты на самом деле хочешь провести время, которое сейчас требует зависимость?',array['семья','близость','здоровье']::text[],70),
('self_respect','ценность','Уважать собственные решения','Я хочу снова доверять себе: если я решил менять жизнь, мои действия постепенно начинают соответствовать этому решению.','Какой маленький выбор сегодня подтвердит твоё собственное решение?',array['самоуважение','контроль']::text[],80),
('calm_without_nicotine','направление','Научиться успокаиваться без никотина','Я хочу, чтобы стресс перестал автоматически означать сигарету или электронку.','Что ещё действительно помогает твоей нервной системе?',array['стресс','эмоции','навык']::text[],90),
('rest_without_smoke','направление','Уметь делать настоящую паузу','Я хочу сохранить право останавливаться и отдыхать, но больше не покупать эту паузу сигаретой.','Как могла бы выглядеть пауза, которую не нужно отрабатывать никотином?',array['отдых','пауза']::text[],100),
('think_without_smoke','направление','Думать без сигареты','Я хочу сохранить глубину размышлений и решений, но отвязать их от курительного ритуала.','Что на самом деле помогает тебе думать: никотин или пространство без внешних требований?',array['мысль','работа']::text[],110),
('social_freedom','направление','Быть с людьми без обязательного ритуала','Я хочу оставаться частью компании, разговора и вечера, не нуждаясь в кальяне, сигарете или вейпе как пропуске к общению.','Что ценного останется в этой встрече, если убрать никотин?',array['общение','кальян','социальное']::text[],120),
('identity_free','ценность','Перестать определять себя через зависимость','Я хочу, чтобы курение перестало быть частью образа меня — бунтаря, взрослого, свободного или «своего».','Какая часть тебя остаётся настоящей и без сигареты?',array['идентичность','свобода']::text[],130),
('morning_free','цель','Начинать день без первой дозы','Я хочу, чтобы утро начиналось с моей жизни, а не с обслуживания никотиновой тяги.','Что ты хотел бы поставить первым действием своего утра?',array['утро','ритуал']::text[],140),
('food_free','цель','Заканчивать еду без сигареты','Я хочу, чтобы вкус и завершение еды снова были полноценными сами по себе.','Что может поставить приятную точку после еды вместо сигареты?',array['еда','ритуал']::text[],150),
('drive_free','цель','Ездить без автоматического никотина','Я хочу, чтобы машина перестала автоматически включать сценарий курения или вейпа.','Что сделает дорогу удобной без устройства в руке?',array['машина','вейп','сигареты']::text[],160),
('work_focus','цель','Вернуть внимание работе','Я хочу меньше дробить внимание между задачей и постоянными микродозами никотина.','Как выглядит час работы, в котором устройство не управляет твоим вниманием?',array['работа','вейп','внимание']::text[],170),
('future_adventure','направление','Оставить больше места неизвестному хорошему','Я не знаю, какие люди, идеи и события ещё впереди. Я хочу оставить себе больше времени и здоровья, чтобы до них дойти.','Что хорошее в твоём будущем пока невозможно предсказать?',array['будущее','любопытство','мотивация']::text[],180)
on conflict(code) do update set
  title_ru=excluded.title_ru,
  body_ru=excluded.body_ru,
  reflection_prompt_ru=excluded.reflection_prompt_ru,
  context_tags=excluded.context_tags,
  published=true,
  sort_order=excluded.sort_order,
  updated_at=now();

-- Из старого одиночного goal_text создаём «Зачем» только если текст есть и ещё не был перенесён.
insert into public.user_goals(user_id,goal_type,title_ru,body_ru,priority,context_tags,active)
select s.user_id,'направление','Моё главное «Зачем»',s.goal_text,5,array['главное']::text[],true
from public.user_settings s
where nullif(trim(s.goal_text),'') is not null
  and not exists (
    select 1 from public.user_goals g
    where g.user_id=s.user_id and g.context_tags @> array['главное']::text[] and g.deleted_at is null
  );
