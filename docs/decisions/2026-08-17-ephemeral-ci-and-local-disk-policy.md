# Решение: ephemeral CI и минимизация локальных записей

Дата: 2026-08-17

## Контекст

В owner-driven workflow ALIVE агент может работать через GitHub integration без необходимости локального checkout. При этом Codex начал создавать значительное количество временных файлов на локальном диске владельца и предложил платную Supabase development branch для DB/RLS validation.

Оба поведения признаны нежелательными для текущей стадии проекта.

## Решение

### 1. Локальный диск владельца не является рабочим хранилищем проекта

Все долговечные и полезные для продолжения разработки материалы должны жить в `wd7b3k/Alive`:

- исходники;
- migrations;
- tests;
- release docs;
- decisions;
- AI audit trail;
- CI configuration;
- воспроизводимые test fixtures без sensitive data.

Codex не должен по умолчанию создавать на диске владельца долговечные копии repository, ZIP, build output, `node_modules`, Docker volumes, тестовые БД, дубли документов и отчётов.

Краткоживущие локальные temp-файлы допустимы только при технической необходимости и не являются source of truth.

### 2. Тяжёлые временные проверки выполняются на ephemeral remote infrastructure

Для build/tests приоритет — GitHub Actions.

Для database validation текущий бесплатный default:

`GitHub Actions runner → Supabase CLI → temporary Docker Supabase stack → migrations → pgTAP/RLS tests → runner destroyed`

Платная Supabase Preview/Development Branch не является стандартным gate.

### 3. Платная dev-инфраструктура требует отдельного основания

Платная Supabase branch может использоваться только если:

- нужную проверку невозможно воспроизвести на ephemeral CI stack;
- польза от отдельной долгоживущей среды явно сформулирована;
- стоимость согласована владельцем заранее.

До этого Codex обязан искать бесплатный воспроизводимый путь.

## Почему

- owner не должен становиться DevOps для управления агентной разработкой;
- git уже является механизмом хранения, истории и rollback;
- ephemeral CI уменьшает локальный мусор и делает проверки воспроизводимыми для любого следующего агента;
- отдельная платная БД преждевременна до доказательства ценности продукта;
- CI test environment должен создаваться из repository, а не зависеть от ручного состояния одной машины.

## Следствия

- `docs/CODEX_EXECUTION_MODES.md` обновлён;
- будущие prompts/agents должны предпочитать remote ephemeral validation;
- Supabase DB/RLS tests следует оформить как GitHub Actions workflow;
- любые непроверяемые в CI особенности остаются отдельным gate, а не поводом автоматически включать платный сервис.
