-- Одна библиография вместо трёх встроенных.
--
-- Сейчас источник живёт тремя разными способами одновременно:
--   * `evidence_sources` — настоящая библиография: тип, оригинальное название, русская
--     подпись, авторы, издание, дата, DOI. 18 строк, никем не используется;
--   * `facts_catalog` и `myths_catalog` — пара колонок `source_title` / `source_url`
--     прямо на карточке;
--   * `replacements_catalog` — такая же пара на каждой замене.
--
-- Совпадений между первым и остальными почти нет: из 38 карточек только четыре ссылаются
-- на документ, который есть в библиографии. То есть один и тот же продукт цитирует
-- источники двумя несвязанными способами, и если завтра ссылка на CDC умрёт, чинить её
-- придётся в трёх местах, а найти все три можно только помня, что они есть.
--
-- Здесь это сводится к одному месту. Встроенные пары переезжают в `evidence_sources`,
-- на каталогах остаётся внешний ключ, а колонки-дубликаты удаляются — иначе через месяц
-- кто-нибудь поправит текст в одной из них, и разойдётся уже не схема, а факты.
--
-- Удаление колонок — необратимая операция, поэтому все три таблицы сначала снимаются в
-- резервные копии, и миграция целиком идёт одной транзакцией: либо переносится всё, либо
-- не меняется ничего.

begin;

-- ---------------------------------------------------------------------------
-- Точки отката
-- ---------------------------------------------------------------------------
create table if not exists public.facts_catalog_backup_20260825 as select * from public.facts_catalog;
create table if not exists public.myths_catalog_backup_20260825 as select * from public.myths_catalog;
create table if not exists public.replacements_catalog_backup_20260825 as select * from public.replacements_catalog;

alter table public.facts_catalog_backup_20260825 enable row level security;
alter table public.myths_catalog_backup_20260825 enable row level security;
alter table public.replacements_catalog_backup_20260825 enable row level security;
revoke all on public.facts_catalog_backup_20260825 from anon, authenticated;
revoke all on public.myths_catalog_backup_20260825 from anon, authenticated;
revoke all on public.replacements_catalog_backup_20260825 from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Перенос встроенных ссылок в библиографию
-- ---------------------------------------------------------------------------
-- `url` в `evidence_sources` уникален — он и работает ключом склейки. Две карточки,
-- ссылающиеся на один документ под разными названиями, после этого ссылаются на одну
-- строку: именно это и требовалось.
--
-- `source_type` заполняется значением «публикация»: точный тип у встроенных ссылок
-- никогда не хранился, и придумывать его за редактора здесь неуместно. Уточнить можно
-- в самой библиографии, одним местом на все карточки — ради чего всё и делается.
insert into public.evidence_sources (source_type, title_original, source_label_ru, url, doi)
select 'публикация', x.title, x.title, x.url, min(x.doi)
  from (
    select source_title as title, source_url as url, doi from public.facts_catalog
     where source_url is not null and btrim(source_url) <> ''
    union all
    select source_title, source_url, doi from public.myths_catalog
     where source_url is not null and btrim(source_url) <> ''
    union all
    -- у замен DOI никогда не было: такой колонки в каталоге нет
    select source_title, source_url, null::text from public.replacements_catalog
     where source_url is not null and btrim(source_url) <> ''
  ) x
 where not exists (select 1 from public.evidence_sources s where s.url = x.url)
 group by x.url, x.title
on conflict (url) do nothing;

-- ---------------------------------------------------------------------------
-- Внешний ключ на каталогах
-- ---------------------------------------------------------------------------
-- on delete restrict, а не set null: источник, на который кто-то ссылается, нельзя
-- удалить незаметно. Карточка уровня A, внезапно оставшаяся без источника, — это
-- утверждение о здоровье без основания, и такое должно ломать удаление, а не проходить.
alter table public.facts_catalog add column if not exists source_id uuid
  references public.evidence_sources(id) on delete restrict;
alter table public.myths_catalog add column if not exists source_id uuid
  references public.evidence_sources(id) on delete restrict;
alter table public.replacements_catalog add column if not exists source_id uuid
  references public.evidence_sources(id) on delete restrict;

update public.facts_catalog f set source_id = s.id
  from public.evidence_sources s where s.url = f.source_url and f.source_id is null;
update public.myths_catalog m set source_id = s.id
  from public.evidence_sources s where s.url = m.source_url and m.source_id is null;
update public.replacements_catalog r set source_id = s.id
  from public.evidence_sources s where s.url = r.source_url and r.source_id is null;

create index if not exists facts_catalog_source_idx on public.facts_catalog (source_id);
create index if not exists myths_catalog_source_idx on public.myths_catalog (source_id);
create index if not exists replacements_catalog_source_idx on public.replacements_catalog (source_id);

-- ---------------------------------------------------------------------------
-- Проверки перед удалением колонок
-- ---------------------------------------------------------------------------
do $$
declare
  lost text;
  disagreeing text;
begin
  -- Ни одна строка со ссылкой не должна остаться без source_id. Если такое есть —
  -- перенос не сработал, и удалять колонки нельзя ни в коем случае.
  select string_agg(what, '; ') into lost from (
    select 'факт ' || code as what from public.facts_catalog
     where source_url is not null and btrim(source_url) <> '' and source_id is null
    union all
    select 'миф ' || code from public.myths_catalog
     where source_url is not null and btrim(source_url) <> '' and source_id is null
    union all
    select 'замена ' || code from public.replacements_catalog
     where source_url is not null and btrim(source_url) <> '' and source_id is null
  ) x;
  if lost is not null then
    raise exception 'Ссылка не перенеслась в библиографию: %', lost;
  end if;

  -- Карточка уровня A или B без источника — утверждение о здоровье, за которым ничего
  -- не стоит. Уровень C — честный «это приём ALIVE», ему источник не нужен.
  select string_agg(what, '; ') into lost from (
    select 'факт ' || code as what from public.facts_catalog
     where published and evidence_level in ('A', 'B') and source_id is null
    union all
    select 'миф ' || code from public.myths_catalog
     where published and evidence_level in ('A', 'B') and source_id is null
  ) y;
  if lost is not null then
    raise exception 'Опубликованная карточка уровня A или B осталась без источника: %', lost;
  end if;

  -- Один документ под разными названиями — не ошибка, но редактор должен об этом знать:
  -- в библиографии осталось то название, что пришло первым.
  select string_agg(distinct u, ', ') into disagreeing from (
    select source_url as u from (
      select source_url, source_title from public.facts_catalog where source_url is not null
      union all select source_url, source_title from public.myths_catalog where source_url is not null
      union all select source_url, source_title from public.replacements_catalog where source_url is not null
    ) z group by source_url having count(distinct source_title) > 1
  ) w;
  if disagreeing is not null then
    raise notice 'Один документ назывался по-разному, в библиографии осталось первое название: %', disagreeing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Удаление дубликатов
-- ---------------------------------------------------------------------------
-- Данные к этому моменту уже в `evidence_sources`, а исходные строки — в резервных
-- таблицах выше.
alter table public.facts_catalog drop column if exists source_title;
alter table public.facts_catalog drop column if exists source_url;
alter table public.facts_catalog drop column if exists doi;
alter table public.myths_catalog drop column if exists source_title;
alter table public.myths_catalog drop column if exists source_url;
alter table public.myths_catalog drop column if exists doi;
alter table public.replacements_catalog drop column if exists source_title;
alter table public.replacements_catalog drop column if exists source_url;

commit;
