# Текущее состояние ALIVE

## Статус

ALIVE — **полностью самостоятельный private repository `wd7b3k/Alive`**.

Текущая стадия: **ALIVE v3.0 Platform — IN DEVELOPMENT**.

Активная рабочая ветка:

`v3.0-platform`

## Единственный source of truth

Каноническое состояние проекта находится только в репозитории:

`wd7b3k/Alive`

и его корневых каталогах `app/`, `supabase/`, `docs/`, `releases/`.

Чат, локальные ZIP, Supabase Dashboard, Cloudflare Dashboard и исторические commits/PR HumanOS не являются самостоятельным source of truth.

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

Target normalization PR `wd7b3k/Alive#1` merged: `d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`.

HumanOS cleanup PR `wd7b3k/humanos#18` merged: `78f2f74ef223d1da20c6c65203e5806263ec85e3`.

`projectsv2.0/products/alive/` больше отсутствует в HumanOS `main`; там сохранены только routing/pointer и исторический Git trail.

Исторические документы ALIVE могут содержать старые пути как описание прошлого состояния; они не переопределяют текущий source of truth.

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
- TypeScript database types успешно генерируются из remote schema;
- Google OAuth client и Google provider в Supabase настроены владельцем; end-to-end login ещё не проверен;
- `app/package-lock.json` зафиксирован в repo;
- GitHub Actions использует Node `22.12.0` + `npm ci`;
- frontend `typecheck` — **PASS**;
- frontend production `build` — **PASS**.

## Применённые migrations в remote Supabase

1. `v3_platform_initial`
2. `v3_platform_security_indexes`

Канонические SQL-файлы находятся в `supabase/migrations/` этого repository.

## Что ещё НЕ сделано

- Google login end-to-end ещё не проверен реальным пользователем;
- Cloudflare Pages не подключён;
- DNS `alive.hmnos.ru` не настроен;
- local Supabase `db reset` ещё не выполнялся;
- profile creation не проверен реальным Google user;
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
2. HumanOS duplicate cleanup — **PASS**;
3. Supabase project — **PASS**;
4. migrations из repo применены — **PASS**;
5. security linter — **PASS, 0 warnings**;
6. Google OAuth configuration — **CONFIGURED / E2E PENDING**;
7. deterministic GitHub frontend CI (`npm ci + typecheck + build`) — **PASS**;
8. Cloudflare preview + browser-safe env — **NEXT**;
9. login/profile creation — pending;
10. two-user RLS isolation — pending;
11. DNS `alive.hmnos.ru` — pending.

Только после PASS V3-GATE-01 начинать onboarding/core craving flow.

## Не строить до V3-GATE-01

- Together v3.1;
- Admin/Monitoring v3.2;
- сложный personalized ranking;
- LLM runtime;
- дополнительные infrastructure layers.
