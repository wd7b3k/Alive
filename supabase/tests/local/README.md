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
просто "слишком строгой").

Результат этого прогона на 2026-08-20 (эта же сессия): **все проверки PASS** — 0
утечек по SELECT/UPDATE/DELETE, попытка INSERT с чужим `user_id` отклонена,
собственные данные видны. Без identity (`request.jwt.claim.sub` пуст) — тоже 0
видимых строк, RLS не падает открытым по умолчанию.

## Что это НЕ проверяет (важно не переоценивать результат)

Это обычный локальный PostgreSQL с шимом `auth`, а не полноценный Supabase-стек:
нет PostgREST, нет GoTrue, нет реальной верификации JWT, не проверяется реальный
Google OAuth → JWT → PostgREST путь и настройки самого проекта в Supabase Dashboard.
PASS здесь — сильное свидетельство, что RLS-политики в migrations написаны верно,
**не замена** требуемому в `VALIDATION.md` живому smoke-test с двумя реальными
Google-аккаунтами на реальном Cloudflare Pages деплое.

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
секреты живого Supabase-проекта для этого не нужны и не используются.
