# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

## GitHub

- Canonical repository: `wd7b3k/Alive`
- Visibility: `private`
- Default branch: `main`
- Historical source before extraction: `wd7b3k/humanos/projectsv2.0/products/alive/`
- Rule: historical HumanOS copy is archival/noncanonical; дальнейшая ALIVE-разработка ведётся только здесь.

## Supabase

- Project ref: `xkigijaqimzuveyzyzyk`
- Project URL: `https://xkigijaqimzuveyzyzyk.supabase.co`
- Region: `eu-west-1`
- Status при последней проверке: `ACTIVE_HEALTHY`
- Runtime role: Auth + PostgreSQL + RLS
- Publishable key: существует и используется только как browser-safe deployment configuration; значение не является каноническим source of truth и может ротироваться.
- Service-role/database/OAuth secrets: **не сохраняются в git**.

### Remote migrations applied

1. `v3_platform_initial`
2. `v3_platform_security_indexes`

Канонические SQL-файлы: `supabase/migrations/`.

### Security state

После применения hardening migration Supabase Database Security Advisor: `0 warnings`.

Performance Advisor на пустой БД показывает только `unused_index`; это ожидаемо до появления workload и не является основанием удалять индексы до реальных query metrics.

## Google OAuth

Status: `PENDING`.

Для Web OAuth использовать Supabase callback:

`https://xkigijaqimzuveyzyzyk.supabase.co/auth/v1/callback`

Planned application origins:

- `https://alive.hmnos.ru`
- `http://localhost:5173` для local development.

Client secret никогда не сохранять в repo.

## Cloudflare

Status: `PENDING`.

Planned host:

`alive.hmnos.ru`

Deployment source должен быть `wd7b3k/Alive` и конкретный branch/commit/release state. Dashboard configuration отражается здесь после настройки.

## Drift rule

Если Dashboard/remote state расходится с repo:

1. не считать ручное изменение новой нормой;
2. определить, является ли remote change ошибкой или желаемым изменением;
3. желаемое изменение сначала оформить в repo;
4. затем синхронизировать remote;
5. обновить этот документ.
