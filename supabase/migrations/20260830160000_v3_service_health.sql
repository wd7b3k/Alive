-- Технический мониторинг: раздел, который отвечает «что сейчас с сервисом».
--
-- Проверки живут с 28.08.2026 и пишут в `ops.check_results`. Смотреть на них было
-- негде: строки в схеме, недоступной приложению, — это архив, а не наблюдаемость.
-- Сама схема этот шаг и предполагала: «наружу история попадёт позже и через функцию
-- с проверкой прав, когда появится раздел с доступностью». Здесь она попадает.
--
-- Что здесь добавляется сверх «показать таблицу» — три вещи, и каждая закрывает свой
-- способ соврать.
--
-- 1. СОСТАВ ВМЕСТО ПЛОСКОГО СПИСКА. Двадцать четыре имени проверок ничего не говорят о
--    том, что именно сломалось. У проверки появляется часть сервиса, к которой она
--    относится, а у части — слой: фронт, бэкенд, платформа. Это и есть три уровня, на
--    которые нужно уметь ответить: конкретная служба, бэкенд целиком, фронт целиком.
--
-- 2. МОЛЧАНИЕ ПЕРЕСТАЁТ БЫТЬ ПОХОЖИМ НА «ВСЁ ХОРОШО». У каждой проверки записано, как
--    часто она обязана отчитываться. Не отчиталась втрое дольше срока — это `stale`,
--    отдельный статус, а не последний известный `ok`. Это ровно тот отказ, который
--    `infra/monitoring/lib/common.sh` называет главным способом мониторинга врать, — и
--    до сих пор его нечем было увидеть: остановленный таймер выглядел бы как вечное
--    «ok». Рядом `silent` — проверка описана, но не отчиталась ни разу.
--
-- 3. ФРОНТ — НЕ ОДИН. Владелец 30.08.2026 попросил заранее учесть, что появятся другие
--    фронты: телеграм-бот, мобильное приложение. Поэтому фронт — не зашитый в код
--    «веб», а строка в реестре. У части есть жизненный цикл (`planned` — решена, но не
--    построена; `live` — работает; `retired` — выведена) и список меток, по которым её
--    узнают в телеметрии. Новый фронт заводится строкой в `ops.components` и, если он
--    живёт на сервере, скриптом в `infra/monitoring/checks/` — код экрана не меняется.
--
--    Это единственное место, где здесь строится «на будущее», и построено оно по прямой
--    просьбе владельца: `AGENTS.md` требует для такого гейт, гейтом служит просьба.
--    Планируемая часть показывается словами «ещё нет», а не тревогой, — иначе первый же
--    незаведённый бот сделает сводку красной навсегда.
--
-- Порогов и оценок здесь нет: их ставят сами проверки, а этот слой только собирает.
-- Считает всё база, а не экран: иначе через месяц «сервис работает» будет означать одно
-- в вебе и другое в боте.

-- --------------------------------------------------------------------------------
-- Кто прислал сигнал
-- --------------------------------------------------------------------------------

-- Пока фронт один, «откуда пришла ошибка» и «где в приложении она случилась» —
-- один и тот же вопрос, и `surface` отвечает на оба. С появлением бота и мобильного
-- приложения это разойдётся: `surface` останется экраном, а `client` скажет, чей это
-- экран. Без этой колонки ошибки всех фронтов сложатся в одну кучу, и первый же
-- всплеск будет невозможно отнести к виновнику.
alter table public.system_errors add column if not exists client text;

comment on column public.system_errors.client is
  'Какой фронт прислал ошибку: web, bot_telegram, app_mobile. NULL — запись до появления колонки, то есть веб.';

-- --------------------------------------------------------------------------------
-- Состав сервиса
-- --------------------------------------------------------------------------------

create table if not exists ops.components (
  -- Стабильный код части: web, api, auth, db, gateway, host, backups, bot_telegram…
  id text primary key,
  -- Уровень ответа. Ровно три, потому что вопросов ровно три: «что с этой службой»,
  -- «что с бэкендом», «что с фронтом».
  layer text not null check (layer in ('frontend', 'backend', 'platform')),
  title text not null,
  -- Одна строка человеческими словами: что это и почему оно здесь. Без неё часть не
  -- заводить — экран управления читает не тот, кто писал проверку.
  hint text not null,
  lifecycle text not null default 'live' check (lifecycle in ('live', 'planned', 'retired')),
  -- Отказ этой части означает, что продукт не работает. Влияет только на общий вердикт:
  -- некритичная часть всё равно показывается своим цветом и никуда не прячется.
  critical boolean not null default false,
  -- Метки, по которым сигналы клиента относятся к этой части: `analytics_events.platform`
  -- и `system_errors.client`. Пусто — часть о себе не рассказывает, о ней знают только
  -- проверки с сервера.
  client_match text[] not null default '{}',
  -- Сколько секунд тишины в телеметрии считать отказом. NULL — не следить: у веба на
  -- пилоте из пяти человек тишина ночью означает ночь, а не аварию. У бота, который
  -- обязан отвечать всегда, значение будет.
  client_silent_after_seconds integer
    check (client_silent_after_seconds is null or client_silent_after_seconds > 0),
  sort_order integer not null default 100
);

comment on table ops.components is
  'Из чего состоит сервис: часть, её слой и жизненный цикл. Новый фронт — строка здесь.';

create table if not exists ops.check_catalog (
  check_name text primary key,
  component_id text not null references ops.components (id),
  title text not null,
  -- Что означает проверка и чему в ней нельзя верить. Показывается рядом с числом.
  hint text not null,
  -- Единица измерения `value`, если она есть: «%», «дней», «часов», «секунд», «шт».
  unit text,
  -- Как часто проверка обязана отчитываться. Отсюда берётся порог молчания.
  period_seconds integer not null check (period_seconds > 0),
  sort_order integer not null default 100
);

comment on table ops.check_catalog is
  'Проверка глазами человека: к какой части относится, что означает, как часто обязана отчитываться.';

-- Во сколько раз можно превысить срок отчёта, прежде чем это станет `stale`. Втрое:
-- одиночный пропуск — это перезагрузка или задержка таймера, а не отказ. То же
-- рассуждение, что у порога алерта, где авария уходит со второй неудачи, а не с первой.
create or replace function ops.stale_factor() returns integer
  language sql immutable as 'select 3';

-- Порядок серьёзности. Нужен ровно для одного: свернуть несколько проверок в один статус
-- части, взяв худший. `silent` хуже `stale`: «не отчитывалась ни разу» — это не сбой
-- связи, а невыполненная работа.
create or replace function ops.severity(p_status text) returns integer
  language sql immutable as $fn$
  select case
    -- NULL — это «мнения нет», а не «плохо». Разница видна там, где источник сигнала к
    -- части не приставлен: у веба нет правила тишины в телеметрии, и без этой строки
    -- отсутствие правила складывалось бы в статус «молчит» при исправном сайте.
    when p_status is null then null
    when p_status = 'planned' then 0
    when p_status = 'ok'      then 1
    when p_status = 'warn'    then 2
    when p_status = 'stale'   then 3
    when p_status = 'silent'  then 4
    when p_status = 'fail'    then 5
    else 4
  end;
$fn$;

create or replace function ops.status_of(p_severity integer) returns text
  language sql immutable as $fn$
  select case p_severity
    when 0 then 'planned'
    when 1 then 'ok'
    when 2 then 'warn'
    when 3 then 'stale'
    when 4 then 'silent'
    when 5 then 'fail'
    else 'silent'
  end;
$fn$;

-- --------------------------------------------------------------------------------
-- Текущее состояние
-- --------------------------------------------------------------------------------

-- Последний результат каждой проверки.
--
-- Ключ — пара «имя проверки + цель», а не имя. `tls_days` за один прогон пишется дважды,
-- для habitoff.ru и для www.habitoff.ru; свёртка по имени спрятала бы один из двух
-- сертификатов — и именно протухший, если протухнет он.
--
-- Соединение полное намеренно: проверка, которая пишет в базу, но не описана в каталоге,
-- обязана быть видна, а не исчезнуть. Описанная, но ни разу не отчитавшаяся, — тоже.
create or replace view ops.check_state as
with latest as (
  select distinct on (r.check_name, coalesce(r.target, ''))
         r.check_name, r.target, r.status, r.latency_ms, r.value, r.detail, r.observed_at
  from ops.check_results r
  order by r.check_name, coalesce(r.target, ''), r.observed_at desc
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
full join latest l on l.check_name = k.check_name;

comment on view ops.check_state is
  'Последнее известное состояние каждой проверки, включая не описанные и ни разу не отчитавшиеся.';

-- Что каждая поверхность рассказала о себе сама.
--
-- Источника два, потому что вопроса два: идёт ли сигнал вообще (события) и сколько в нём
-- поломок (ошибки). Окно в тридцать дней — не экономия, а смысл: поверхность, молчавшая
-- месяц, одинаково мертва при любом ответе.
create or replace view ops.surface_state as
with signal as (
  select e.platform as tag, e.occurred_at as at, e.app_version, 'event'::text as kind
  from public.analytics_events e
  where e.occurred_at >= now() - interval '30 days'
  union all
  -- Строки до появления колонки `client` принадлежат вебу: других фронтов тогда не было.
  select coalesce(s.client, 'web'), s.occurred_at, null::text, 'error'
  from public.system_errors s
  where s.occurred_at >= now() - interval '30 days'
)
select
  m.id as component_id,
  count(*) filter (where t.kind = 'event') as signals,
  count(*) filter (where t.kind = 'error') as errors,
  max(t.at) as last_signal_at,
  count(distinct t.app_version) as versions,
  max(t.app_version) as latest_version,
  case
    when m.lifecycle <> 'live' then 'planned'
    when m.client_silent_after_seconds is null then null
    when max(t.at) is null then 'silent'
    when now() - max(t.at)
         > make_interval(secs => m.client_silent_after_seconds) then 'stale'
    else 'ok'
  end as status
from ops.components m
left join signal t on t.tag = any (m.client_match)
where m.client_match <> '{}'
group by m.id, m.lifecycle, m.client_silent_after_seconds;

comment on view ops.surface_state is
  'Телеметрия поверхностей: идёт ли сигнал и сколько в нём ошибок. Для фронтов, которые отчитываются сами.';

-- Состояние части: худшее из того, что о ней известно.
create or replace view ops.component_state as
select
  m.id as component_id,
  m.layer,
  m.title,
  m.hint,
  m.lifecycle,
  m.critical,
  m.sort_order,
  count(s.check_name)::integer as checks_total,
  (count(*) filter (where s.status = 'fail'))::integer as checks_failing,
  (count(*) filter (where s.status = 'warn'))::integer as checks_warning,
  (count(*) filter (where s.status in ('stale', 'silent')))::integer as checks_silent,
  max(s.observed_at) as last_seen,
  (array_agg(s.title order by ops.severity(s.status) desc, s.sort_order, s.check_name))[1]
    as worst_check,
  ops.status_of(
    greatest(
      case
        when m.lifecycle <> 'live' then 0
        -- Живая часть, о которой нет ни одной проверки и ни одного сигнала, — это слепое
        -- пятно, а не благополучие.
        when count(s.check_name) = 0 and f.status is null then 4
        else coalesce(max(ops.severity(s.status)), 1)
      end,
      coalesce(ops.severity(f.status), 0)
    )
  ) as status
from ops.components m
left join ops.check_state s on s.component_id = m.id
left join ops.surface_state f on f.component_id = m.id
group by m.id, m.layer, m.title, m.hint, m.lifecycle, m.critical, m.sort_order, f.status;

comment on view ops.component_state is
  'Свёртка проверок и телеметрии в один статус части сервиса.';

revoke all on ops.components from public;
revoke all on ops.check_catalog from public;
revoke all on ops.check_state from public;
revoke all on ops.surface_state from public;
revoke all on ops.component_state from public;
revoke all on function ops.severity(text) from public;
revoke all on function ops.status_of(integer) from public;
revoke all on function ops.stale_factor() from public;

-- --------------------------------------------------------------------------------
-- Из чего состоит сервис
-- --------------------------------------------------------------------------------

insert into ops.components
  (id, layer, title, hint, lifecycle, critical, client_match, client_silent_after_seconds, sort_order)
values
  ('web', 'frontend', 'Веб-приложение',
   'То, что открывается в браузере. Проверяется снаружи — как его видит посетитель, а не как он лежит на диске.',
   'live', true, array['web', 'desktop-web', 'mobile-web', 'desktop-installed', 'mobile-installed'], null, 10),

  ('bot_telegram', 'frontend', 'Телеграм-бот',
   'Решение о боте принято, бота нет. Строка стоит заранее, чтобы день его появления не потребовал править экран: заводится проверка и метка телеметрии, дальше всё само.',
   'planned', false, array['bot_telegram'], 900, 20),

  ('app_mobile', 'frontend', 'Мобильное приложение',
   'То же самое: место занято заранее. Приложение отчитывается о себе метками ios и android — сервер опросить его не может.',
   'planned', false, array['app_mobile', 'ios', 'android'], 86400, 30),

  ('gateway', 'backend', 'Шлюз',
   'Caddy: принимает все запросы и раздаёт их дальше. Видит то, чего не видит проверка одной точки, — например, что главная отвечает, а запись эпизода сыплется.',
   'live', true, array[]::text[], null, 40),

  ('api', 'backend', 'Чтение и запись данных',
   'PostgREST: через него приложение ходит в базу. Сюда же отнесена страховка приватности — обещание продукта проверяется там же, где работоспособность.',
   'live', true, array[]::text[], null, 50),

  ('auth', 'backend', 'Вход',
   'GoTrue и собственный мост входа через Яндекс. Отказ здесь не роняет сайт: он не пускает людей внутрь, и снаружи это выглядит как исправный продукт.',
   'live', true, array[]::text[], null, 60),

  ('db', 'backend', 'База данных',
   'Postgres. Всё остальное — способы до неё добраться.',
   'live', true, array[]::text[], null, 70),

  ('containers', 'platform', 'Контейнеры',
   'Семь служб Supabase. Отказ контейнера виден в той службе, которую он обслуживает; здесь он объясняет причину, а не объявляет аварию, — поэтому часть не критичная.',
   'live', false, array[]::text[], null, 80),

  ('host', 'platform', 'Машина',
   'Диск, память, swap, нагрузка. Всё это кончается медленно и убивает базу первой — предупреждение, а не авария.',
   'live', false, array[]::text[], null, 90),

  ('domain', 'platform', 'Домен и сертификаты',
   'Сроки. Оба кончаются молча и роняют сайт целиком, но за недели вперёд — поэтому здесь важен не отказ, а запас времени.',
   'live', false, array[]::text[], null, 100),

  ('backups', 'platform', 'Бэкапы',
   'Свежесть дампа, его размер, отправка наружу и давность проверки восстановления. Бэкап, который никто не восстанавливал, — это файл, а не бэкап.',
   'live', false, array[]::text[], null, 110)
on conflict (id) do update set
  layer = excluded.layer,
  title = excluded.title,
  hint = excluded.hint,
  lifecycle = excluded.lifecycle,
  critical = excluded.critical,
  client_match = excluded.client_match,
  client_silent_after_seconds = excluded.client_silent_after_seconds,
  sort_order = excluded.sort_order;

-- --------------------------------------------------------------------------------
-- Что означает каждая проверка
-- --------------------------------------------------------------------------------
--
-- Периоды взяты из групп таймеров: fast — раз в минуту, slow — раз в пять минут,
-- daily — раз в сутки. Если группа проверки поменяется в `run-check.sh`, поменять надо
-- и здесь, иначе экран начнёт называть исправную проверку молчащей.

insert into ops.check_catalog
  (check_name, component_id, title, hint, unit, period_seconds, sort_order)
values
  -- unit описывает `value`; у проверок доступности значение — это задержка, и она
  -- лежит в своей колонке. Единица здесь означала бы число, которого нет.
  ('apex_http', 'web', 'Главная отвечает',
   'Запрос к habitoff.ru снаружи. Меряется время до первого байта — то, что человек чувствует как «открылось».',
   null, 60, 10),
  ('www_redirect', 'web', 'www уводит на основной адрес',
   'Два работающих адреса вместо одного — это разъезжающиеся ссылки и поисковая выдача пополам.',
   null, 60, 20),
  ('build_fingerprint', 'web', 'Отдаётся то, что выложено',
   'Коммит в живом version.json сверяется с тем, на который указывает симлинк. Расхождение означает, что выкладка оборвалась на середине.',
   null, 60, 30),

  ('caddy_5xx', 'gateway', 'Доля пятисотых',
   'За последние пять минут по журналу шлюза. Ноль запросов за окно — тоже ok: ночью на пилоте это норма, а не тишина в мониторинге.',
   '%', 300, 10),

  ('rest_catalog', 'api', 'Каталог читается ключом anon',
   'То же, что делает браузер посетителя до входа. Проверяется не только код ответа, но и непустота: пустой каталог отдаётся с тем же 200.',
   null, 60, 10),
  ('rls_canary', 'api', 'Чужие записи закрыты',
   'Anon пробует прочитать личную таблицу и обязан получить отказ. Единственная проверка, которая следит не за работоспособностью, а за обещанием продукта: одна неудачная миграция снимает политику и открывает чужие записи.',
   null, 300, 20),

  ('auth_health', 'auth', 'Служба входа отвечает',
   'Запрос к GoTrue с ключом проекта. Без ключа шлюз отвечает отказом раньше самой службы — и проверка сообщала бы о поломке входа при исправном входе.',
   null, 60, 10),
  ('yandex_bridge', 'auth', 'Мост Яндекса уводит к провайдеру',
   'Собственный мост входа обязан ответить перенаправлением на oauth.yandex.ru. Сверяется и код, и адрес назначения: перенаправление не туда — это не вход.',
   null, 60, 20),

  ('postgres', 'db', 'Занятость соединений',
   'Доля занятых соединений от максимума. Упереться в потолок — значит перестать отвечать всем сразу.',
   '%', 300, 10),
  ('postgres_longest_query', 'db', 'Самый долгий запрос',
   'Предвестник исчерпания соединений, а не самостоятельная беда: один застрявший запрос держит своё соединение и тянет за собой очередь.',
   'секунд', 300, 20),

  ('containers', 'containers', 'Здоровые контейнеры',
   'Сколько служб Supabase в состоянии running и healthy. Меньше семи — что-то не поднялось.',
   'шт', 300, 10),
  ('container_restarts', 'containers', 'Петля перезапусков',
   'Контейнер, перезапустившийся больше трёх раз. Растущее число — это падение, которое само себя лечит и потому невидимо.',
   null, 300, 20),

  ('host_disk_root', 'host', 'Системный диск',
   'Занято места на корневом разделе. Считаются и inode: место бывает, а номеров файлов нет.',
   '%', 300, 10),
  ('host_disk_db', 'host', 'Диск под данными базы',
   'Тот же замер для каталога данных Postgres. Разделы могут быть разными, и кончиться может любой.',
   '%', 300, 20),
  ('host_memory', 'host', 'Память',
   'Занято от общего объёма. Считается MemAvailable, а не free: кэш страниц отдаётся под нагрузку и памятью не занят.',
   '%', 300, 30),
  ('host_swap', 'host', 'Swap',
   'Swap в деле на сервере с базой — это уже деградация, даже когда всё «работает».',
   '%', 300, 40),
  ('host_load', 'host', 'Средняя нагрузка',
   'Минутное среднее против числа ядер. Само по себе не отказ: показывает, есть ли запас.',
   null, 300, 50),

  ('tls_days', 'domain', 'Запас у сертификата',
   'Дней до истечения. Проверяются оба адреса — основной и www, у каждого свой сертификат.',
   'дней', 86400, 10),
  ('domain_days', 'domain', 'Запас у регистрации домена',
   'Дней до конца оплаченного срока по ответу whois. Домен кончается тише сертификата и роняет всё сразу.',
   'дней', 86400, 20),

  ('backups_age', 'backups', 'Возраст последнего дампа',
   'Часов с момента снятия. Больше суток с запасом — значит суточная задача не отработала.',
   'часов', 86400, 10),
  ('backups_size', 'backups', 'Размер против предыдущего',
   'Резкое падение — признак того, что дамп снялся с пустой или частичной базы. Файл есть, данных в нём нет.',
   '%', 86400, 20),
  ('backups_offsite', 'backups', 'Копия уехала наружу',
   'Часов с последней успешной отправки. Сервер, потерявший диск, уносит с собой и локальные копии.',
   'часов', 86400, 30),
  ('backups_outbox', 'backups', 'Очередь отправки',
   'Пакетов, застрявших неотправленными. Копятся — значит отправка не проходит, а сообщение о неудаче было один раз и в тот день.',
   'шт', 86400, 40),
  ('backups_restore_test', 'backups', 'Давность проверки восстановления',
   'Дней с последнего разворачивания дампа. Метку ставит скрипт проверки, а не человек и не эта проверка.',
   'дней', 86400, 50)
on conflict (check_name) do update set
  component_id = excluded.component_id,
  title = excluded.title,
  hint = excluded.hint,
  unit = excluded.unit,
  period_seconds = excluded.period_seconds,
  sort_order = excluded.sort_order;

-- --------------------------------------------------------------------------------
-- Двери наружу
-- --------------------------------------------------------------------------------
--
-- Пять функций, каждая с проверкой роли внутри — тот же порядок, что у витрин
-- аналитики. Схема `ops` не отдаётся через PostgREST и остаётся не отданной: наружу
-- ходит функция, а не таблица.
--
-- Все ссылки на колонки квалифицированы префиксом. Это не стиль: имена выходных
-- параметров `returns table` становятся переменными внутри тела, и неквалифицированная
-- ссылка на одноимённую колонку — та самая ошибка, из-за которой четыре витрины
-- аналитики падали при первом же вызове (миграция 20260830140000).

create or replace function public.admin_service_summary(p_hours integer default 24)
returns table (
  status text,
  worst_component text,
  window_hours integer,
  generated_at timestamptz,
  components_live integer,
  components_failing integer,
  components_warning integer,
  components_silent integer,
  components_planned integer,
  checks_total integer,
  checks_unregistered integer,
  uptime_pct numeric
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := now() - make_interval(hours => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_summary доступна только администраторам приложения';
  end if;

  return query
  with parts as (
    select cs.component_id, cs.title, cs.lifecycle, cs.critical, cs.status, cs.sort_order
    from ops.component_state cs
  ),
  orphans as (
    -- Проверка, пишущая в базу мимо каталога, не должна выпадать из вердикта: иначе
    -- новый скрипт без строки в каталоге отказывает молча.
    select count(*)::integer as total,
           (count(*) filter (where k.status <> 'ok'))::integer as bad
    from ops.check_state k
    where k.component_id is null
  ),
  uptime as (
    select case
             when count(*) = 0 then null
             else round((count(*) filter (where r.status = 'ok')) * 100.0 / count(*), 2)
           end as pct
    from ops.check_results r
    join ops.check_catalog c on c.check_name = r.check_name
    join ops.components m on m.id = c.component_id and m.critical and m.lifecycle = 'live'
    where r.observed_at >= since
  )
  select
    -- «Лежит» — только про критичные части: протухшие бэкапы это плохо, но продукт
    -- в этот момент работает, и называть это аварией значит обесценить слово.
    case
      when exists (select 1 from parts p
                    where p.critical and p.lifecycle = 'live' and p.status = 'fail')
        then 'down'
      -- Молчащая проверка на критичной части — это не «работает» и не «лежит», а
      -- «неизвестно». Назвать это исправностью значит соврать, аварией — поднять
      -- тревогу по поводу, которого никто не наблюдал.
      when exists (select 1 from parts p
                    where p.critical and p.lifecycle = 'live'
                      and p.status in ('stale', 'silent'))
        then 'unknown'
      when exists (select 1 from parts p
                    where p.lifecycle = 'live' and p.status <> 'ok')
        or (select o.bad from orphans o) > 0 then 'degraded'
      else 'ok'
    end,
    (select p.title from parts p
      where p.lifecycle = 'live' and p.status <> 'ok'
      order by ops.severity(p.status) desc, p.sort_order
      limit 1),
    span,
    now(),
    (select count(*)::integer from parts p where p.lifecycle = 'live'),
    (select count(*)::integer from parts p where p.lifecycle = 'live' and p.status = 'fail'),
    (select count(*)::integer from parts p where p.lifecycle = 'live' and p.status = 'warn'),
    (select count(*)::integer from parts p
      where p.lifecycle = 'live' and p.status in ('stale', 'silent')),
    (select count(*)::integer from parts p where p.lifecycle = 'planned'),
    (select count(*)::integer from ops.check_state k),
    (select o.total from orphans o),
    (select u.pct from uptime u);
end;
$$;

comment on function public.admin_service_summary(integer) is
  'Один ответ на вопрос «что с сервисом»: вердикт, худшая часть и доступность критичных частей за окно.';

create or replace function public.admin_service_health(p_hours integer default 24)
returns table (
  component_id text,
  layer text,
  title text,
  hint text,
  lifecycle text,
  critical boolean,
  status text,
  checks_total integer,
  checks_failing integer,
  checks_warning integer,
  checks_silent integer,
  worst_check text,
  last_seen timestamptz,
  uptime_pct numeric,
  latency_p95_ms integer
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := now() - make_interval(hours => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_health доступна только администраторам приложения';
  end if;

  return query
  with win as (
    select c.component_id as cid,
           count(*)::integer as samples,
           (count(*) filter (where r.status = 'ok'))::integer as ok_samples,
           (percentile_disc(0.95) within group (order by r.latency_ms))::integer as p95
    from ops.check_results r
    join ops.check_catalog c on c.check_name = r.check_name
    where r.observed_at >= since
    group by c.component_id
  )
  select
    cs.component_id, cs.layer, cs.title, cs.hint, cs.lifecycle, cs.critical, cs.status,
    cs.checks_total, cs.checks_failing, cs.checks_warning, cs.checks_silent,
    cs.worst_check, cs.last_seen,
    case when w.samples > 0 then round(w.ok_samples * 100.0 / w.samples, 2) end,
    w.p95
  from ops.component_state cs
  left join win w on w.cid = cs.component_id
  order by
    case cs.layer when 'frontend' then 1 when 'backend' then 2 else 3 end,
    cs.sort_order;
end;
$$;

comment on function public.admin_service_health(integer) is
  'Состояние каждой части сервиса: статус, доступность и задержка за окно.';

create or replace function public.admin_service_checks(p_hours integer default 24)
returns table (
  component_id text,
  component_title text,
  layer text,
  check_name text,
  target text,
  title text,
  hint text,
  unit text,
  status text,
  value numeric,
  latency_ms integer,
  note text,
  observed_at timestamptz,
  age_seconds integer,
  period_seconds integer,
  samples integer,
  uptime_pct numeric
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := now() - make_interval(hours => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_checks доступна только администраторам приложения';
  end if;

  return query
  with win as (
    select r.check_name as cn, coalesce(r.target, '') as tg,
           count(*)::integer as samples,
           (count(*) filter (where r.status = 'ok'))::integer as ok_samples
    from ops.check_results r
    where r.observed_at >= since
    group by r.check_name, coalesce(r.target, '')
  )
  select
    cst.component_id,
    m.title,
    m.layer,
    cst.check_name, cst.target, cst.title, cst.hint, cst.unit,
    cst.status, cst.value, cst.latency_ms, cst.note,
    cst.observed_at, cst.age_seconds, cst.period_seconds,
    coalesce(w.samples, 0),
    case when w.samples > 0 then round(w.ok_samples * 100.0 / w.samples, 2) end
  from ops.check_state cst
  left join ops.components m on m.id = cst.component_id
  left join win w on w.cn = cst.check_name and w.tg = coalesce(cst.target, '')
  order by
    case m.layer when 'frontend' then 1 when 'backend' then 2 when 'platform' then 3
      else 4 end,
    m.sort_order nulls last,
    cst.sort_order,
    cst.check_name,
    cst.target nulls first;
end;
$$;

comment on function public.admin_service_checks(integer) is
  'Каждая проверка по отдельности: последнее значение, возраст и доступность за окно.';

create or replace function public.admin_service_surfaces(p_hours integer default 24)
returns table (
  component_id text,
  title text,
  hint text,
  lifecycle text,
  status text,
  signals bigint,
  errors bigint,
  errors_per_100 numeric,
  last_signal_at timestamptz,
  versions integer,
  latest_version text,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_hours, 24), 720));
  since timestamptz := now() - make_interval(hours => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_surfaces доступна только администраторам приложения';
  end if;

  -- Числа считаются за выбранное окно, а статус — по правилу тишины из
  -- `ops.surface_state`, у которого своё окно. Это не рассогласование: «жив ли фронт»
  -- не должно меняться оттого, что на экране переключили период.
  return query
  with win as (
    select m.id as cid,
           count(*) filter (where t.kind = 'event') as signals,
           count(*) filter (where t.kind = 'error') as errors,
           count(distinct t.app_version)::integer as versions,
           (array_agg(t.app_version order by t.at desc) filter (where t.app_version is not null))[1]
             as latest_version
    from ops.components m
    left join (
      select e.platform as tag, e.occurred_at as at, e.app_version, 'event'::text as kind
      from public.analytics_events e
      where e.occurred_at >= since
      union all
      select coalesce(s.client, 'web'), s.occurred_at, null::text, 'error'
      from public.system_errors s
      where s.occurred_at >= since
    ) t on t.tag = any (m.client_match)
    where m.client_match <> '{}'
    group by m.id
  )
  select
    m.id, m.title, m.hint, m.lifecycle,
    coalesce(f.status, cs.status),
    w.signals, w.errors,
    case when w.signals > 0 then round(w.errors * 100.0 / w.signals, 2) end,
    f.last_signal_at,
    w.versions,
    w.latest_version,
    case
      when m.lifecycle = 'planned'
        then 'Фронта ещё нет. Строка стоит заранее: его появление не потребует правки экрана.'
      when w.signals = 0 and w.errors = 0
        then 'За период от этого фронта не пришло ни одного сигнала.'
    end
  from ops.components m
  join win w on w.cid = m.id
  left join ops.surface_state f on f.component_id = m.id
  left join ops.component_state cs on cs.component_id = m.id
  order by m.sort_order;
end;
$$;

comment on function public.admin_service_surfaces(integer) is
  'Фронты: идёт ли от них сигнал, сколько в нём ошибок и какая сборка отвечает.';

create or replace function public.admin_service_incidents(p_days integer default 7)
returns table (
  check_name text,
  title text,
  component_title text,
  target text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  samples integer,
  note text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  span integer := greatest(1, least(coalesce(p_days, 7), 90));
  since timestamptz := now() - make_interval(days => span);
begin
  if not private.is_alive_admin() then
    raise exception 'admin_service_incidents доступна только администраторам приложения';
  end if;

  -- Подряд идущие неудачи одной проверки — это один случай, а не двадцать строк.
  -- Разность двух нумераций даёт постоянное число внутри непрерывной полосы: приём
  -- старый, и он единственный, который не требует хранить состояние между строками.
  return query
  with marked as (
    select r.check_name as cn,
           coalesce(r.target, '') as tg,
           r.status as st,
           r.detail as dt,
           r.observed_at as at,
           (r.status <> 'ok') as bad,
           row_number() over (
             partition by r.check_name, coalesce(r.target, '') order by r.observed_at)
           - row_number() over (
             partition by r.check_name, coalesce(r.target, ''), (r.status <> 'ok')
             order by r.observed_at) as grp
    from ops.check_results r
    where r.observed_at >= since
  ),
  runs as (
    select mk.cn, mk.tg,
           min(mk.at) as started_at,
           max(mk.at) as ended_at,
           count(*)::integer as samples,
           case when bool_or(mk.st = 'fail') then 'fail' else 'warn' end as sev,
           (array_agg(coalesce(mk.dt->>'note', nullif(mk.dt::text, '{}')) order by mk.at desc)
             filter (where mk.dt is not null))[1] as note
    from marked mk
    where mk.bad
    group by mk.cn, mk.tg, mk.grp
  )
  select
    rn.cn,
    coalesce(c.title, rn.cn),
    m.title,
    nullif(rn.tg, ''),
    rn.sev,
    rn.started_at,
    rn.ended_at,
    rn.samples,
    rn.note
  from runs rn
  left join ops.check_catalog c on c.check_name = rn.cn
  left join ops.components m on m.id = c.component_id
  order by rn.started_at desc
  limit 100;
end;
$$;

comment on function public.admin_service_incidents(integer) is
  'Полосы неудач за период, свёрнутые в случаи: когда началось, когда кончилось, чем объяснено.';

revoke all on function public.admin_service_summary(integer) from public;
revoke all on function public.admin_service_health(integer) from public;
revoke all on function public.admin_service_checks(integer) from public;
revoke all on function public.admin_service_surfaces(integer) from public;
revoke all on function public.admin_service_incidents(integer) from public;

grant execute on function public.admin_service_summary(integer) to authenticated;
grant execute on function public.admin_service_health(integer) to authenticated;
grant execute on function public.admin_service_checks(integer) to authenticated;
grant execute on function public.admin_service_surfaces(integer) to authenticated;
grant execute on function public.admin_service_incidents(integer) to authenticated;

-- PostgREST держит схему в памяти и о новых функциях сам не узнаёт. Без этой строки
-- раздел открылся бы с сообщением про отсутствующую функцию — ровно этим кончилась
-- выкладка витрин аналитики, и повторять этот вечер незачем.
notify pgrst, 'reload schema';
