# F0 Rollback

Foundation unit не меняет production runtime, БД, DNS или внешнюю инфраструктуру.

## Rollback procedure

Если foundation принято решение отклонить после merge:

1. revert PR/merge commit целиком;
2. удалить только `projectsv2.0/products/alive/` и добавленный `projectsv2.0/products/README.md` через revert, а не ручное переписывание истории;
3. восстановить предыдущую версию `projectsv2.0/AGENTS.md` тем же revert;
4. убедиться, что HumanOS 2.0 docs/runtime не изменились.

## Data impact

Нет.

## Runtime impact

Нет.

## External systems impact

Нет.
