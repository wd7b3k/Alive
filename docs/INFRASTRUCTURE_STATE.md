# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

## GitHub

- Canonical repository: `wd7b3k/Alive`
- Visibility: `private`
- Default branch: `main`
- Active development branch: `v3.0-platform`
- Canonical standalone merge: `d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`
- Historical source before extraction: `wd7b3k/humanos/projectsv2.0/products/alive/`
- HumanOS cleanup merge: `78f2f74ef223d1da20c6c65203e5806263ec85e3`
- Current HumanOS `main` no longer contains the ALIVE product subtree; only pointer/audit history remains.
- Rule: дальнейшая ALIVE-разработка ведётся только в `wd7b3k/Alive`.

## Supabase

- Project ref: `xkigijaqimzuveyzyzyk`
- Project URL: `https://xkigijaqimzuveyzyzyk.supabase.co`
- Region: `eu-west-1`
- Status при последней проверке: `ACTIVE_HEALTHY`
- Runtime role: Auth + PostgreSQL + RLS
- Browser-safe publishable key существует и активен; его значение не является секретом, но не фиксируется как immutable source of truth, поскольку ключ может ротироваться.
- Service-role/database/OAuth secrets: **не сохраняются в git**.

### Remote migrations applied

1. `v3_platform_initial`
2. `v3_platform_security_indexes`

Канонические SQL-файлы: `supabase/migrations/`.

### Security state

После применения hardening migration Supabase Database Security Advisor: `0 warnings`.

Performance Advisor на пустой БД показывает только `unused_index`; это ожидаемо до появления workload и не является основанием удалять индексы до реальных query metrics.

## Google OAuth

Status: `CONFIGURED / E2E NOT YET VERIFIED`.

2026-08-15 владелец настроил Google OAuth client и Google provider в Supabase Dashboard. Фактический PASS ставится только после успешного реального `signInWithOAuth` и создания profile row.

Supabase callback:

`https://xkigijaqimzuveyzyzyk.supabase.co/auth/v1/callback`

Application origins / redirects, которые должны быть разрешены:

- `https://alive.hmnos.ru`
- `http://localhost:5173` для local development.

Google OAuth Client Secret никогда не сохранять в repo, frontend или обычных логах.

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
