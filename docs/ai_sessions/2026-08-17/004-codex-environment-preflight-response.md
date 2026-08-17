# Ответ AI — Codex environment preflight

Дата: 2026-08-17

## Принятое решение

Для ALIVE введён обязательный environment gate перед любой значимой Codex implementation task.

Главное правило:

> **нет локального git checkout `wd7b3k/Alive` — нет implementation release**

## Что изменено

### `docs/CODEX_QUALITY_PROTOCOL.md`

Добавлен `Environment preflight` как шаг 0 до чтения product context и до кода.

Codex обязан проверить:

- локальный git root;
- remote repository;
- branch/base state;
- наличие `README.md`, `AGENTS.md`, `app/`, `docs/`, `releases/`;
- возможность выполнять локальные validation commands.

При отсутствии checkout обязательный blocker:

`BLOCKED: LOCAL_REPOSITORY_UNAVAILABLE`

GitHub Connector явно запрещён как замена локального checkout.

### `releases/v4.0.0-alpha.1/CODEX_LAUNCHER.md`

Создан новый короткий обязательный launcher для Codex.

Он:

1. сначала выполняет environment preflight;
2. при ошибке прекращает задачу без remote implementation;
3. после PASS требует записать Environment Check в `IMPLEMENTATION_PLAN.md`;
4. только затем направляет к каноническим repo docs и полному `CODEX_PROMPT.md`;
5. сохраняет vertical-slice-first, skills, tests, browser QA, self-review и independent review requirements.

### `releases/v4.0.0-alpha.1/README.md`

Launcher сделан обязательной первой точкой входа для Codex.

### `docs/decisions/2026-08-17-codex-local-checkout-gate.md`

Отдельно зафиксированы:

- исходный сбой;
- архитектурная причина запрета remote-only implementation;
- роль GitHub Connector;
- влияние решения на roadmap.

### `docs/PROJECT_EVOLUTION.md`

Добавлен новый этап эволюции процесса разработки — environment gate после первого запуска 4.0.

## Почему это должно повысить качество

Раньше Codex мог оказаться в неверной среде и начать компенсировать отсутствие локальной рабочей копии дополнительной импровизацией.

Теперь такой режим не допускается технически на уровне процесса.

Это предотвращает:

- реализацию с неполным source tree;
- remote diff без локального build/tests;
- ложный PASS;
- обход scoped `AGENTS.md` нормального filesystem workflow;
- попытку заменить browser/database validation удалённым чтением файлов.

## Что не менялось

- product strategy;
- roadmap sequence;
- runtime code;
- Supabase production state;
- `4.0.0-alpha.1` functional scope.

Изменение является cross-cutting quality gate для текущего и будущих release units.
