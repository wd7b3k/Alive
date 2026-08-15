# Response / Handoff — перенос ALIVE в отдельный GitHub repository

Дата: 2026-08-15

## Result

Миграция repository **завершена**.

Единственный canonical repository:

`wd7b3k/Alive`

Visibility: private.

Canonical standalone merge:

`d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`

Активная ветка дальнейшей разработки:

`v3.0-platform`

## Перенесено

Из ветки `alive/v3.0-platform` старого `wd7b3k/humanos` перенесены в корень нового repository:

- `AGENTS.md` и `README.md`;
- `app/` — React/TypeScript/Vite bootstrap;
- `docs/` — strategy/methodology/privacy/architecture/data/governance;
- `docs/ai_sessions/` — AI audit trail;
- `docs/decisions/` — ADR history;
- `releases/` — F0 и v3.0 release units;
- `supabase/` — DB runbook и обе canonical migrations.

## Integrity

Файлы, не требовавшие path/source-of-truth normalization, переносились copy-by-content. Git blob SHA совпадает с исходным, когда содержимое идентично.

Canonical SQL migrations перенесены без semantic changes:

- initial migration SHA: `1e1b5b900712c90b71b6bee8352cb1d7179379a9`;
- hardening migration SHA: `2359414f2d3181dd355da6be514f242e23826590`.

## Decisions

Добавлен `ADR-0002-standalone-github-repository.md`:

- `wd7b3k/Alive` — единственный source of truth;
- HumanOS и ALIVE не являются runtime dependencies друг друга;
- существующий Supabase project остаётся инфраструктурой ALIVE;
- будущая интеграция требует отдельного ADR/API/data/consent contract.

ADR-0001 отмечен superseded в части физического размещения.

## HumanOS cleanup

Старый HumanOS draft PR #17 закрыт без merge как `[MOVED]`.

Cleanup PR #18 смержен:

`78f2f74ef223d1da20c6c65203e5806263ec85e3`

В HumanOS `main`:

- `projectsv2.0/products/alive/` удалён;
- `projectsv2.0/AGENTS.md` маршрутизирует ALIVE-задачи в `wd7b3k/Alive`;
- `projectsv2.0/products/README.md` содержит только pointer;
- сохранены maintenance release/audit trail;
- HumanOS runtime/data/schema не менялись.

## External infrastructure

Supabase project не мигрировался и не пересоздавался:

- ref `xkigijaqimzuveyzyzyk`;
- existing schema/migrations сохранены.

GitHub-перенос не требовал data migration.

## Next

Вернуться к `V3-GATE-01`:

**Google OAuth configuration → local build/login → two-user RLS isolation → Cloudflare preview.**
