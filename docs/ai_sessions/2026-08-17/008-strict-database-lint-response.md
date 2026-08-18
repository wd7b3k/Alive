# Response 008 — strict database lint без false-green

Дата: 2026-08-17

## Исправление

- Workflow теперь выполняет `supabase db lint --level error --fail-on error`; любой diagnostic уровня error даёт non-zero exit и останавливает job.
- Legacy helper `private.alive_migrate_legacy_awareness_state(regclass)` принимает существующую source relation как явный типизированный аргумент.
- Migration вызывает helper только если `to_regclass('public.user_myth_state')` вернул relation.
- Legacy-present pgTAP передаёт transient table как `regclass`, повторно проверяет однозначный перенос, отсутствие promotion unmapped myth и идемпотентный retry.
- Фильтры, `continue-on-error` и подавление exit code не использованы.

## Фактическое evidence

Strict-gate implementation head: `2ca5f83c2c4d8947282d44d8c7ab370eb75e10df`.

- `ALIVE database CI` run #35: PASS.
- Fresh `supabase db reset --local`: PASS; вся migration chain применена с нуля.
- 5 pgTAP suites, 61/61 assertions: PASS.
- Фактически исполненная команда: `supabase db lint --level error --fail-on error`.
- Lint result: `No schema errors found`.
- `supabase stop --no-backup`: PASS.
- `ALIVE frontend CI` run #295: PASS.

Run #32 и прежние ссылки на lint PASS не используются как strict-lint evidence.

## Quality lesson

Зелёный conclusion внешнего workflow недостаточен. Для каждого вложенного CLI-gate необходимо проверить:

1. что fail semantics явно соответствуют policy;
2. что в логе исполнена именно строгая команда;
3. что присутствует ожидаемый success marker;
4. что нет diagnostics запрещённого уровня;
5. что после найденного false-green gate повторён на fresh runner.

Правило закреплено в `docs/CODEX_QUALITY_PROTOCOL.md`.

## Ограничения

Hosted Supabase Advisors и authenticated browser E2E не запускались. Paid branch и live Supabase не использовались. PR остаётся draft и не merged.
