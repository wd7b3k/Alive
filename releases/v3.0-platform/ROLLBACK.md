# ALIVE v3.0 — Rollback

До первого production deployment v3 rollback означает возврат к последнему стабильному commit/release state; legacy v2.7 остаётся исторической reference-точкой.

## До production deployment

Работа v3.0 ведётся в feature branch от `main`. Непринятые изменения не мержатся; принятые repository changes откатываются через revert, а не переписывание истории.

## Supabase

Обязательные условия:

1. migrations в `wd7b3k/Alive/supabase/migrations/` являются единственным schema source;
2. remote schema version фиксируется в repo docs;
3. destructive migrations запрещены без отдельного backup/restore plan;
4. rollback SQL либо forward-fix strategy документируется для каждой destructive/semantic migration.

Перенос repository не менял DB schema и не требует rollback БД.

## После подключения Cloudflare

- production deployment должен ссылаться на конкретный git commit;
- предыдущий успешный deployment сохраняется доступным для rollback;
- DNS/domain metadata отражается в repo docs без секретов.

## Data safety

До внешних пользователей не допускается release, если rollback требует ручного удаления/переписывания их private behavioural data.
