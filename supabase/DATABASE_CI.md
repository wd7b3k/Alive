# Ephemeral database CI

Канонический бесплатный database gate ALIVE находится в `.github/workflows/database-ci.yml`.

## Pipeline

1. GitHub-hosted Ubuntu runner.
2. `supabase/setup-cli@v3.0.0`, CLI `2.111.0`.
3. Ephemeral `supabase start`.
4. Fresh replay: `supabase db reset --local`.
5. `supabase test db`.
6. `supabase db lint --level error`.
7. `supabase stop --no-backup` с `if: always()`.
8. Runner уничтожается.

Remote link, Supabase secrets, artifacts, постоянные Docker volumes и test DB на диске владельца не используются. Платная development/preview branch не создаётся.

## Coverage

- `v4_alpha1_access.test.sql`: schema/RLS, authenticated и anonymous boundaries, RPC grants, sequential `flow_id` retry, admin/private boundary.
- `v4_alpha1_concurrency.test.sql`: две параллельные authenticated сессии повторяют один `flow_id` и получают одну canonical запись/event.
- `v4_alpha1_learning.test.sql`: correction/delete/restore и recompute trigger/replacement projections.

Фактический reference: `ALIVE database CI` run #11, head `3c74af9ad97e05a0a86c0a2191c4f9dd436dd412`, 49/49 assertions PASS, schema lint PASS, teardown PASS.

## Boundaries

Live Supabase этим gate не меняется. Hosted Security/Performance Advisors после будущего controlled deployment остаются отдельной непроверенной стадией. `db reset --linked` на production запрещён.
