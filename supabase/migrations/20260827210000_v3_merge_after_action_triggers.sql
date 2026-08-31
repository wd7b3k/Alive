-- Слияние четырёх пусковых контекстов-синонимов в один, 27.08.2026.
--
-- Проблема: в сетке выбора момента человек под тягой видел четыре карточки, которые
-- описывают одно и то же событие — «что-то закончилось»:
--   after_task          «После завершённого дела»
--   task_reward         «После сделанного»
--   significant_action  «После значимого действия»
--   thought_complete    «Мысль закончена»
-- Различить их в 20–90 секунд нельзя, а выбор из четырёх синонимов — прямое нарушение
-- P17 (минимум действий в момент тяги). Решение владельца: собрать в один контекст.
--
-- Выживает after_task: он старше остальных и не несёт лишнего оттенка. Три остальных
-- НЕ удаляются, а снимаются с публикации: на них ссылаются эпизоды и личные Связки
-- людей, и удаление переписало бы историю (P6, P18). Скрытая строка по-прежнему
-- отдаёт своё название старому эпизоду.
--
-- Всё, что было привязано к снятым контекстам — замены, карточки микроосознанности,
-- мифы, — переезжает на выживший, иначе слияние обеднило бы подбор.

do $do$
declare
  retired  text[] := array['task_reward', 'significant_action', 'thought_complete'];
  survivor text := 'after_task';
  n        int;
begin
  -- 1. Выживший контекст берёт на себя весь смысл четырёх.
  update public.triggers_catalog
     set title = 'После сделанного',
         description = 'Дело, шаг или мысль закончены — и это привычно закрывается никотином.',
         product_types = array['cigarette', 'vape', 'hookah']::text[]
   where code = survivor;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Слияние контекстов: строки % нет в triggers_catalog', survivor;
  end if;

  -- 2. Три синонима уходят с экрана, но остаются в базе ради истории эпизодов.
  update public.triggers_catalog set published = false where code = any(retired);
  get diagnostics n = row_count;
  raise notice 'Слияние контекстов: снято с публикации % из 3', n;

  -- 3. Замены, которые подбирались под снятые контексты, переезжают на выживший.
  --    distinct on оставляет самый приоритетный вариант, если один и тот же ответ
  --    был привязан к двум снятым контекстам с разным приоритетом.
  insert into public.trigger_replacement_map (trigger_code, replacement_code, tier, priority)
  select distinct on (m.replacement_code)
         survivor, m.replacement_code, m.tier, m.priority
    from public.trigger_replacement_map m
   where m.trigger_code = any(retired)
   order by m.replacement_code, m.priority
  on conflict (trigger_code, replacement_code) do nothing;

  get diagnostics n = row_count;
  raise notice 'Слияние контекстов: перенесено связей с заменами — %', n;

  -- 4. Карточки микроосознанности, привязанные к снятым моментам.
  -- Уникальность здесь держит не первичный ключ, а индекс по выражениям с coalesce
  -- (20260817170500): trigger_code и product_type стали необязательными. Под такой
  -- индекс `on conflict` по списку колонок не подходит, поэтому дубликаты отсекаются
  -- явной проверкой.
  insert into public.awareness_content_contexts (content_code, trigger_code, product_type, moment, priority)
  select c.content_code, survivor, c.product_type, c.moment, c.priority
    from (
      select distinct on (content_code, product_type, moment)
             content_code, product_type, moment, priority
        from public.awareness_content_contexts
       where trigger_code = any(retired)
       order by content_code, product_type, moment, priority
    ) c
   where not exists (
     select 1
       from public.awareness_content_contexts e
      where e.content_code = c.content_code
        and e.trigger_code is not distinct from survivor
        and e.product_type is not distinct from c.product_type
        and e.moment = c.moment
   );

  get diagnostics n = row_count;
  raise notice 'Слияние контекстов: перенесено привязок микроосознанности — %', n;

  delete from public.awareness_content_contexts where trigger_code = any(retired);

  -- 5. Мифы держат список контекстов массивом: снятые коды заменяются выжившим,
  --    повторы схлопываются.
  update public.myths_catalog
     set trigger_codes = (
           select array_agg(distinct code order by code)
             from unnest(trigger_codes) as code_raw(code_in),
                  lateral (select case when code_in = any(retired) then survivor else code_in end as code) as mapped
         )
   where trigger_codes && retired;

  get diagnostics n = row_count;
  raise notice 'Слияние контекстов: обновлено мифов — %', n;
end
$do$;
