# Response / Handoff — ALIVE v3.0 Platform bootstrap

Дата: 2026-08-15

## Выполнено

Создана ветка:

`alive/v3.0-platform`

В `AGENTS.md` явно закреплено:

**REPO = единственный source of truth.**

Добавлены:

- `app/` — React + TypeScript + Vite bootstrap;
- browser-safe `.env.example`;
- Supabase browser client;
- Google OAuth login shell;
- configuration gate при отсутствии env;
- `/experiment` с описанием методологии, ограничений и privacy;
- базовые inline explanations по `nothing unexplained`;
- `supabase/migrations/20260815170000_v3_platform_initial.sql`;
- profiles/settings/nicotine products;
- Episodes / Actions / raw Tobacco Events;
- personal Meanings / Links / UGC;
- methodology/equivalence models;
- Trigger/Need/Replacement catalogs;
- RLS policies private-by-default;
- auth-user → profile trigger;
- release unit `releases/v3.0-platform/`;
- preregistered FR/RISK scope;
- validation/rollback/runbooks;
- обновлён `CURRENT_STATE.md`.

## Важные решения

- schema БД не редактируется вручную как канонический state; source — migrations git;
- frontend использует только publishable Supabase configuration;
- service-role/OAuth secrets запрещены во frontend/git;
- никакие имена участников не hardcode;
- Together/Admin не добавлены раньше своих релизов;
- logo не изменялся.

## Validation сейчас

Статическая repository review: PASS.

Environment-dependent checks ещё не выполнялись:

- npm install/typecheck/build;
- Supabase local db reset;
- remote Supabase migration;
- Google OAuth;
- two-user RLS test;
- Cloudflare preview.

Они составляют следующий gate `V3-GATE-01`.

## Следующий шаг владельца

Подключить/создать Supabase project и Cloudflare account/project context либо предоставить их через подключаемые инструменты. После этого:

1. применить migrations из repo;
2. настроить Google provider;
3. заполнить локальный/Cloudflare browser-safe env;
4. проверить login и two-user isolation;
5. только затем реализовывать onboarding.
