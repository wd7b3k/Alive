# Ephemeral database CI

Канонический бесплатный database gate ALIVE находится в `.github/workflows/database-ci.yml`.

## Pipeline

1. GitHub-hosted Ubuntu runner.
2. `supabase/setup-cli@v3.0.0`, CLI `2.111.0`.
3. Ephemeral `supabase start`.
4. Fresh replay: `supabase db reset --local`.
5. `supabase test db`.
6. `supabase db lint --level error --fail-on error`.
7. `supabase stop --no-backup` с `if: always()`.
8. Runner уничтожается.

Remote link, Supabase secrets, artifacts, постоянные Docker volumes и test DB на диске владельца не используются. Платная development/preview branch не создаётся.

## Coverage

- `v4_alpha1_access.test.sql`: schema/RLS, authenticated и anonymous boundaries, RPC grants, sequential `flow_id` retry, admin/private boundary.
- `v4_alpha1_concurrency.test.sql`: две параллельные authenticated сессии повторяют один `flow_id` и получают одну canonical запись/event.
- `v4_alpha1_learning.test.sql`: correction/soft-delete/restore и recompute trigger/replacement projections.
- `v4_alpha1_security_regressions.test.sql`: privilege escalation, cross-user action ownership и blocked physical episode delete.
- `v4_alpha1_legacy_migration.test.sql`: реальный legacy-present copy path и idempotent retry.

Фактический strict-gate reference: `ALIVE database CI` run #35, implementation head `2ca5f83c2c4d8947282d44d8c7ab370eb75e10df`, 61/61 assertions PASS, `No schema errors found`, teardown PASS. Последний documentation commit в этом файле повторно запускает тот же gate на итоговом PR head.

## Fail semantics

GitHub `success` не заменяет проверку вложенного инструмента. Валидатор обязан подтвердить в полном job log:

- фактически исполнена команда с `--fail-on error`;
- присутствует `No schema errors found`;
- нет diagnostics уровня error;
- replay, tests и teardown завершились успешно.

Runs #24/#32 не являются strict-lint evidence: прежняя команда использовала default `--fail-on none` и могла вернуть exit code 0 при lint error. Фильтры, `continue-on-error` и подавление exit code не допускаются.

## Boundaries

Live Supabase этим gate не меняется. Hosted Security/Performance Advisors после будущего controlled deployment остаются отдельной непроверенной стадией. `db reset --linked` на production запрещён.
