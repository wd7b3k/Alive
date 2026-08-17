# Response 007 — бесплатный ephemeral database CI для PR #8

Дата: 2026-08-17

## Результат

В draft PR #8 добавлен воспроизводимый бесплатный database gate без Supabase development/preview branch и без изменения live project.

Финальный DB-tested head: `dc49610876c7ab98b4085bd3736a7bb5697c10fc`.

- `ALIVE frontend CI` run #284: PASS.
- `ALIVE database CI` run #24: PASS.
- fresh migration replay: PASS.
- 5 pgTAP suites, 61/61 assertions: PASS.
- `supabase db lint --level error`: PASS.
- `supabase stop --no-backup`: PASS и не маскирует ошибку.

## Реализация

- Добавлены `supabase/config.toml`, `.github/workflows/database-ci.yml` и `supabase/DATABASE_CI.md`.
- Actions закреплены полными commit SHA; Supabase CLI закреплён на `2.111.0`; checkout credentials не сохраняются.
- Тесты покрывают RLS/auth/anon, RPC grants, sequential/concurrent `flow_id`, soft-delete/recompute, blocked hard delete, admin privilege non-escalation, cross-user action ownership, private goals и legacy-present migration.
- Legacy-only `user_myth_state` условно обрабатывается и на fresh schema, и при наличии historical table.
- Live Supabase, paid branch, remote link/secrets, Actions artifacts и постоянные volumes не использовались.

## Диагностический путь

Первые runs не назывались PASS. CI последовательно выявил и помог исправить:

1. две fresh-replay зависимости от отсутствующей `user_myth_state`;
2. повреждённый dollar-quote при API-записи;
3. неверную перегрузку pgTAP `throws_ok`;
4. dblink loopback без password authentication;
5. синтаксис split access suite.

Run #11 впервые дал 49/49, но независимый adversarial reviewer нашёл false-positive admin/RLS boundaries: self-promotion в admin, cross-user action→episode, physical delete без rebuild, непроверенный legacy-present path, mutable action tags и masked teardown. Все findings исправлены; focused re-review на `dc496…` дал PASS.

## Browser / performance

Cloudflare branch preview проверен реальным browser tooling на `1440×900` и `390×844`: public shell, CTA, info route и отсутствие horizontal overflow — PASS. Authenticated canonical flow и `/admin` не проверены: browser session не авторизована.

Chrome DevTools MCP для Core Web Vitals trace отсутствует, поэтому performance gate — `НЕ ПРОВЕРЕНО`.

## Residual risks

- Перед remote deployment нужен preflight существующих `episode_actions` на конфликт с composite owner FK.
- Legacy test исполняет реальный migration helper, но не является полным upgrade из исторического pre-R1 snapshot.
- `ubuntu-latest` остаётся mutable runner image.
- pgTAP не заменяет PostgREST/Auth transport E2E и hosted Supabase Advisors.

PR остаётся draft и не merged.
