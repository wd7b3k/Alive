# Текущее состояние ALIVE

## Статус

ALIVE — **полностью самостоятельный private repository `wd7b3k/Alive`**.

Текущая стадия: **ALIVE v3.0 Platform — IN DEVELOPMENT**.

## Единственный source of truth

Каноническое состояние проекта находится только в репозитории:

`wd7b3k/Alive`

и его корневых каталогах `app/`, `supabase/`, `docs/`, `releases/`.

Чат, локальные ZIP, Supabase Dashboard, Cloudflare Dashboard и исторический каталог `wd7b3k/humanos/projectsv2.0/products/alive/` не являются самостоятельным source of truth.

Правило: **если внешнее состояние расходится с repo, repo отражает желаемое состояние, а drift должен быть либо устранён versioned change, либо явно задокументирован.**

## Репозиторная миграция 2026-08-15

ALIVE физически выделен из `wd7b3k/humanos` в `wd7b3k/Alive`.

Перенесены:

- product foundation/governance;
- React/TypeScript/Vite frontend bootstrap;
- Supabase migrations;
- release units;
- ADR;
- AI audit trail.

Исторические документы могут содержать старые пути как описание прошлого состояния; они не переопределяют текущий source of truth.

## Что уже сделано в v3.0

- создан release unit `releases/v3.0-platform/`;
- pre-registered FR/RISK scope;
- создан React + TypeScript + Vite frontend bootstrap в `app/`;
- создан browser-safe environment contract;
- добавлен Supabase browser client bootstrap;
- добавлен Google OAuth login shell;
- добавлена публичная страница `/experiment`;
- добавлены inline explanations по принципу `nothing unexplained`;
- создана initial PostgreSQL migration;
- private entities имеют `user_id` и RLS policies;
- создан auto-profile trigger при регистрации Auth user;
- зафиксированы `ALIVE Method v1` и `ALIVE Equivalence v1`;
- добавлены initial Trigger/Need/Replacement catalogs;
- поддерживаемые raw products: cigarette / hookah / vape;
- подтверждён Supabase project `xkigijaqimzuveyzyzyk`, region `eu-west-1`;
- initial migration применена удалённо;
- security hardening migration создана в repo и только после этого применена удалённо;
- Supabase security advisors: **0 warnings** после hardening;
- FK indexes добавлены; remaining performance lints — только `unused_index` на пустой БД и считаются ожидаемыми;
- remote schema содержит 16 public tables, RLS включён на всех public tables;
- TypeScript database types успешно генерируются из remote schema.

## Применённые migrations в remote Supabase

1. `v3_platform_initial`
2. `v3_platform_security_indexes`

Канонические SQL-файлы находятся в `supabase/migrations/` этого repository.

## Что ещё НЕ сделано

- Google OAuth provider не настроен;
- Cloudflare Pages не подключён;
- DNS `alive.hmnos.ru` не настроен;
- dependencies/build ещё не проверялись в реальном Node environment;
- local Supabase `db reset` ещё не выполнялся;
- login/profile creation не проверены реальным Google user;
- двухпользовательский RLS isolation test ещё не выполнен;
- onboarding ещё не реализован;
- craving core flow ещё не реализован;
- user Meanings/Links CRUD UI ещё не реализован;
- export/delete ещё не реализованы;
- automated RLS isolation tests ещё не реализованы.

## Продуктовый статус

ALIVE остаётся полностью некоммерческим экспериментом. Миграция legacy v2.x пользовательских данных не нужна: реального периода эксплуатации ещё не было.

## Архитектурное направление

`Browser → alive.hmnos.ru → Cloudflare Pages → Supabase Auth → PostgreSQL/RLS`

Privileged operations позднее выполняются через Edge Functions/DB functions только там, где это действительно требуется.

## Следующий gate

**V3-GATE-01: воспроизводимый local/remote platform bootstrap.**

Текущий статус шагов:

1. отдельный canonical repository — **PASS**;
2. Supabase project — **PASS**;
3. migrations из repo применены — **PASS**;
4. security linter — **PASS, 0 warnings**;
5. Google Auth — **NEXT**;
6. `.env.local` — pending;
7. `npm install` + `npm run build` — pending;
8. login/profile creation — pending;
9. two-user RLS isolation — pending;
10. Cloudflare preview — pending.

Только после PASS V3-GATE-01 начинать onboarding/core craving flow.

## Не строить до V3-GATE-01

- Together v3.1;
- Admin/Monitoring v3.2;
- сложный personalized ranking;
- LLM runtime;
- дополнительные infrastructure layers.
