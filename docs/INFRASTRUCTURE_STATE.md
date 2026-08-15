# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

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
- local development origin, определяемый frontend dev server.

Client secret никогда не сохранять в repo.

## Cloudflare

Status: `PENDING`.

Planned host:

`alive.hmnos.ru`

Deployment source должен быть GitHub branch/release state, а dashboard configuration должна быть отражена здесь после настройки.

## Drift rule

Если Dashboard/remote state расходится с repo:

1. не считать ручное изменение новой нормой;
2. определить, является ли remote change ошибкой или желаемым изменением;
3. желаемое изменение сначала оформить в repo;
4. затем синхронизировать remote;
5. обновить этот документ.
