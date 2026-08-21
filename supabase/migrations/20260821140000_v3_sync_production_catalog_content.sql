-- Restores into version control the catalog content that only ever existed in the
-- production database.
--
-- Companion to 20260821130000_v3_sync_production_schema_drift.sql, which restored the
-- columns. This migration restores the values in them.
--
-- Context (2026-08-21): a live QA pass found the production catalog had diverged from
-- this repository — 29 replacements existed only in production, three rows had been
-- retitled there, and the evidence/curation metadata on every row was absent from the
-- repo entirely. Editing happened directly in the Supabase dashboard, so none of it was
-- ever captured as a migration. The owner's explicit decision was that production is
-- the source of truth and the repository is brought up to match it.
--
-- Why it matters for release: releases/v3.0-platform/VALIDATION.md requires
-- `supabase db reset`. Before this pair of migrations, that reset would have rebuilt a
-- database missing 29 user-visible replacements and all evidence metadata — the
-- documented release step destroyed real content.
--
-- Values were read from production over PostgREST and are reproduced verbatim. Nothing
-- here is invented: no replacement, wording, evidence level or source was authored by
-- the assistant. Applying this to production is a no-op — it writes exactly what is
-- already there.
--
-- Base fields for the 39 replacements that already matched production are deliberately
-- NOT rewritten; only their previously-missing metadata is filled in.

-- 1. Replacements present only in production (29).
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('apple_crunch', 'Яблоко', 'Если ты действительно голоден, съешь небольшое яблоко и не торопись.', 'food', array['oral_sensory','pleasure','stimulation']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 220, 'leaf', '3 мин', 'Хрустящий вариант, когда тяга совпала с голодом', null, 'food', 'C', 'Пищевая эвристика ALIVE; не использовать как автоматический ответ на каждую тягу', 'еда', 'Хрустящий вариант, когда тяга совпала с голодом', 2, 0.8, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('attention_321', 'Три — два — один', 'Назови про себя 3 вещи, которые видишь, 2 звука вокруг и 1 ощущение в теле.', 'orienting', array['switch','release_tension','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "attention"}'::jsonb, true, 204, 'eye', '45 сек', 'Вернуть фокус в то, что происходит прямо сейчас', 'Не задерживайся на неприятном ощущении', 'attention', 'C', 'Attention-reset эвристика ALIVE, адаптированная из HumanOS', 'внимание', 'Вернуть фокус в то, что происходит прямо сейчас', 2, 1.1, 1, 10, array['stress','thinking','phone']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('berries_portion', 'Небольшая порция ягод', 'Если ты голоден, выбери небольшую порцию ягод и ешь без телефона.', 'food', array['pleasure','oral_sensory']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 225, 'leaf', '3 мин', 'Яркий вкус без автоматического перекуса', null, 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Яркий вкус без автоматического перекуса', 2, 0.7, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('brush_teeth', 'Почистить зубы', 'После еды или кофе почисти зубы как новый знак: ритуал завершён.', 'ritual', array['closure','oral_sensory','switch']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "context_change"}'::jsonb, true, 213, 'finish', '2 мин', 'Заменить привычную точку «еда → сигарета» другой точкой', 'Следуй обычным правилам ухода за зубами', 'context_change', 'C', 'Cue-restructuring эвристика ALIVE', 'ритуал', 'Заменить привычную точку «еда → сигарета» другой точкой', 2, 1.15, 1, 10, array['after_meal','coffee']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('carrot_crunch', 'Морковь', 'Если хочется именно пожевать и ты голоден, возьми небольшую порцию моркови.', 'food', array['oral_sensory','stimulation']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 222, 'leaf', '3 мин', 'Хрустящая несладкая альтернатива', null, 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Хрустящая несладкая альтернатива', 2, 0.85, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('cottage_cheese', 'Творог', 'Если тяга совпала с голодом, выбери небольшую привычную порцию творога.', 'food', array['pleasure','oral_sensory']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 227, 'leaf', '4 мин', 'Сытный вариант вместо случайного сладкого перекуса', 'Учитывай личную переносимость молочных продуктов', 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Сытный вариант вместо случайного сладкого перекуса', 2, 0.65, 1, 10, array['hunger']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('cucumber_crunch', 'Огурец', 'Небольшая порция свежего огурца, если тяга совпала с голодом или хочется хрустящего вкуса.', 'food', array['oral_sensory','pleasure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 223, 'leaf', '3 мин', 'Лёгкая хрустящая альтернатива', null, 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Лёгкая хрустящая альтернатива', 2, 0.8, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('egg_portion', 'Яйцо', 'Если сейчас именно голод, а не только тяга, выбери одно привычно приготовленное яйцо.', 'food', array['stimulation','oral_sensory']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 228, 'leaf', '5 мин', 'Небольшая белковая еда при реальном голоде', 'Не использовать при индивидуальных ограничениях', 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Небольшая белковая еда при реальном голоде', 2, 0.6, 1, 10, array['hunger']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('five_long_exhales', 'Пять спокойных выдохов', 'Сделай обычный вдох и чуть более длинный мягкий выдох. Повтори пять раз, не стараясь дышать глубже обычного.', 'breath', array['release_tension','pause','switch']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "B", "mechanism": "breathing"}'::jsonb, true, 203, 'breath', '1 мин', 'Снизить внутреннее ускорение без сложной техники', 'Если кружится голова или неприятно — сразу вернись к обычному дыханию', 'breathing', 'B', 'Evidence относится к состоянию/arousal, а не к гарантии прекращения курения', 'дыхание', 'Снизить внутреннее ускорение без сложной техники', 1, 1.2, 1, 10, array['stress','anxiety']::text[], 'Brief structured respiration practices and mood/arousal', 'https://pubmed.ncbi.nlm.nih.gov/36630953/')
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('focus_point', 'Одна спокойная точка', 'Выбери один неподвижный предмет и смотри на него 30–45 секунд. Заметь форму, свет и края, ничего не анализируя.', 'orienting', array['switch','pause','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "attention"}'::jsonb, true, 205, 'eye', '45 сек', 'Сузить входящий шум до одной простой задачи', null, 'attention', 'C', 'Attention-reset эвристика ALIVE, адаптированная из HumanOS', 'внимание', 'Сузить входящий шум до одной простой задачи', 2, 0.95, 1, 10, array['overload','work','phone']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('focus_two_minutes', 'Две минуты одного дела', 'Выбери самый маленький следующий шаг и делай только его две минуты: открыть файл, написать первую строку, убрать один предмет.', 'focus', array['stimulation','switch','closure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "focus"}'::jsonb, true, 233, 'focus', '2 мин', 'Проверить, нужна ли сигарета или нужен был короткий старт', null, 'focus', 'C', 'Поведенческая эвристика ALIVE', null, 'Проверить, нужна ли сигарета или нужен был короткий старт', 2, 1.05, 1, 9, array['task_start','work','procrastination']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('gaze_far_minute', 'Минута смотреть вдаль', 'Посмотри в окно или на дальний объект около минуты. Ничего не решай в это время.', 'orienting', array['pause','switch','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "attention"}'::jsonb, true, 231, 'eye', '1 мин', 'Сменить зрительный фокус и дать мозгу короткую паузу', null, 'attention', 'C', 'Поведенческая эвристика ALIVE', 'внимание', 'Сменить зрительный фокус и дать мозгу короткую паузу', 2, 0.95, 1, 10, array['work','phone','overload']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('ground_feet', 'Стопы в пол', 'Поставь обе стопы на пол и слегка прижми их к поверхности на 5 секунд. Отпусти и заметь вес тела. Повтори 3 раза.', 'grounding', array['release_tension','pause','switch','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "grounding"}'::jsonb, true, 201, 'ground', '40 сек', 'Вернуть внимание из автоматизма в ощущение опоры', 'Без боли и без задержки дыхания', 'grounding', 'C', 'Короткая self-regulation эвристика ALIVE, адаптированная из HumanOS', null, 'Вернуть внимание из автоматизма в ощущение опоры', 2, 1.1, 1, 10, array['stress','anxiety','overload']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('gum_sugarfree', 'Жвачка без сахара', 'Возьми жвачку без сахара и на минуту направь внимание на вкус и работу челюсти.', 'oral', array['oral_sensory','switch']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "oral"}'::jsonb, true, 211, 'leaf', '2 мин', 'Занять рот без сигареты', 'Не использовать, если жевание вызывает боль или не подходит по здоровью', 'oral', 'C', 'Поведенческая эвристика ALIVE', null, 'Занять рот без сигареты', 2, 1.1, 1, 10, array['driving','after_meal','coffee']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('hands_pen', 'Занять руки', 'Возьми ручку или небольшой безопасный предмет и минуту крути, рисуй линии или делай простые пометки.', 'manual', array['oral_sensory','switch','pause']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "manual"}'::jsonb, true, 214, 'hands', '1 мин', 'Убрать часть привычки «что-то держать в руке»', 'Не использовать острые или опасные предметы', 'manual', 'C', 'Поведенческая эвристика ALIVE', null, 'Убрать часть привычки «что-то держать в руке»', 2, 0.95, 1, 10, array['work','phone','boredom']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('listen_three_sounds', 'Три звука вокруг', 'Остановись на полминуты и найди три разных звука: близкий, средний и дальний.', 'orienting', array['switch','pause','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "attention"}'::jsonb, true, 206, 'eye', '40 сек', 'Переключить внимание с тяги на окружающую среду', null, 'attention', 'C', 'Поведенческая эвристика ALIVE', 'внимание', 'Переключить внимание с тяги на окружающую среду', 2, 0.9, 1, 10, array['spontaneous','boredom','stress']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('mint_reset', 'Мята', 'Возьми обычную мятную пастилку без никотина или освежи рот привычным безопасным способом.', 'oral', array['oral_sensory','switch','closure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "oral"}'::jsonb, true, 212, 'leaf', '1 мин', 'Сменить вкус и завершить старый ритуал', null, 'oral', 'C', 'Поведенческая эвристика ALIVE', null, 'Сменить вкус и завершить старый ритуал', 2, 0.9, 1, 10, array['after_meal','coffee']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('nuts_small', 'Небольшая порция орехов', 'Если голоден, возьми небольшую заранее отмеренную порцию орехов и убери упаковку.', 'food', array['oral_sensory','pleasure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 229, 'leaf', '3 мин', 'Плотный вариант при голоде без бесконечного перекуса', 'Не использовать при аллергии; учитывать индивидуальные ограничения', 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Плотный вариант при голоде без бесконечного перекуса', 2, 0.6, 1, 10, array['hunger']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('pear_crunch', 'Груша', 'Если голод есть, выбери небольшую грушу как одну порцию, а не как обязательное заедание тяги.', 'food', array['oral_sensory','pleasure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 221, 'leaf', '3 мин', 'Сочный хрустящий вариант при реальном голоде', null, 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Сочный хрустящий вариант при реальном голоде', 2, 0.75, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('phone_down_pause', 'Две минуты без экрана', 'Положи телефон экраном вниз и две минуты ничего не листай. Можно просто смотреть в окно или сидеть.', 'pause', array['pause','self_presence','release_tension','switch']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "pause"}'::jsonb, true, 230, 'pause', '2 мин', 'Вернуть себе настоящую паузу вместо связки телефон + никотин', null, 'pause', 'C', 'Поведенческая эвристика ALIVE', null, 'Вернуть себе настоящую паузу вместо связки телефон + никотин', 2, 1.1, 1, 10, array['phone','work','evening']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('plain_yogurt', 'Натуральный йогурт', 'Если есть голод, выбери небольшую порцию натурального йогурта.', 'food', array['pleasure','oral_sensory']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 226, 'leaf', '4 мин', 'Более насыщающий вариант при реальном голоде', 'Учитывай личную переносимость молочных продуктов', 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Более насыщающий вариант при реальном голоде', 2, 0.7, 1, 10, array['hunger']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('press_release', 'Надавить и отпустить', 'Ладони на бёдра или стопы в пол. Надави уверенно на 5 секунд и полностью отпусти. Сделай 4 повтора.', 'grounding', array['release_tension','switch','self_presence']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "grounding"}'::jsonb, true, 202, 'hands', '45 сек', 'Коротко собрать границы тела и отпустить напряжение', 'Без боли; дыши обычно', 'grounding', 'C', 'Self-regulation эвристика ALIVE, адаптированная из HumanOS', null, 'Коротко собрать границы тела и отпустить напряжение', 2, 1, 1, 10, array['stress','anger','anxiety']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('shoulder_release', 'Плечи и челюсть', 'Опусти плечи, разожми зубы и на несколько секунд отпусти язык от нёба. Сделай обычный спокойный выдох.', 'grounding', array['release_tension','pause']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "grounding"}'::jsonb, true, 207, 'calm', '40 сек', 'Убрать часть незаметного мышечного напряжения', 'Не тянуть шею через боль', 'grounding', 'C', 'Self-regulation эвристика ALIVE', null, 'Убрать часть незаметного мышечного напряжения', 2, 1, 1, 10, array['work','driving','stress']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('sparkling_water', 'Газированная вода', 'Сделай несколько маленьких глотков прохладной газированной воды и сосредоточься на ощущениях во рту.', 'drink', array['oral_sensory','switch','pleasure','pause']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "drink"}'::jsonb, true, 210, 'tea', '1 мин', 'Яркий сенсорный ритуал без дыма', null, 'drink', 'C', 'Поведенческая эвристика ALIVE', 'напиток', 'Яркий сенсорный ритуал без дыма', 1, 0.9, 1, 10, array['oral','after_meal','coffee']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('stairs_one_flight', 'Один пролёт', 'Если лестница тебе подходит, спокойно пройди один пролёт вверх и обратно.', 'movement', array['stimulation','switch']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "B", "mechanism": "movement"}'::jsonb, true, 209, 'walk', '2 мин', 'Коротко включить тело и сменить ритм', 'Пропусти при боли, одышке, головокружении или если нагрузка тебе не привычна', 'movement', 'B', 'Acute activity может снижать craving; конкретная дозировка ALIVE экспериментальна', 'движение', 'Коротко включить тело и сменить ритм', 3, 0.7, 1, 7, array['low_energy','work']::text[], 'Physical activity and acute cigarette craving evidence', 'https://pubmed.ncbi.nlm.nih.gov/22585034/')
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('sweet_pepper_crunch', 'Сладкий перец', 'Если голод есть, съешь небольшую порцию сладкого перца и обрати внимание на вкус и хруст.', 'food', array['oral_sensory','pleasure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "food", "use_when_hungry": true}'::jsonb, true, 224, 'leaf', '3 мин', 'Яркий несигаретный вкус при реальном голоде', null, 'food', 'C', 'Пищевая эвристика ALIVE', 'еда', 'Яркий несигаретный вкус при реальном голоде', 2, 0.8, 1, 10, array['hunger','oral']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('text_support', 'Одно сообщение человеку', 'Напиши человеку, которому доверяешь: «Сейчас сильная тяга, просто побудь со мной пару минут».', 'contact', array['connection','release_tension']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "social"}'::jsonb, true, 234, 'people', '2 мин', 'Получить контакт напрямую, а не через общий ритуал курения', 'Только если это комфортный и заранее выбранный контакт', 'social', 'C', 'Поведенческая эвристика ALIVE', 'общение', 'Получить контакт напрямую, а не через общий ритуал курения', 3, 0.8, 1, 10, array['social','stress']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('walk_two_minutes', 'Две минуты пройтись', 'Встань и две минуты просто походи — по комнате, коридору или улице. Не тренировка, а смена состояния.', 'movement', array['switch','stimulation','release_tension','pause']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "B", "mechanism": "movement"}'::jsonb, true, 208, 'walk', '2 мин', 'Сменить контекст и дать телу короткое движение', 'Выбирай только привычную и безопасную нагрузку', 'movement', 'B', 'Есть smoking-specific evidence для кратковременного уменьшения craving', 'движение', 'Сменить контекст и дать телу короткое движение', 3, 1.25, 1, 10, array['work','boredom','stress','after_meal']::text[], 'Physical activity and acute cigarette craving evidence', 'https://pubmed.ncbi.nlm.nih.gov/22585034/')
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;
insert into public.replacements_catalog (code,title,instruction,category,need_codes,product_types,eligibility,published,sort_order,icon,duration,summary,safety,mechanism,evidence_level,evidence_scope,category_code,short_action_ru,effort_level,rotation_weight,intensity_min,intensity_max,context_tags,source_title,source_url)
  values ('write_real_need', 'Одна строка о том, что нужно', 'Напиши одну строку: «Сейчас я хочу от сигареты…» и закончи фразу без анализа.', 'journal', array['meaning','release_tension','pause','switch','closure']::text[], array['cigarette','hookah','vape']::text[], '{"evidence_level": "C", "mechanism": "reflection"}'::jsonb, true, 232, 'journal', '1 мин', 'Отделить функцию от привычной формы ритуала', null, 'reflection', 'C', 'Поведенческая эвристика ALIVE', 'мысль', 'Отделить функцию от привычной формы ритуала', 2, 1, 1, 10, array['stress','thinking','spontaneous']::text[], null, null)
  on conflict (code) do update set title=excluded.title, instruction=excluded.instruction, category=excluded.category, need_codes=excluded.need_codes, product_types=excluded.product_types, eligibility=excluded.eligibility, published=excluded.published, sort_order=excluded.sort_order, icon=excluded.icon, duration=excluded.duration, summary=excluded.summary, safety=excluded.safety, mechanism=excluded.mechanism, evidence_level=excluded.evidence_level, evidence_scope=excluded.evidence_scope, category_code=excluded.category_code, short_action_ru=excluded.short_action_ru, effort_level=excluded.effort_level, rotation_weight=excluded.rotation_weight, intensity_min=excluded.intensity_min, intensity_max=excluded.intensity_max, context_tags=excluded.context_tags, source_title=excluded.source_title, source_url=excluded.source_url;

-- 2. Replacements whose wording was changed directly in production (6).
update public.replacements_catalog set
  title='Одна порция фруктов', instruction='Выбери одну обычную порцию фрукта. ALIVE не будет предлагать еду при каждой тяге и учитывает время суток.', category='food', need_codes=array['pleasure','oral_sensory']::text[], product_types=array['cigarette','vape']::text[],
  sort_order=70, icon='🍎', duration='2–5 мин', summary='Пищевой вариант с дневным лимитом предложений, чтобы не превращать тягу в заедание.', safety=null
 where code='fruit_portion';
update public.replacements_catalog set
  title='Прочитать своё «Зачем»', instruction='Открой своё «Зачем» и прочитай одну формулировку, которая сегодня действительно откликается. Не убеждай себя — просто вспомни направление.', category='meaning', need_codes=array['meaning','self_presence','closure']::text[], product_types=array['cigarette','hookah','vape']::text[],
  sort_order=240, icon='∞', duration='20–40 сек', summary='Вернуться от короткого импульса к выбранной жизни.', safety='Если формулировка раздражает, не спорь с собой: выбери другую замену.'
 where code='meaning_card';
update public.replacements_catalog set
  title='Прочитать своё «Зачем»', instruction='Открой свои причины свободы от зависимости и прочитай их медленно как собственный выбор, а не лозунг.', category='meaning', need_codes=array['meaning']::text[], product_types=array['cigarette','vape','hookah']::text[],
  sort_order=60, icon=null, duration=null, summary='Вернуться к личной причине не идти за автоматическим импульсом.', safety=null
 where code='meaning_read';
update public.replacements_catalog set
  title='Никотиновая жвачка', instruction='Используй согласно инструкции своего препарата. ALIVE не назначает дозировку и не считает NRT курением.', category='nrt', need_codes=array['oral_sensory','release_tension']::text[], product_types=array['cigarette']::text[],
  sort_order=110, icon='НЗТ', duration='по инструкции', summary='Никотин-заместительная терапия — помощь при отказе от курения, а не срыв.', safety=null
 where code='nrt_gum';
update public.replacements_catalog set
  title='Никотиновый спрей', instruction='Используй только согласно инструкции своего препарата или рекомендации специалиста. В ALIVE это помощь, а не срыв.', category='nrt', need_codes=array['release_tension','oral_sensory']::text[], product_types=array['cigarette']::text[],
  sort_order=100, icon='НЗТ', duration='по инструкции', summary='Никотин-заместительная терапия — помощь при отказе от курения, а не срыв.', safety=null
 where code='nrt_spray';
update public.replacements_catalog set
  title='Сенсорная перезагрузка', instruction='Назови 5 вещей, которые видишь, 3 звука, которые слышишь, почувствуй обе стопы и сделай один длинный спокойный выдох.', category='orienting', need_codes=array['release_tension','pause','self_presence']::text[], product_types=array['cigarette','hookah','vape']::text[],
  sort_order=90, icon='◉', duration='1–2 мин', summary='Вернуть внимание из внутреннего напряжения в конкретные ощущения вокруг.', safety='Если внимание к телу усиливает тревогу — вернись к внешним объектам.'
 where code='sensory_reset';

-- 3. Evidence and curation metadata for the replacements that already existed here (45).
update public.replacements_catalog set
  mechanism='sensory', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='музыка',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "sensory"}'::jsonb
 where code='audiobook';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='внимание',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['перегруз','автоматизм','нужна пауза']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='beautiful_view';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='наблюдение',
  short_action_ru=summary, effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='body_locate';
update public.replacements_catalog set
  mechanism='reflection', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='мысль',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reflection"}'::jsonb
 where code='boundary_note';
update public.replacements_catalog set
  mechanism='sensory', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='музыка',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['эмоции','удовольствие','переключение']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "sensory"}'::jsonb
 where code='calm_music';
update public.replacements_catalog set
  mechanism='pause', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='отдых',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "pause"}'::jsonb
 where code='calm_reading';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='core_brace';
update public.replacements_catalog set
  mechanism='pause', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='отдых',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "pause"}'::jsonb
 where code='dim_light_pause';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='наблюдение',
  short_action_ru=summary, effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['перегруз','автоматизм','нужна пауза']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='empty_pause';
update public.replacements_catalog set
  mechanism='sensory', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='музыка',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['эмоции','удовольствие','переключение']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "sensory"}'::jsonb
 where code='favorite_song';
update public.replacements_catalog set
  mechanism='reward', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='награда',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reward"}'::jsonb
 where code='five_min_rest';
update public.replacements_catalog set
  mechanism='food', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='еда',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"max_daily": 2, "mechanism": "food", "evidence_level": "C", "respect_fruit_cutoff": true}'::jsonb
 where code='fruit_portion';
update public.replacements_catalog set
  mechanism='meaning', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='зачем',
  short_action_ru=summary, effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['мотивация','ценности','награда']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "meaning"}'::jsonb
 where code='future_resource';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='glute_bridge';
update public.replacements_catalog set
  mechanism='ritual', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='ритуал',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "ritual"}'::jsonb
 where code='herbal_evening';
update public.replacements_catalog set
  mechanism='food', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='еда',
  short_action_ru='Кефир', effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"max_daily": 1, "mechanism": "food", "evidence_level": "C"}'::jsonb
 where code='kefir';
update public.replacements_catalog set
  mechanism='breathing', evidence_level='B', evidence_scope='Поддержка состояния/arousal; long-term smoking cessation outcome не установлен', category_code='дыхание',
  short_action_ru='90 секунд длинного выдоха', effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Brief structured respiration practices and mood/arousal', source_url='https://pubmed.ncbi.nlm.nih.gov/36630953/', eligibility='{"evidence_level": "B", "mechanism": "breathing"}'::jsonb
 where code='long_exhale';
update public.replacements_catalog set
  mechanism='meaning', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='зачем',
  short_action_ru=summary, effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['мотивация','ценности','награда']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "meaning"}'::jsonb
 where code='meaning_card';
update public.replacements_catalog set
  mechanism='meaning', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='зачем',
  short_action_ru='Прочитать свои Смыслы', effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "meaning"}'::jsonb
 where code='meaning_read';
update public.replacements_catalog set
  mechanism='social', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='общение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['общение','близость','социальное']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "social"}'::jsonb
 where code='message_person';
update public.replacements_catalog set
  mechanism='ritual', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='ритуал',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "ritual"}'::jsonb
 where code='mouth_reset';
update public.replacements_catalog set
  mechanism='reflection', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='мысль',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['мысль','работа','переход']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reflection"}'::jsonb
 where code='next_step';
update public.replacements_catalog set
  mechanism='evidence_treatment', evidence_level='A', evidence_scope='Доказательный инструмент прекращения курения; ALIVE не назначает дозировки', category_code='лечение',
  short_action_ru='NRT — помощь при отказе от курения, а не срыв.', effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['сильная тяга','лечение','сигареты']::text[],
  source_title='WHO Clinical Treatment Guideline for Tobacco Cessation in Adults 2024', source_url='https://www.who.int/publications/i/item/9789240096431', eligibility='{"evidence_level": "A", "mechanism": "evidence_treatment"}'::jsonb
 where code='nrt_gum';
update public.replacements_catalog set
  mechanism='evidence_treatment', evidence_level='A', evidence_scope='Доказательный инструмент прекращения курения; ALIVE не назначает дозировки', category_code='лечение',
  short_action_ru='NRT — помощь при отказе от курения, а не срыв.', effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['сильная тяга','лечение','сигареты']::text[],
  source_title='WHO Clinical Treatment Guideline for Tobacco Cessation in Adults 2024', source_url='https://www.who.int/publications/i/item/9789240096431', eligibility='{"evidence_level": "A", "mechanism": "evidence_treatment"}'::jsonb
 where code='nrt_spray';
update public.replacements_catalog set
  mechanism='reflection', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='мысль',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['мысль','работа','переход']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reflection"}'::jsonb
 where code='one_line_conclusion';
update public.replacements_catalog set
  mechanism='reflection', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='мысль',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['мысль','работа','переход']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reflection"}'::jsonb
 where code='one_line_question';
update public.replacements_catalog set
  mechanism='food', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='еда',
  short_action_ru='Протеиновый напиток', effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"max_daily": 1, "mechanism": "food", "evidence_level": "C"}'::jsonb
 where code='protein_drink';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['нужно переключиться','напряжение','можно двигаться']::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='safe_stop';
update public.replacements_catalog set
  mechanism='social', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='общение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['общение','близость','социальное']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "social"}'::jsonb
 where code='savor_conversation';
update public.replacements_catalog set
  mechanism='reward', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='награда',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reward"}'::jsonb
 where code='savor_result';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='scapular_retractions';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='внимание',
  short_action_ru='Снизить фоновую раздражительность через ориентирование, а не борьбу.', effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['перегруз','автоматизм','нужна пауза']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='sensory_reset';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['нужно переключиться','напряжение','можно двигаться']::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='short_walk';
update public.replacements_catalog set
  mechanism='social', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='общение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['общение','близость','социальное']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "social"}'::jsonb
 where code='stay_close';
update public.replacements_catalog set
  mechanism='drink', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='напиток',
  short_action_ru='Чай как отдельная пауза', effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "drink"}'::jsonb
 where code='tea_pause';
update public.replacements_catalog set
  mechanism='ritual', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='ритуал',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "ritual"}'::jsonb
 where code='tea_ritual';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='внимание',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['перегруз','автоматизм','нужна пауза']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='three_details';
update public.replacements_catalog set
  mechanism='attention', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='наблюдение',
  short_action_ru=summary, effort_level=1, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "attention"}'::jsonb
 where code='urge_observe';
update public.replacements_catalog set
  mechanism='context_change', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='среда',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['вейп','автоматическое обращение','доступность']::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "context_change"}'::jsonb
 where code='vape_out_of_reach';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags=array['нужно переключиться','напряжение','можно двигаться']::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='walk';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='wall_press';
update public.replacements_catalog set
  mechanism='movement', evidence_level='B', evidence_scope='Есть данные по кратковременному снижению тяги; не самостоятельная гарантия отказа', category_code='движение',
  short_action_ru=summary, effort_level=3, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title='Physical activity and acute cigarette craving evidence', source_url='https://pubmed.ncbi.nlm.nih.gov/22585034/', eligibility='{"evidence_level": "B", "mechanism": "movement"}'::jsonb
 where code='wall_pushups';
update public.replacements_catalog set
  mechanism='reward', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='награда',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "reward"}'::jsonb
 where code='warm_shower';
update public.replacements_catalog set
  mechanism='ritual', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='ритуал',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "ritual"}'::jsonb
 where code='water_gum_drive';
update public.replacements_catalog set
  mechanism='ritual', evidence_level='C', evidence_scope='Поведенческая эвристика ALIVE; эффективность проверяется по личным outcomes', category_code='ритуал',
  short_action_ru=summary, effort_level=2, rotation_weight=1,
  intensity_min=null, intensity_max=null, context_tags='{}'::text[],
  source_title=null, source_url=null, eligibility='{"evidence_level": "C", "mechanism": "ritual"}'::jsonb
 where code='water_pause';

-- 4. Trigger categorisation and recognition prompts (production-only).
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru='Это знакомая тяга после еды или сейчас произошло что-то ещё?' where code='after_meal';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='after_sex';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='after_task';
update public.triggers_catalog set category_code='эмоции', recognition_prompt_ru='Что сейчас сильнее: физиологическая тяга или желание быстро изменить состояние?' where code='anger';
update public.triggers_catalog set category_code='эмоции', recognition_prompt_ru=null where code='anxiety';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='before_sleep';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='boredom';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='coffee';
update public.triggers_catalog set category_code='среда', recognition_prompt_ru=null where code='driving';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='evening';
update public.triggers_catalog set category_code='среда', recognition_prompt_ru='Что здесь важнее: сам кальян или вечер, люди и атмосфера?' where code='hookah_venue';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='important_decision';
update public.triggers_catalog set category_code='физиология', recognition_prompt_ru=null where code='insomnia';
update public.triggers_catalog set category_code='эмоции', recognition_prompt_ru='Что сейчас сильнее: физиологическая тяга или желание быстро изменить состояние?' where code='irritability';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='other';
update public.triggers_catalog set category_code='социальное', recognition_prompt_ru=null where code='phone';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='significant_action';
update public.triggers_catalog set category_code='социальное', recognition_prompt_ru='Тебе нужен сам никотин или участие в общем ритуале?' where code='social';
update public.triggers_catalog set category_code='физиология', recognition_prompt_ru=null where code='spontaneous';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='task_reward';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='task_start';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru='Это тяга или привычная точка между двумя делами?' where code='task_transition';
update public.triggers_catalog set category_code='эмоции', recognition_prompt_ru='Что сейчас сильнее: физиологическая тяга или желание быстро изменить состояние?' where code='tension';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru='Тебе сейчас нужен никотин или пространство, чтобы продолжить мысль?' where code='thinking';
update public.triggers_catalog set category_code='переход', recognition_prompt_ru=null where code='thought_complete';
update public.triggers_catalog set category_code='эмоции', recognition_prompt_ru=null where code='uncertainty';
update public.triggers_catalog set category_code='ритуал', recognition_prompt_ru=null where code='wake_up';
update public.triggers_catalog set category_code='среда', recognition_prompt_ru='Ты действительно решил использовать электронку или рука потянулась к ней сама?' where code='work_computer';
