# ADR-0002 — ALIVE в отдельном GitHub repository

- Status: Accepted
- Date: 2026-08-15
- Supersedes: ADR-0001 в части физического размещения repository

## Контекст

F0 и первый bootstrap v3.0 были созданы внутри `wd7b3k/humanos/projectsv2.0/products/alive/` как логически независимый продуктовый контур. По мере перехода к собственной БД, домену, Auth, deployment lifecycle и отдельной продуктовой стратегии сохранение ALIVE внутри HumanOS стало создавать ненужную связанность source of truth и Git workflow.

## Решение

ALIVE физически выделяется в отдельный private repository:

`wd7b3k/Alive`

Корень этого repository является корнем продукта.

Канонические каталоги:

- `app/` — frontend;
- `supabase/` — PostgreSQL migrations/configuration;
- `docs/` — стратегия, methodology, privacy, architecture, ADR и audit trail;
- `releases/` — release units.

`wd7b3k/Alive` — **единственный source of truth** ALIVE.

Исторический каталог в `wd7b3k/humanos` после проверки миграции считается архивным и должен быть удалён из активного дерева HumanOS с коротким pointer на новый repository.

## Runtime boundaries

- ALIVE не зависит от HumanOS runtime.
- HumanOS не зависит от ALIVE runtime.
- Supabase project `xkigijaqimzuveyzyzyk` остаётся инфраструктурой ALIVE; перенос GitHub repository не требует DB migration.
- Будущая интеграция ALIVE ↔ HumanOS требует отдельного ADR, explicit API/data contract и consent boundary.

## Причины

- один однозначный source of truth;
- независимый release/deployment lifecycle;
- меньше context pollution для AI/разработчиков;
- проще Cloudflare/Supabase/GitHub integration;
- ниже риск случайных изменений соседнего HumanOS;
- проще eventual open-source/архивация/передача проекта независимо от HumanOS, если когда-либо понадобится.

## Последствия

Плюсы:

- чистая структура;
- независимые branches/PR/CI;
- независимые permissions/secrets/deployments;
- явная ownership boundary.

Минусы:

- общие инженерные решения между HumanOS и ALIVE больше не синхронизируются автоматически;
- cross-product integration потребует явных contracts.

Минусы приняты.
