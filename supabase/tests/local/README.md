# RLS isolation test (local, Docker-free)

Проверяет `RISK-V3-001` / `FR-V3-013/014` из `releases/v3.0-platform/REQUIREMENTS.md`:
что участник A не может читать, изменять или удалять private rows участника B.

## Что это такое

Скрипт `run.sh` разворачивает одноразовую локальную PostgreSQL-базу, накатывает
реальные versioned migrations из `supabase/migrations/` (без изменений), заводит
минимальный `auth`-шим (`00_auth_shim.sql`: таблица `auth.users` + `auth.uid()` +
роли `anon`/`authenticated`/`service_role`, по контракту максимально близкому к
Supabase), сеет двух тестовых пользователей и по одной приватной строке на каждую
защищённую RLS-таблицу, затем как `authenticated` с JWT-claim пользователя A
проверяет: SELECT/UPDATE/DELETE чужих private rows (10 таблиц), попытку INSERT с
чужим `user_id` (должна быть отклонена `with check`), и — контрольно — что свои
собственные строки пользователь A по-прежнему видит (чтобы политика не оказалась
просто «слишком строгой»).

Результат прогона на 2026-08-20: **все проверки PASS** — 0 утечек по
SELECT/UPDATE/DELETE, попытка INSERT с чужим `user_id` отклонена, собственные данные
видны. Без identity (`request.jwt.claim.sub` пуст) — тоже 0 видимых строк, RLS не падает
открытым по умолчанию.

## Что это НЕ проверяет (важно не переоценивать результат)

Это обычный локальный PostgreSQL с шимом `auth`, а не полноценный стек Supabase: нет
PostgREST, нет GoTrue, нет реальной верификации JWT, не проверяется путь
«вход → JWT → шлюз → PostgREST» и настройки самого стека. PASS здесь — сильное
свидетельство, что RLS-политики в migrations написаны верно, **не замена** живому
smoke-тесту на боевом развёртывании с двумя настоящими аккаунтами, который требует
`VALIDATION.md`.

С 27.08.2026 такой смоук выполняется на собственном сервере и делается ещё и снаружи,
через боевой путь целиком:

```bash
PUB=$(grep -m1 '^SUPABASE_PUBLISHABLE_KEY=' /srv/supabase/.env | cut -d= -f2-)
curl -s -H "apikey: $PUB" -H "Authorization: Bearer $PUB" \
  'https://habitoff.ru/rest/v1/facts_catalog?select=*&limit=1'
curl -s -H "apikey: $PUB" -H "Authorization: Bearer $PUB" \
  'https://habitoff.ru/rest/v1/user_goals?select=*&limit=1'
```

Первый запрос обязан вернуть карточку каталога, второй — отказ или пустой массив, но
ни при каких условиях не чужие строки.

## Запуск

Требуется локальный PostgreSQL с правами на create/drop database (подходит
`sudo -u postgres`, либо postgres service container в CI):

```bash
cd supabase/tests/local
sudo -u postgres ./run.sh
```

Ненулевой exit code = провалена хотя бы одна проверка; сообщение об ошибке содержит,
какая именно таблица/операция утекла.

## CI

Прогоняется автоматически в `.github/workflows/frontend-ci.yml` (job `rls-isolation`)
на каждый push/PR — GitHub-hosted runner поднимает `postgres` service container,
секреты боевого стека для этого не нужны и не используются.
