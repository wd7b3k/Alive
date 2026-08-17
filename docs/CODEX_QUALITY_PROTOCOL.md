# Протокол качества Codex для ALIVE

Этот документ появился после неудовлетворительного качества части ранних agent-generated изменений.

Проблема оказалась не только в модели, но и в процессе: слишком широкий scope, недостаточно жёсткие локальные инструкции, слабая проверка реального интерфейса и возможность объявлять работу законченной после статического review.

После отдельного сбоя 2026-08-17 добавлен ещё один обязательный принцип: **Codex не имеет права начинать release из пустого sandbox или пытаться заменить локальный checkout чтением репозитория через GitHub Connector.**

Цель протокола — сделать Codex исполнителем проверяемого инженерного процесса, а не генератором большого diff.

## 0. Environment preflight — до всего остального

Это первый шаг любой задачи, которая меняет код, schema, release docs или должна запускать проверки.

До чтения product context, создания плана и тем более до изменения файлов Codex обязан проверить, что текущая рабочая директория является локальным checkout `wd7b3k/Alive`.

Минимальная проверка:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git status --short --branch
test -f README.md
test -f AGENTS.md
test -d app
test -d docs
test -d releases
```

Codex должен установить фактически:

- существует локальный `.git`;
- `git rev-parse --show-toplevel` успешно возвращает корень checkout;
- repository соответствует `wd7b3k/Alive`;
- доступны `README.md`, `AGENTS.md`, `app/`, `docs/`, `releases/`;
- рабочая копия позволяет читать файлы и запускать локальные команды;
- текущая branch/base понятна;
- для release можно создать или переключить рабочую ветку обычным git workflow.

### Fail-fast

Если локального checkout нет, Codex **немедленно прекращает implementation** и возвращает:

```text
BLOCKED: LOCAL_REPOSITORY_UNAVAILABLE

Ожидается локальный git checkout wd7b3k/Alive.
GitHub Connector не используется как замена рабочей копии.
Нужно запустить задачу в Codex Environment, привязанном к repository wd7b3k/Alive.
```

После этого запрещено:

- реконструировать release только через GitHub Connector;
- писать файлы в remote repository вместо нормального локального workflow;
- заявлять, что build/tests/browser QA будут выполнены позднее из-за отсутствия checkout;
- клонировать неизвестный repository или branch без уверенности в source/base;
- продолжать «частичную реализацию», если задача требует изменения runtime.

### Роль GitHub Connector

Connector допустим **после успешного local preflight** для задач вроде:

- чтения remote PR/issue metadata;
- CI status/logs;
- публикации draft PR;
- remote review;
- проверки remote branch state.

Connector не является заменой:

- локального checkout;
- `git diff`;
- `npm install` / build / tests;
- migrations validation;
- browser QA;
- локального inspection source tree.

### Branch preflight

Перед кодом Codex также фиксирует:

```text
repository:
local root:
remote origin:
current branch:
expected base:
target branch:
working tree state:
```

Если текущая branch не соответствует ожидаемой base, Codex не начинает код молча: сначала безопасно приводит branch state к release contract или фиксирует blocker.

### Environment capability preflight

Codex должен проверить только реально необходимые для release capability:

- Node/npm для frontend;
- Supabase tooling/доступ к development environment — если затрагивается БД;
- browser/Playwright/Computer Use — если требуется user-facing QA;
- доступные skills;
- возможность запускать project validation commands.

Недоступный необязательный tool фиксируется как limitation. Недоступность **локального repository checkout** является blocker.

## 1. Главная причина прежних ошибок

Ранние prompts могли одновременно включать:

- создание ветки;
- frontend bootstrap;
- schema/RLS;
- auth;
- UI;
- документацию;
- release unit.

При этом значительная часть environment-dependent validation переносилась «на следующий gate».

Такой формат создаёт опасную иллюзию прогресса: большой diff выглядит как большой результат, хотя пользовательская и техническая корректность ещё не доказаны.

Новый принцип:

> **лучше маленький полностью проверенный vertical slice, чем большой непроверенный релиз**

## 2. Codex не начинает с кода

После успешного Environment preflight Codex читает обязательный repo context и до первого изменения runtime-кода полностью заполняет `releases/<release>/IMPLEMENTATION_PLAN.md`.

### Preflight output в плане

Записать:

- repository/environment checksum;
- текущий baseline;
- пользовательскую проблему;
- гипотезу;
- scope;
- explicit non-goals;
- затрагиваемые модули;
- затрагиваемые таблицы/API;
- аналитические события;
- privacy/evidence risks;
- migration strategy;
- тестовую стратегию;
- команды validation;
- rollback/forward-fix;
- неизвестные допущения.

После записи плана Codex сверяет его с Product Strategy и только затем продолжает.

Если найдено противоречие стратегии или текущего state — код не писать, сначала исправить/эскалировать противоречие.

## 3. Context checksum

Перед реализацией Codex оставляет короткий блок в плане:

### Я понял ALIVE так

- product thesis;
- цель текущего release;
- North Star;
- главные non-goals;
- важные privacy/evidence constraints;
- что является source of truth;
- почему эта задача нужна сейчас.

Если этот блок неверен, дальнейший код почти наверняка будет неверен.

## 4. Scoped AGENTS обязательны

Root `AGENTS.md` задаёт общие правила.

Дополнительные scoped files:

- `app/AGENTS.md` — frontend/UX/testing/localization;
- `supabase/AGENTS.md` — PostgreSQL/schema/RLS/migrations;
- `docs/AGENTS.md` — documentation/evidence/history.

При изменении файла Codex обязан соблюдать наиболее локальный применимый `AGENTS.md`.

## 5. Skill routing обязателен

Перед задачей Codex определяет, какие специализированные skills/tools применимы по `docs/CODEX_SKILL_ROUTING.md`.

Правило:

> если для задачи существует установленный специализированный skill, Codex не должен заменять его собственной памятью без причины

Приоритетные примеры:

- PostgreSQL/Supabase schema → Supabase/Postgres best-practices;
- Cloudflare runtime → Workers best-practices + Wrangler;
- web performance → профильный performance workflow;
- GitHub CI failure → профильный CI workflow;
- PR publishing/review → GitHub workflow;
- browser UX → browser/computer-use/Playwright workflow.

Если skill недоступен, Codex пишет это в validation notes и использует актуальную официальную документацию.

## 6. Последовательные checkpoints

Даже внутри одного release Codex работает фазами.

### Фаза A — Contracts

- types;
- schema;
- interfaces;
- events;
- tests для pure logic.

### Фаза B — Minimal vertical slice

Один реальный end-to-end path.

### Фаза C — Expansion

Дополнительные состояния и продукты только после работающего slice.

### Фаза D — Observability

Новое поведение видно в analytics/admin.

### Фаза E — QA

Build, tests, browser, privacy/RLS, diff review.

Нельзя одновременно открыть несколько незавершённых архитектурных направлений.

## 7. Vertical slice прежде taxonomy completeness

Если задача включает большой каталог/модель, сначала проверяется один сквозной пример.

Для первого 4.0 canonical slice:

`сигарета после еды → микроосознанность → релевантное действие → outcome → metric update → personal learning → admin event`

Только после прохождения этого пути расширяются остальные сценарии.

## 8. Implementation invariants

Для release создаётся список инвариантов.

Примеры ALIVE:

- НЗТ не называется курением;
- vape/hookah не получают cigarette Health Minutes;
- quick log не считается craving intervention;
- private `Зачем` не попадает в generic/admin analytics;
- пользовательский интерфейс русский;
- удаление события пересчитывает производные данные;
- один пользователь не видит данные другого;
- медицинский текст не генерируется без Evidence Registry.

Перед завершением Codex проверяет каждый invariant отдельно.

## 9. Tests появляются вместе с логикой

Новая нетривиальная domain logic без automated tests не считается законченной.

Особенно тестируются:

- расчёты;
- ranking;
- analytics event mapping;
- migration transforms;
- delete/recompute;
- content selection rules;
- permission helpers.

UI snapshots сами по себе не заменяют поведенческие tests.

## 10. Browser QA обязательно для пользовательского UI

TypeScript build не доказывает удобство интерфейса.

Для user-facing release Codex должен, если browser/computer-use/Playwright доступен:

1. открыть приложение;
2. пройти критический сценарий;
3. проверить desktop;
4. проверить mobile viewport;
5. проверить loading/empty/error;
6. проверить тексты и CTA;
7. проверить фактическое сохранение;
8. повторить проход после исправлений.

Если browser tool недоступен — gate остаётся `НЕ ПРОВЕРЕНО`.

Нельзя заменить это утверждением «по коду должно работать».

## 11. Performance review критических flows

После появления preview измеряется прежде всего:

- время до интерактивного Home;
- открытие `Хочу закурить`;
- latency первого полезного ответа;
- отсутствие layout shift CTA;
- bundle regressions.

Оптимизация выполняется после измерения.

## 12. Database quality gate

Любое изменение schema проходит:

- актуальную development copy/branch;
- migrations в правильном порядке;
- RLS tests;
- security advisor;
- performance advisor;
- проверку существующих данных;
- rollback/forward-fix;
- delete/correction/recompute.

Нельзя применять новую schema к live alpha только потому, что SQL визуально корректен.

## 13. Evidence/content gate

Для медицински значимого контента Codex обязан проверить:

- claim существует;
- source существует;
- source действительно подтверждает claim;
- ограничения перенесены в user copy;
- пользовательский текст русский;
- correlation/population estimate не превращён в персональный факт;
- review date задана.

Если нужно новое медицинское утверждение — сначала research/evidence update, затем UI.

## 14. Adversarial self-review

После реализации Codex делает отдельный review собственного diff как будто код написал другой разработчик.

Ищет:

- противоречие strategy;
- лишний scope;
- скрытые assumptions;
- data loss;
- RLS/privacy leak;
- analytics contamination;
- медицинскую неточность;
- локализационные хвосты;
- unreachable/empty/error states;
- duplicated business logic;
- hardcode;
- непроверенные claims;
- тесты, которые ничего не доказывают.

Подтверждённые проблемы исправляются до handoff.

## 15. Независимый reviewer предпочтителен

Для крупных PR предпочтительна схема:

- Агент 1 реализует release;
- Агент 2 получает PR/diff и независимо проверяет product invariants, architecture, security, data correctness, UX и tests;
- автор исправляет подтверждённые замечания.

Если multi-agent режим недоступен, это явно записывается.

## 16. Diff budget

Codex избегает unrelated cleanup.

Перед завершением вывести:

- изменённые файлы;
- зачем изменён каждый;
- какие изменения strictly necessary;
- generated/noise files;
- formatting churn.

Если diff невозможно осмысленно описать, scope слишком большой.

## 17. Никаких скрытых fallback

Ошибка не должна тихо превращаться в другое поведение.

Например:

- отсутствие Evidence content не генерирует медицинский текст LLM;
- ошибка ranking не выбирает случайную Замены без маркировки fallback;
- отсутствие user data не создаёт выдуманную персонализацию.

Fallback безопасен и наблюдаем.

## 18. Условия остановки Codex

Codex прекращает implementation и фиксирует blocker, если обнаружено:

- `LOCAL_REPOSITORY_UNAVAILABLE`;
- destructive migration без owner decision;
- медицински значимое решение без evidence;
- privacy model change;
- конфликт accepted documents;
- неизвестный production secret;
- невозможность безопасно мигрировать существующие данные;
- задача требует неразрешённого внешнего production action.

Обычная сложность blocker не является.

## 19. Финальный отчёт строго фактический

Формат handoff:

### Environment

- local checkout — PASS/FAIL;
- repository/remote — PASS/FAIL;
- expected base — PASS/FAIL;
- target branch — PASS/FAIL.

### Реализовано

Только фактически сделанное.

### Проверено

- typecheck — PASS/FAIL/НЕ ПРОВЕРЕНО;
- build — PASS/FAIL/НЕ ПРОВЕРЕНО;
- unit tests — ...;
- browser desktop — ...;
- browser mobile — ...;
- DB migrations — ...;
- RLS — ...;
- advisors — ...;
- analytics — ...;
- evidence review — ...;
- independent review — ... .

### Не проверено

Отдельно, без эвфемизмов.

### Известные ограничения

Конкретно.

### Следующий шаг

Наименьший логичный следующий slice.

## 20. Quality scorecard

Перед передачей owner Codex оценивает release по 0/1:

- environment корректен;
- стратегия соблюдена;
- scope сфокусирован;
- данные корректны;
- privacy/RLS проверены;
- medical evidence проверено;
- analytics интерпретируемы;
- automated tests есть;
- build проходит;
- browser flow проверен;
- mobile проверен;
- error/empty states проверены;
- русский UI проверен;
- документация обновлена;
- rollback существует;
- self-review выполнен.

Release не называется готовым, если критический пункт равен 0.

## 21. Приоритет мер качества

1. правильный локальный environment;
2. маленький vertical slice;
3. scoped AGENTS;
4. task-specific skills;
5. programmatic tests;
6. реальный browser QA;
7. независимый reviewer;
8. структурированный handoff.

Просто увеличить длину master prompt — недостаточно.

## 22. Итог

> **Codex оценивается не по объёму созданного кода, а по количеству подтверждённых продуктовых инвариантов, прошедших tests и реально работающих пользовательских сценариев. Если локального checkout нет — никакого release ещё не существует.**
