# Prompt 007 — бесплатный ephemeral database CI для PR #8

Дата: 2026-08-17

Продолжить draft PR #8 в `wd7b3k/Alive` без merge и без платной Supabase development/preview branch.

Сначала исправить `VALIDATION.md` и `CURRENT_STATE.md`, чтобы они ссылались на фактический frontend final head `694c34fbefadcec028052845aead31f949bb46ba` и Actions run #251.

Добавить воспроизводимый бесплатный gate: GitHub Actions → pinned Supabase CLI → ephemeral Supabase stack → fresh migrations → pgTAP/RLS tests → teardown runner.

Обязательное покрытие: fresh replay, RLS isolation, authenticated/anonymous boundaries, RPC grants, sequential и concurrent `flow_id` retry, delete/recompute, admin boundary.

Не использовать live Supabase, платную branch, локальный repo/archive/build artifacts/node_modules, постоянные Docker volumes или test DB на диске владельца. Все долговечные изменения писать напрямую в repository. После завершения обновить validation и дать фактический handoff.
