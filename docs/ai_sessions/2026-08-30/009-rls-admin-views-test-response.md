# Отказ давала не витрина, а шим, в котором пользователя не было

Ответ на `009-rls-admin-views-test-prompt.md`. Ветка `fix/rls-admin-views-test` от
`origin/main` = `0b2c0a1`.

## Две задачи из трёх были закрыты до начала сессии

Постановка описывает состояние на `8afbce4`. К моменту работы `main` ушёл на четыре
слияния вперёд (#47, #48, #49, #50), конфигурация Caddy установлена на сервере в 18:23,
выкладка прошла в 18:34. Задачи 1 и 2 переделывать не потребовалось — их приёмка
проверена заново и сходится целиком.

**Задача 1. Caddy на проде.**

```
$ sudo diff /etc/caddy/Caddyfile /srv/alive/repo/infra/caddy/Caddyfile && echo IDENTICAL
IDENTICAL
$ sudo ls -la /etc/systemd/system/caddy.service.d/
-rw-r--r--  1 root root  302 Aug 30 18:23 habitoff-env.conf
$ sudo ls -la /etc/habitoff-caddy.env
-rw------- 1 root root 81 Aug 30 18:23 /etc/habitoff-caddy.env
```

Вход через Яндекс — единственная точка, зависящая от подстановки заголовка, и она
работает:

```
$ curl -sS -o /dev/null -w 'code=%{http_code} redirect=%{redirect_url}\n' \
       https://habitoff.ru/functions/v1/yandex/start
code=303 redirect=https://oauth.yandex.ru/authorize?response_type=code&client_id=…
```

Откат остался на месте: `/etc/caddy/Caddyfile.bak` от 18:23.

**Задача 2. Отпечаток сборки.** Все восемь пунктов приёмки:

```
$ curl -s https://habitoff.ru/version.json
{"version":"3.2.0","commit":"0b2c0a197972f843cf9a5a33f40145dba8103564",
 "builtAt":"2026-08-30T18:34:39.948Z"}

$ node scripts/check-deploy-drift.mjs
Совпадает: прод и origin/main на 0b2c0a1 (версия 3.2.0).   # код возврата 0

# SHA-256 тел — три разных документа, а не один
/           3ab077946f361a6f2b18e6b5be30d48440e7a9e8130dbf2aff7d3301d4c4f357  10358 байт
/knowledge  62534312ea67f111f566b190eabd01a624d9e416a5b1745f456668fa66f3c130  10168 байт
/releases   7ceacb4208970439df42b6cf0fcc4a4b19ddb31baef9699edef73ca08624b38a   8316 байт

$ curl -s https://habitoff.ru/knowledge | grep canonical
<link rel="canonical" href="https://habitoff.ru/knowledge" />

$ curl -s https://habitoff.ru/releases | grep -E '<h[12]'
<h1>Что нового в Habitoff</h1>
<h2>3.2 — Новое имя и свой сервер</h2>
<h2>3.1 — Факты, Смыслы и «Вместе»</h2>
<h2>3.0 — Универсальная платформа</h2>
<h2>2.7 — Последний эталон предыдущей архитектуры</h2>

$ curl -sI https://habitoff.ru/assets/index-BWPnlb3o.js | grep -i cache-control
Cache-Control: public, max-age=31536000, immutable

$ curl -sI https://habitoff.ru/site.webmanifest | grep -i content-type
Content-Type: application/manifest+json

$ curl -s -o /dev/null -w '%{http_code}\n' https://habitoff.ru/what-new
404
# все шесть адресов из sitemap.xml
200 https://habitoff.ru/         200 https://habitoff.ru/knowledge   200 https://habitoff.ru/links
200 https://habitoff.ru/meanings 200 https://habitoff.ru/experiment  200 https://habitoff.ru/releases
```

## Задача 3: диагноз в постановке верен наполовину

В постановке сказано, что тесту «не хватает шага, делающего тестового пользователя
администратором». Шаг там есть — `04_admin_views_test.sql` строкой 23 пишет
`role = 'admin', status = 'active'` и подставляет claims. Отказ приходил не потому, что
роль не выставлена, а потому что `private.is_alive_admin()` не видела **никакого**
пользователя: `auth.uid()` возвращала `NULL`.

Отказ воспроизведён на одноразовом Postgres (контейнер из уже лежащего на сервере образа,
без публикации портов, боевую базу не трогал):

```
==> Проверка витрин админки: вызываются ли они вообще
psql:04_admin_views_test.sql:55: ERROR:  admin_core_metrics доступна только администраторам приложения
CONTEXT:  PL/pgSQL function admin_core_metrics(integer) line 7 at RAISE
rc=3
```

Причина — в самом шиме. `00_auth_shim.sql` объявлял:

```sql
select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
```

Настоящая `auth.uid()` в Supabase читает **два** имени настройки: старое
`request.jwt.claim.sub` и то, что кладёт нынешний PostgREST, — весь набор claims одним
JSON в `request.jwt.claims`. Тест 03 писал первое имя и работал, тест 04 писал второе —
то, которое приходит на проде, — и молча получал `NULL`. Замер это показывает прямо:

```
NOTICE:  после request.jwt.claims:    target=1111…1111  auth.uid()=<NULL>
NOTICE:  после request.jwt.claim.sub:                    auth.uid()=1111…1111
```

Витрина при этом исправна: на проде PostgREST кладёт claims под вторым именем, и отказа
там нет. Сломан был шим, а не тест и не витрина. Поэтому починен шим — он приведён к
настоящему контракту:

```sql
select coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), ''),
  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
)::uuid
```

Правка теста закрыла бы прогон, но оставила бы ловушку: следующий тест, написанный против
реального контракта, снова получил бы `NULL` вместо пользователя и снова выглядел бы как
сломанная витрина.

## Приёмка задачи 3

```
==> Проверка витрин админки: вызываются ли они вообще
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_core_metrics(12) -> 13 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_funnel(30) -> 7 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_flow_steps(30) -> 0 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_retention(8) -> 5 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_sources(30) -> 0 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: select count(*) from public.admin_user_states() -> 0 строк
psql:04_admin_views_test.sql:55: NOTICE:  ok: не-администратору отказано (admin_funnel доступна только администраторам приложения)
==> RLS isolation + admin views: ALL PASS
rc=0
```

Отрицательная проверка на месте: участник без роли `admin` по-прежнему получает отказ.
Прогон CI на ветке — в PR.

## Оговорка о том, где прогон был сделан

Локального Postgres на машине владельца нет, сети в WSL нет — установить его было нечем.
Прогон сделан на сервере в одноразовом контейнере из образа `supabase/postgres:17.6.1.136`,
CI поднимает `postgres:16`. Правка от версии не зависит (`jsonb ->> 'sub'` — с PG 9.4), но
считать прогон эквивалентом CI нельзя: авторитетным остаётся зелёный прогон на ветке.
Контейнер и каталог `/tmp/rlstest` удалены, боевые контейнеры не тронуты.

## Найдено попутно

`04_admin_views_test.sql` выполняется суперпользователем: `set role authenticated` в нём
нет. Права `execute` витринам розданы (`grant execute … to authenticated` в миграции
`20260828170000`), но тест их не проверяет — потеряй витрина грант, прод отдал бы отказ,
а тест остался бы зелёным. Заведена карточка.

## Что не сделано

`HANDOFF.md` во временной копии удалён последним действием, как требует постановка.
Открытые вопросы владельца из хвоста задания (смена ключа хоста у `89.125.209.26`,
статус PR #44) — вопросы, а не работа этой ветки; в ней не трогались.
