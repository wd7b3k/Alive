-- Переименование продукта в контентном слое: ALIVE → Habitoff.
--
-- ADR-0003 сознательно оставил `alive` в идентификаторах: имена функций, таблиц, колонок
-- и ключевые значения (`alive-method-v1`, `alive-equivalence-v1`) — это контракт с уже
-- работающим продом, и переименовывать их побочным эффектом ребрендинга нельзя.
--
-- Но вместе с идентификаторами тогда осталось и то, что читает человек. В каталогах
-- ~150 строк с «ALIVE» в тексте: «ALIVE использует этот момент как точку вмешательства»
-- в фактах, «В ALIVE счётчик не обнуляется» в разборе мифов, «Пищевая эвристика ALIVE»
-- в 66 описаниях замен. Участник пилота открывает «Факты» и видит другое название
-- продукта — то есть ребрендинг для него не состоялся.
--
-- Заменяется только точный токен `ALIVE` в верхнем регистре. Строчный `alive` в
-- идентификаторах и ключах не затрагивается ни в одной строке: `alive-method-v1`
-- остаётся `alive-method-v1`.
--
-- Библиография (`evidence_sources`) исключена целиком, вместе с полями `source_title`,
-- `source_url`, `doi`, `authors`, `publication`: подменять название чужой публикации
-- нельзя, даже если бы оно совпало.

do $rename$
declare
  target record;
  changed integer;
  total integer := 0;
  touched text := '';
begin
  for target in
    select c.table_name, c.column_name
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.data_type = 'text'
       and c.table_name in (
         'facts_catalog', 'myths_catalog', 'replacements_catalog', 'triggers_catalog',
         'needs_catalog', 'meanings_catalog', 'goals_catalog', 'awareness_content',
         'evidence_claims', 'methodology_versions', 'equivalence_models',
         'supports_catalog', 'identity_scripts_catalog', 'rewards_catalog',
         'replacement_categories_catalog', 'trigger_categories_catalog',
         'analytics_reason_catalog', 'intervention_context_rules')
       -- Идентификаторы, коды и библиография: там переименование было бы порчей данных.
       and c.column_name not in (
         'id', 'code', 'claim_code', 'mechanism_code', 'source_title', 'source_url',
         'url', 'doi', 'authors', 'publication', 'title_original', 'evidence_level',
         'evidence_kind', 'category', 'status', 'content_type', 'goal_type', 'topic')
     order by c.table_name, c.column_name
  loop
    execute format(
      'update public.%I set %I = replace(%I, %L, %L) where %I like %L',
      target.table_name, target.column_name, target.column_name,
      'ALIVE', 'Habitoff', target.column_name, '%ALIVE%');
    get diagnostics changed = row_count;
    if changed > 0 then
      total := total + changed;
      touched := touched || format('%s.%s: %s; ', target.table_name, target.column_name, changed);
    end if;
  end loop;
  raise notice 'Переименовано значений: % (%)', total, touched;
end
$rename$;

-- Проверка. Та же форма, что в 20260824130000: документ описывает, как должно быть,
-- а поймать момент, когда стало иначе, может только проверка в миграции.
--
-- Белый список латиницы здесь отличается от прежнего одним пунктом: `ALIVE` из него
-- убран, `Habitoff` добавлен. Пока старое имя было разрешено, любая будущая правка
-- контента могла вернуть его обратно и не уронить ничего.
do $verify$
declare
  allowed text := '(Habitoff|CDC|JAMA|WHO|Freedom Fund|light|low-tar)';
  leftover text;
  latin text;
begin
  select string_agg(what, '; ') into leftover from (
    select 'facts_catalog.' || code as what from public.facts_catalog
     where coalesce(short_text, '') || coalesce(full_text, '') || coalesce(changes_ru, '') like '%ALIVE%'
    union all
    select 'myths_catalog.' || code from public.myths_catalog
     where coalesce(short_reframe, '') || coalesce(explanation, '') || coalesce(changes_ru, '')
           || coalesce(evidence_scope, '') like '%ALIVE%'
    union all
    select 'replacements_catalog.' || code from public.replacements_catalog
     where coalesce(title, '') || coalesce(instruction, '') || coalesce(summary, '')
           || coalesce(safety, '') || coalesce(mechanism, '') || coalesce(evidence_scope, '') like '%ALIVE%'
    union all
    select 'awareness_content.' || code from public.awareness_content
     where coalesce(title_ru, '') || coalesce(hook_ru, '') || coalesce(explanation_ru, '')
           || coalesce(motivation_ru, '') || coalesce(caveat_ru, '') like '%ALIVE%'
    union all
    select 'evidence_claims.' || code from public.evidence_claims
     where coalesce(claim_ru, '') || coalesce(population_ru, '') || coalesce(limitations_ru, '') like '%ALIVE%'
  ) x;
  if leftover is not null then
    raise exception 'Старое имя осталось в читаемом тексте: %', leftover;
  end if;

  select string_agg(code || ' [' || field || ']', ', ') into latin from (
    select code, 'short_text' field, short_text t from public.facts_catalog
    union all select code, 'full_text', full_text from public.facts_catalog
    union all select code, 'changes_ru', changes_ru from public.facts_catalog
    union all select code, 'short_reframe', short_reframe from public.myths_catalog
    union all select code, 'explanation', explanation from public.myths_catalog
    union all select code, 'changes_ru', changes_ru from public.myths_catalog
  ) y
  where regexp_replace(t, allowed, '', 'gi') ~ '[A-Za-z]';
  if latin is not null then
    raise exception 'В читаемом тексте осталась латиница: %', latin;
  end if;
end
$verify$;
