# Протокол качества Codex для ALIVE

Этот документ появился после неудовлетворительного качества части ранних agent-generated изменений.

Проблема оказалась не только в модели, но и в процессе: слишком широкий scope, недостаточно жёсткие локальные инструкции, отсутствие обязательного preflight, слабая проверка реального интерфейса и возможность объявлять работу законченной после статического review.

Цель протокола — сделать Codex исполнителем проверяемого инженерного процесса, а не генератором большого diff.

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

Перед первым изменением кода Codex обязан выполнить preflight.

### Preflight output

В `releases/<release>/IMPLEMENTATION_PLAN.md` записать:

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

После записи плана Codex должен сверить его с Product Strategy и только затем продолжить.

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

Это соответствует механике Codex: инструкции более глубокого `AGENTS.md` применяются к своему subtree и имеют приоритет над более общими repo-инструкциями.

## 5. Skill routing обязателен

Перед задачей Codex определяет, какие специализированные skills/tools применимы.

См. `docs/CODEX_SKILL_ROUTING.md`.

Правило:

> если для задачи существует установленный специализированный skill, Codex не должен заменять его собственной памятью без причины

Примеры:

- PostgreSQL/Supabase schema → Supabase/Postgres best-practices skill;
- Cloudflare Worker → Workers best-practices + Wrangler;
- web performance → web-perf;
- GitHub CI failure → gh-fix-ci;
- PR publishing → yeet/GitHub workflow;
- browser UX → browser/computer-use/Playwright workflow, если доступен.

Если skill недоступен, Codex пишет это в validation notes и использует официальную актуальную документацию.

## 6. Не один большой шаг, а последовательные checkpoints

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

Проверить, что новое поведение видно в analytics/admin.

### Фаза E — QA

Build, tests, browser, privacy/RLS, diff review.

Нельзя одновременно открыть пять незавершённых архитектурных направлений.

## 7. Vertical slice прежде taxonomy completeness

Если задача включает большой каталог/модель, сначала проверить один сквозной пример.

Например для 4.0:

`сигарета после еды → микроосознанность → прогулка → outcome → metric update → admin event`

Только после прохождения этого пути расширять остальные сценарии.

Это снижает риск создать красивую, но несвязанную schema/UI.

## 8. Implementation invariants

Для release создаётся список инвариантов, которые не должны нарушаться.

Примеры:

- НЗТ не называется курением;
- vape/hookah не получают cigarette Health Minutes;
- quick log не считается craving intervention;
- private `Зачем` не попадает в admin analytics;
- пользовательский интерфейс русский;
- удаление события пересчитывает производные данные;
- один пользователь не видит данные другого.

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

Для user-facing release Codex должен, если доступен browser/computer-use/Playwright:

1. открыть приложение;
2. пройти критический сценарий;
3. проверить desktop;
4. проверить mobile viewport;
5. проверить loading/empty/error;
6. проверить тексты и CTA;
7. проверить, что действия реально сохраняются;
8. сделать повторный проход после исправлений.

Если browser tool недоступен — gate остаётся `НЕ ПРОВЕРЕНО`.

Нельзя заменить это утверждением «по коду должно работать».

## 11. Performance review для критических flows

После появления preview user-facing релиза использовать специализированный web performance audit, если соответствующий skill/tool доступен.

Особый приоритет:

- время до интерактивного home;
- открытие `Хочу закурить`;
- latency первого полезного ответа;
- отсутствие layout shift CTA;
- bundle regressions.

Оптимизация выполняется только после измерения.

## 12. Database quality gate

Любое изменение schema проходит:

- актуальную development copy/branch;
- migrations в правильном порядке;
- RLS tests;
- security advisor;
- performance advisor;
- проверку существующих данных;
- rollback/forward-fix;
- проверку delete/correction/recompute.

Нельзя применять новую schema к live alpha только потому, что SQL синтаксически выглядит корректно.

## 13. Evidence/content gate

Для медицински значимого контента Codex обязан проверить:

- claim существует;
- source существует;
- source действительно подтверждает claim;
- ограничения перенесены в user copy;
- пользовательский текст русский;
- текст не превращает correlation/population estimate в персональный факт;
- review date задана.

Если нужно новое медицинское утверждение — сначала research/evidence update, затем UI.

## 14. Adversarial self-review

После реализации Codex обязан сделать отдельный review собственного diff как будто код написал другой разработчик.

Review должен искать:

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

Найденные проблемы исправляются до handoff.

## 15. Независимый reviewer предпочтителен

Для крупных PR предпочтительна схема:

### Агент 1

Реализует release.

### Агент 2

Получает PR/diff без авторского контекста и делает независимый review по:

- product invariants;
- architecture;
- security;
- data correctness;
- UX;
- tests.

Автор исправляет замечания.

Если multi-agent режим недоступен, это явно записывается как отсутствие независимого review.

## 16. Diff budget

Codex обязан избегать unrelated cleanup.

Перед завершением вывести:

- список изменённых файлов;
- зачем изменён каждый;
- какие изменения являются strictly necessary;
- нет ли generated/noise files;
- нет ли случайного formatting churn.

Если diff невозможно осмысленно описать, scope слишком большой.

## 17. Никаких скрытых fallback'ов

Ошибка не должна тихо превращаться в другое поведение.

Например:

- отсутствие Evidence content не должно генерировать медицинский текст LLM;
- ошибка ranking не должна выбирать случайную Замены без маркировки fallback;
- отсутствие user data не должно создавать выдуманную персонализацию.

Fallback должен быть безопасным и наблюдаемым.

## 18. Условия остановки Codex

Codex прекращает implementation и фиксирует blocker, если обнаружено:

- destructive migration без owner decision;
- медицински значимое решение без evidence;
- privacy model change;
- конфликт accepted documents;
- неизвестный production secret;
- невозможность безопасно мигрировать существующие данные;
- задача требует внешнего production action, которое не было разрешено.

Не останавливать работу из-за обычной сложности: выполнять максимально возможную безопасную часть.

## 19. Финальный отчёт строго фактический

Формат handoff:

### Реализовано

Только фактически сделанное.

### Проверено

Таблица/список:

- typecheck — PASS/FAIL/НЕ ПРОВЕРЕНО;
- build — ...;
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

Перед передачей owner Codex оценивает release по 0/1 для каждого критерия:

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

## 21. Что должно улучшить качество больше всего

Приоритет мер:

1. маленький vertical slice;
2. scoped AGENTS;
3. task-specific skills;
4. programmatic tests;
5. реальный browser QA;
6. независимый reviewer;
7. структурированный handoff.

Просто увеличить длину master prompt — недостаточно.

## 22. Итог

> **Codex оценивается не по объёму созданного кода, а по количеству подтверждённых продуктовых инвариантов, прошедших tests и реально работающих пользовательских сценариев.**
