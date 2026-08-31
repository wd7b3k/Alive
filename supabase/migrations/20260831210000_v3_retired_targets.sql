-- Выведенная цель проверки — это не молчащая проверка.
--
-- Состояние ключуется парой «имя проверки + цель»: `tls_days` за один прогон пишет две
-- строки, для habitoff.ru и для www, и сворачивать их по имени нельзя — спрятался бы
-- ровно тот сертификат, который протух.
--
-- Но у этого ключа есть обратная сторона, и 31.08.2026 она обошлась дорого. Когда цель
-- проверки меняется — скрипт стал писать полный адрес вместо имени файла, — прежняя
-- строка остаётся последней для своей цели навсегда. Она не обновляется, стареет и через
-- два периода читается как «молчит». Одна такая строка сделала часть «Веб-приложение»
-- молчащей, а общий вердикт — «неизвестно», при полностью исправном сайте и свежих
-- отчётах всех трёх её проверок.
--
-- Различить эти два случая можно, и признак простой: если сама проверка продолжает
-- отчитываться, а конкретная цель в её прогонах больше не появляется — цель выведена.
-- Если же молчит проверка целиком, молчат и все её цели, и тогда «молчит» — правда.
--
-- Отсюда правило: цель учитывается, пока её последний отчёт не отстал от самого свежего
-- отчёта этой же проверки больше чем на два периода. Порог тот же, что у `stale`, и это
-- не совпадение: пока цель укладывается в срок отчёта, она живая.
--
-- Что это НЕ делает: не прячет умолкшую проверку. Если перестанет отчитываться
-- `build_fingerprint` целиком, самым свежим её отчётом станет старый, все цели
-- останутся внутри окна и покажутся как `stale`. Слепое пятно не появляется.

create or replace view ops.check_state as
with latest as (
  select distinct on (r.check_name, coalesce(r.target, ''))
         r.check_name, r.target, r.status, r.latency_ms, r.value, r.detail, r.observed_at
  from ops.check_results r
  where r.observed_at >= ops.observations_since()
  order by r.check_name, coalesce(r.target, ''), r.observed_at desc
),
freshest as (
  select l.check_name, max(l.observed_at) as at
  from latest l
  group by l.check_name
),
live as (
  select l.*
  from latest l
  join freshest f on f.check_name = l.check_name
  left join ops.check_catalog c on c.check_name = l.check_name
  -- Период неизвестен только у проверок вне каталога; для них сутки — осознанно
  -- щедрый срок: лучше показать лишнюю строку, чем спрятать неописанную проверку.
  where l.observed_at >= f.at - make_interval(
          secs => coalesce(c.period_seconds, 86400) * ops.stale_factor())
)
select
  coalesce(k.check_name, l.check_name) as check_name,
  l.target,
  k.component_id,
  coalesce(k.title, k.check_name, l.check_name) as title,
  coalesce(
    k.hint,
    'Проверка пишет в ops.check_results, но не описана в ops.check_catalog: что она означает — неизвестно.'
  ) as hint,
  k.unit,
  k.period_seconds,
  coalesce(k.sort_order, 999) as sort_order,
  l.value,
  l.latency_ms,
  coalesce(l.detail->>'note', nullif(l.detail::text, '{}')) as note,
  l.observed_at,
  extract(epoch from now() - l.observed_at)::integer as age_seconds,
  case
    when l.observed_at is null then 'silent'
    when k.period_seconds is not null
     and now() - l.observed_at
         > make_interval(secs => k.period_seconds * ops.stale_factor()) then 'stale'
    else l.status
  end as status
from ops.check_catalog k
full join live l on l.check_name = k.check_name;

comment on view ops.check_state is
  'Последнее известное состояние каждой проверки. Цели, выведенные из обихода, не считаются молчащими.';
