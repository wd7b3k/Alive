-- Наблюдаемость: где живёт история проверок.
--
-- До 28.08.2026 у продукта не было ни одной автоматической проверки: падение сервера,
-- протухший сертификат и не сделанный бэкап обнаруживались глазами владельца. Проверки
-- появляются отдельным слоем в `infra/monitoring/`, а эта миграция даёт им место, куда
-- складывать результат.
--
-- Почему схема `ops`, а не таблица в `public`:
--
-- 1. `public` целиком доступна через PostgREST. История проверок сообщает наружу больше,
--    чем кажется: время простоя, размер базы, число участников по косвенным признакам.
--    Схема вне списка `PGRST_DB_SCHEMAS` не отдаётся вовсе — это надёжнее любой политики.
-- 2. RLS в `public` построена вокруг `auth.uid()`. У проверок нет пользователя, и им
--    пришлось бы делать исключение в правиле, которое держит всю приватность продукта.
-- 3. Данные попадают в тот же `pg_dump`, что и остальное. Отдельная база или файл на
--    диске не переживут восстановление сервера — а именно тогда история и нужна.
--
-- Наружу история попадёт позже и через функцию с проверкой прав, когда на `/health`
-- появится раздел с доступностью. Отдельным решением, а не побочным эффектом этой миграции.

create schema if not exists ops;

comment on schema ops is
  'Служебные данные эксплуатации: история проверок и отправленных алертов. Не отдаётся через PostgREST.';

-- Результат одной проверки. Одна строка — один запуск одного скрипта.
create table if not exists ops.check_results (
  id bigserial primary key,
  -- Стабильный код проверки: apex_http, auth_health, rest_catalog, yandex_bridge,
  -- postgres, containers, host_disk, backups_age, tls_days, caddy_5xx, rls_canary.
  check_name text not null,
  -- Что именно проверяли: адрес, имя контейнера, точка монтирования.
  target text,
  status text not null check (status in ('ok', 'warn', 'fail')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  -- Измеренное число, если у проверки оно есть: дней до истечения, процент диска,
  -- доля пятисотых, возраст бэкапа в часах.
  value numeric(14, 4),
  -- Подробности для разбора: код ответа, текст ошибки, имя упавшего контейнера.
  -- Свободного пользовательского текста здесь быть не может по построению: сюда пишет
  -- только скрипт эксплуатации.
  detail jsonb not null default '{}'::jsonb,
  -- Когда проверка выполнялась. Отличается от recorded_at, если запись досылалась из
  -- файлового буфера после того, как база вернулась.
  observed_at timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);

create index if not exists check_results_name_time
  on ops.check_results (check_name, observed_at desc);

-- Отдельный индекс под разбор инцидентов: неуспешных строк мало, и искать их надо быстро.
create index if not exists check_results_failures
  on ops.check_results (observed_at desc)
  where status <> 'ok';

-- Суточная свёртка. Сырые строки живут 90 дней, свёртка — всегда: год работы это
-- около трёх тысяч строк вместо двух миллионов, а на вопрос «какая была доступность
-- в мае» она отвечает так же точно.
create table if not exists ops.check_daily (
  check_name text not null,
  day date not null,
  samples integer not null,
  ok_count integer not null,
  warn_count integer not null,
  fail_count integer not null,
  latency_p50_ms integer,
  latency_p95_ms integer,
  latency_max_ms integer,
  primary key (check_name, day)
);

-- Что было отправлено в Telegram. Нужно ровно для одного: не слать один и тот же алерт
-- каждую минуту, пока авария не закончилась.
create table if not exists ops.alerts (
  id bigserial primary key,
  check_name text not null,
  level text not null check (level in ('critical', 'warning')),
  state text not null check (state in ('opened', 'reminded', 'resolved')),
  summary text not null,
  sent_at timestamptz not null default now()
);

create index if not exists alerts_check_time on ops.alerts (check_name, sent_at desc);

-- Свернуть вчерашний день и убрать сырьё старше 90 дней.
-- Вызывается ежедневным таймером; идемпотентна, повторный запуск ничего не портит.
create or replace function ops.roll_up_and_prune(keep_days integer default 90)
returns void
language plpgsql
as $$
begin
  insert into ops.check_daily (
    check_name, day, samples, ok_count, warn_count, fail_count,
    latency_p50_ms, latency_p95_ms, latency_max_ms
  )
  select
    check_name,
    (observed_at at time zone 'UTC')::date as day,
    count(*),
    count(*) filter (where status = 'ok'),
    count(*) filter (where status = 'warn'),
    count(*) filter (where status = 'fail'),
    percentile_disc(0.5) within group (order by latency_ms)::integer,
    percentile_disc(0.95) within group (order by latency_ms)::integer,
    max(latency_ms)
  from ops.check_results
  where observed_at < date_trunc('day', now())
  group by 1, 2
  on conflict (check_name, day) do update set
    samples = excluded.samples,
    ok_count = excluded.ok_count,
    warn_count = excluded.warn_count,
    fail_count = excluded.fail_count,
    latency_p50_ms = excluded.latency_p50_ms,
    latency_p95_ms = excluded.latency_p95_ms,
    latency_max_ms = excluded.latency_max_ms;

  delete from ops.check_results
  where observed_at < now() - make_interval(days => keep_days);
end;
$$;

-- Ни одна роль приложения не должна видеть эту схему даже случайно.
revoke all on schema ops from public;
revoke all on all tables in schema ops from public;
revoke all on all functions in schema ops from public;
