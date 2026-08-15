# ALIVE v3.0 — Rollback

До первого production deployment v3 rollback означает возврат к последнему стабильному состоянию `main`/legacy v2.7 reference.

## До подключения remote infrastructure

Достаточно:

- не merge `alive/v3.0-platform`;
- либо revert merge commit v3.0 foundation/code changes.

## После подключения Supabase

Обязательные условия до production:

1. migrations в git являются единственным schema source;
2. remote schema version зафиксирована;
3. destructive migrations запрещены без отдельного backup/restore plan;
4. rollback SQL либо forward-fix strategy документируется для каждой destructive/semantic migration.

## После подключения Cloudflare

- production deployment должен ссылаться на конкретный git commit;
- предыдущий успешный deployment сохраняется доступным для rollback;
- DNS/domain metadata отражается в repo docs без секретов.

## Data safety

До внешних пользователей не допускается release, если rollback требует ручного удаления/переписывания их private behavioural data.
