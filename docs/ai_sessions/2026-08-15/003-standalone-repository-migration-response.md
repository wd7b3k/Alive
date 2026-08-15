# Response / Handoff — перенос ALIVE в отдельный GitHub repository

Дата: 2026-08-15

## Target

Новый canonical repository:

`wd7b3k/Alive`

Visibility: private.

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

В частности canonical SQL migrations были перенесены без semantic changes.

## Новое решение

Добавлен `ADR-0002-standalone-github-repository.md`:

- `wd7b3k/Alive` — единственный source of truth;
- HumanOS и ALIVE не являются runtime dependencies друг друга;
- существующий Supabase project остаётся инфраструктурой ALIVE;
- будущая интеграция требует отдельного ADR/API/data/consent contract.

ADR-0001 отмечен superseded в части физического размещения.

## Нормализация

Обновлены живые документы и runbooks, чтобы использовать корень нового repo:

- root README;
- CURRENT_STATE;
- INFRASTRUCTURE_STATE;
- ARCHITECTURE;
- app README;
- Supabase README;
- активный v3.0 release unit.

Исторические F0 и прежние AI-session responses не переписывались задним числом: старые пути в них являются историческими фактами.

## External infrastructure

Supabase project не мигрировался и не пересоздавался:

- ref `xkigijaqimzuveyzyzyk`;
- existing schema/migrations сохранены.

GitHub-перенос не требует data migration.

## Следующий шаг

После target validation и очистки активного ALIVE-контура из HumanOS вернуться к `V3-GATE-01`:

**Google OAuth configuration → local build/login → two-user RLS isolation → Cloudflare preview.**
