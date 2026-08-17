# Response — бесплатная DB validation и политика локального диска

Дата: 2026-08-17

## Принятое решение

- Платная Supabase Preview/Development Branch не используется как default validation gate.
- Для migrations/RLS используется временный Supabase stack внутри GitHub Actions через Supabase CLI/Docker.
- Канонические материалы хранятся в repository; локальный диск владельца не используется как постоянное хранилище build/test/docs артефактов.
- Тяжёлые временные артефакты выполняются на ephemeral runner и уничтожаются после job.
- Платная dev-инфраструктура возможна только по отдельному owner approval и при отсутствии бесплатного воспроизводимого эквивалента.

## Проверка PR #8

Подтверждено:

- head `694c34fbefadcec028052845aead31f949bb46ba`;
- PR #8 открыт, draft, mergeable, не merged;
- GitHub Actions run #251 `ALIVE frontend CI` завершён success;
- job реально содержит install, typecheck, domain tests и build.

Найдено расхождение:

- release `VALIDATION.md` и `CURRENT_STATE.md` всё ещё содержат ссылки на более ранний CI run #246 и старые hashes; их нужно синхронизировать с финальным head/run.

DB/RLS и authenticated E2E остаются непроверенными; предложен бесплатный следующий gate через GitHub Actions + Supabase CLI + pgTAP/RLS tests.

## Изменённая документация

- `docs/CODEX_EXECUTION_MODES.md` — добавлена политика local disk и бесплатный ephemeral database gate;
- `docs/decisions/2026-08-17-ephemeral-ci-and-local-disk-policy.md` — отдельная запись решения;
- PR #8 получил независимый review-comment с фактической проверкой и следующим минимальным шагом.
