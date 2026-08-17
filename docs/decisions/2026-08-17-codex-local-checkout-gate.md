# Решение: обязательный local checkout gate для Codex

Дата: 2026-08-17

Статус: принято владельцем

## Контекст

При первом запуске Codex на release `4.0.0-alpha.1` агент оказался в рабочем окружении, где присутствовали только служебные каталоги `work/` и `outputs/`, а локальный checkout `wd7b3k/Alive` отсутствовал.

Codex корректно обнаружил отсутствие `.git` и обязательных repo-файлов, но затем начал рассматривать GitHub Connector как возможный способ продолжить задачу.

Для ALIVE это неприемлемо для implementation release, потому что такой режим не даёт надёжно выполнить:

- локальный git workflow;
- inspection полного source tree;
- `git diff`;
- package install;
- typecheck/build/tests;
- database migration validation;
- browser QA;
- scoped repository instructions в нормальном filesystem workflow.

## Решение

Любая значимая Codex-задача, меняющая runtime/schema/release, начинается с Environment preflight **до чтения продуктового контекста и до кода**.

Codex обязан подтвердить:

- локальный git checkout существует;
- repository соответствует `wd7b3k/Alive`;
- работают `git rev-parse` и `git status`;
- доступны `README.md`, `AGENTS.md`, `app/`, `docs/`, `releases/`;
- понятны base и target branch;
- можно запускать локальные команды проверки.

Если checkout отсутствует, обязательный результат:

`BLOCKED: LOCAL_REPOSITORY_UNAVAILABLE`

## Запрет

GitHub Connector нельзя использовать как замену локального checkout для реализации release.

Допустимая роль Connector после успешного preflight:

- PR/CI metadata;
- remote review;
- публикация draft PR;
- чтение remote issue/PR state.

## Почему это решение важно

ALIVE строится как repo-first проект, который должен безболезненно продолжаться любым агентом.

Repo-first означает не только «истина записана в GitHub», но и то, что implementation agent работает с полноценной локальной копией этой истины и может доказать результат локальными проверками.

Удалённое API-редактирование без checkout повышает риск:

- неполного контекста;
- непроверенного кода;
- несогласованных файлов;
- ложного PASS;
- большого remote diff без воспроизводимой validation.

## Изменения процесса

Обновлён `docs/CODEX_QUALITY_PROTOCOL.md`.

Для `4.0.0-alpha.1` создан отдельный обязательный `releases/v4.0.0-alpha.1/CODEX_LAUNCHER.md`.

`releases/v4.0.0-alpha.1/README.md` теперь указывает launcher как первую точку входа Codex.

## Влияние на roadmap

Порядок продуктовых этапов не меняется.

Это cross-cutting quality gate для всех последующих release units.

## Критерий отмены решения

Может быть пересмотрено только если Codex получит другой официально поддерживаемый implementation workflow, который обеспечивает эквивалентные гарантии local source tree, branch control, build/tests, diff review и browser/database validation.
