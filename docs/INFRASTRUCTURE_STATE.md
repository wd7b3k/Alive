# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

## GitHub

- Canonical repository: `wd7b3k/Alive`
- Visibility: `private`
- Default branch: `main`
- Active development branch: `v3.0-redesign`
- Active PR: `#4 ALIVE v3.0 — глубокий редизайн интерфейса` (draft до визуального smoke-test)
- Canonical standalone merge: `d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`
- Historical source before extraction: `wd7b3k/humanos/projectsv2.0/products/alive/`
- HumanOS cleanup merge: `78f2f74ef223d1da20c6c65203e5806263ec85e3`
- Current HumanOS `main` no longer contains the ALIVE product subtree; only pointer/audit history remains.
- Rule: дальнейшая ALIVE-разработка ведётся только в `wd7b3k/Alive`; HumanOS не используется как источник текущего кода, дизайна или ассетов.

## Supabase

- Project ref: `xkigijaqimzuveyzyzyk`
- Project URL: `https://xkigijaqimzuveyzyzyk.supabase.co`
- Region: `eu-west-1`
- Status при последней проверке: `ACTIVE_HEALTHY`
- Runtime role: Auth + PostgreSQL + RLS
- Browser-safe publishable key существует и активен; его значение не является секретом, но не фиксируется как immutable source of truth, поскольку ключ может ротироваться.
- Service-role/database/OAuth secrets: **не сохраняются в git**.

### Remote migrations applied

Канонические SQL-файлы находятся в `supabase/migrations/`; remote schema разворачивается только versioned migrations из repo.

### Security state

После применения hardening migrations Supabase Database Security Advisor: `0 warnings`.

Performance Advisor на пустой/малой БД может показывать `unused_index`; это не является основанием удалять индексы до реальных query metrics.

## Google OAuth

Status: `E2E PASS`.

2026-08-15 реальный Google OAuth flow подтверждён:

- Google consent — PASS;
- `auth.users` row — PASS;
- `public.profiles` auto-create — PASS;
- display name из Google metadata — PASS;
- возврат в Cloudflare Pages frontend — PASS после настройки Supabase Auth URL Configuration.

Supabase callback:

`https://xkigijaqimzuveyzyzyk.supabase.co/auth/v1/callback`

До подключения custom domain production Auth configuration использует Pages host:

- Site URL: `https://alive-aw2.pages.dev`
- Redirect URL: `https://alive-aw2.pages.dev/**`
- local development redirect при необходимости: `http://localhost:5173/**`

После подключения custom domain production Site URL должен быть переведён на `https://alive.hmnos.ru`.

Google OAuth Client Secret никогда не сохранять в repo, frontend или обычных логах.

## Cloudflare Pages

Status: `PRODUCTION HEALTHY / REDESIGN PREVIEW HEALTHY`.

Dashboard project label: `alive`.

Production host:

`https://alive-aw2.pages.dev`

Production source: `main`.

Активный preview редизайна:

- branch: `v3.0-redesign`;
- branch alias: `https://v3-0-redesign.alive-aw2.pages.dev`;
- atomic preview текущего состояния: `https://e52c8d13.alive-aw2.pages.dev`;
- Cloudflare Pages check: PASS;
- GitHub frontend typecheck/build: PASS.

2026-08-15 единичный `DNS_PROBE_FINISHED_NXDOMAIN` на мобильном устройстве не подтвердился как outage: production host и preview deployments фактически доступны. Не считать это инфраструктурным blocker без повторяемого подтверждения.

Planned canonical host:

`https://alive.hmnos.ru`

## Drift rule

Если Dashboard/remote state расходится с repo:

1. не считать ручное изменение новой нормой;
2. определить, является ли remote change ошибкой или желаемым изменением;
3. желаемое изменение сначала оформить в repo;
4. затем синхронизировать remote;
5. обновить этот документ.
