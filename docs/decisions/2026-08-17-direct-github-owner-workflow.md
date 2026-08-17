# Решение: Direct GitHub Mode является нормальным owner workflow

Дата: 2026-08-17

## Контекст

После усиления Codex quality protocol было введено обязательное требование локального git checkout.

На практике это создало неправильный барьер: владелец ALIVE управляет разработкой через агентов и подключённые документы/integrations и не должен становиться программистом, настраивать CLI authentication, GitHub Desktop или локальную DevOps-среду только ради того, чтобы агент мог продолжить работу.

Fail-fast корректно обнаружил отсутствие локального checkout, но само требование оказалось неверным для реального owner workflow.

## Решение

ALIVE официально поддерживает два режима разработки:

1. **Direct GitHub Mode** — основной owner-driven режим;
2. **Local Repository Mode** — дополнительный режим, если локальный checkout уже доступен.

В Direct GitHub Mode агент работает непосредственно через GitHub integration/connector:

- читает repository;
- создаёт/использует отдельную branch;
- пишет commits;
- создаёт draft PR;
- использует GitHub Actions как remote build/test gate;
- использует preview для UX QA;
- использует Supabase tooling для database validation;
- документирует `PASS / FAIL / НЕ ПРОВЕРЕНО`.

Отсутствие `.git` в локальной временной папке больше не является blocker.

## Почему это безопасно

Основной rollback ALIVE строится не на ручных копиях проекта владельца, а на:

`base branch → feature branch → commits → draft PR → validation → owner gate → merge`

Неудачный release можно не merge, закрыть или откатить через git history.

Destructive database changes по-прежнему требуют отдельного gate и rollback/forward-fix.

## Что остаётся строгим

Ослабление local-checkout требования не означает ослабление качества.

Остаются обязательными:

- отдельная branch;
- документация;
- implementation plan;
- vertical slice first;
- evidence-first medical content;
- privacy/RLS discipline;
- CI/tests где доступны;
- preview/browser QA где доступны;
- self-review;
- явный validation status;
- owner merge gate.

## Что считается настоящим blocker

- repository недоступен ни локально, ни через GitHub;
- нет write access для требуемого изменения;
- невозможно работать в отдельной branch;
- destructive/privacy/medical change требует owner decision;
- нельзя обеспечить безопасный rollback;
- требуется недоступный обязательный secret.

## Последствия

Создан `docs/CODEX_EXECUTION_MODES.md`.

`docs/CODEX_QUALITY_PROTOCOL.md` и `releases/v4.0.0-alpha.1/CODEX_LAUNCHER.md` обновлены под dual-mode workflow.

Более ранний local-checkout-only decision считается историческим экспериментом процесса и superseded этим решением.
