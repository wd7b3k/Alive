# Протокол качества Codex для ALIVE

Цель этого документа — обеспечить высокое качество agent-generated изменений без превращения процесса разработки в технический барьер для владельца проекта.

Качество оценивается не объёмом diff, а количеством реально проверенных продуктовых инвариантов и пользовательских сценариев.

Канонический принцип:

> **лучше маленький полностью проверенный vertical slice, чем большой непроверенный релиз**

## 0. Сначала определить режим работы

Перед задачей Codex определяет доступный execution mode согласно `docs/CODEX_EXECUTION_MODES.md`.

Допустимы два режима:

### Direct GitHub Mode

Нормальный режим owner-driven разработки, когда repository доступен через GitHub integration/connector, но локального checkout нет.

Codex читает и меняет repository непосредственно через подключённый GitHub, работает в отдельной branch, использует commits/PR для rollback и remote validation для проверки результата.

### Local Repository Mode

Если полноценный локальный checkout уже доступен, Codex использует обычный git/shell workflow.

**Локальный checkout не является обязательным условием.**

Отсутствие `.git` в временной рабочей папке не является blocker, если `wd7b3k/Alive` доступен через GitHub на чтение и запись.

Codex останавливается только при настоящем blocker из `CODEX_EXECUTION_MODES.md`.

## 1. Общий environment preflight

До реализации Codex фиксирует:

- repository;
- execution mode;
- source/base branch;
- target branch;
- возможность читать repository;
- возможность безопасно писать в отдельную branch;
- доступные CI/build/test capabilities;
- browser QA capability;
- Supabase capability, если затрагивается БД;
- доступные relevant skills;
- ограничения среды.

В Direct GitHub Mode не требуется выполнять `git rev-parse`, `git status` или ручной clone.

В Local Repository Mode локальные git-команды используются как дополнительная быстрая проверка.

## 2. Codex не начинает с кода

Перед первым runtime/code изменением Codex обновляет:

`releases/<release>/IMPLEMENTATION_PLAN.md`

План содержит:

- `Я понял ALIVE так`;
- текущий baseline;
- пользовательскую проблему;
- гипотезу;
- exact scope;
- explicit non-goals;
- product invariants;
- затрагиваемые modules;
- tables/API/contracts;
- analytics events;
- privacy/evidence risks;
- compatibility с существующими данными;
- migration strategy;
- testing strategy;
- remote/local validation strategy;
- rollback/forward-fix;
- unknown assumptions.

После записи плана Codex сверяет его с Product Strategy и Requirements.

## 3. Context checksum

Перед реализацией в плане фиксируется короткий блок:

### Я понял ALIVE так

- product thesis;
- цель release;
- North Star;
- главные non-goals;
- privacy/evidence constraints;
- source of truth;
- почему эта задача нужна сейчас.

Если документы противоречат друг другу по смыслу задачи, Codex не маскирует конфликт кодом.

## 4. Scoped AGENTS обязательны

Root `AGENTS.md` задаёт общие правила.

Более локальные правила:

- `app/AGENTS.md` — frontend, UX, localization, QA;
- `supabase/AGENTS.md` — PostgreSQL, migrations, RLS, integrity;
- `docs/AGENTS.md` — documentation, evidence, history.

Перед изменением subtree применять наиболее локальный `AGENTS.md`.

## 5. Skill routing обязателен

Codex определяет полезные skills/tools по `docs/CODEX_SKILL_ROUTING.md`.

Если релевантный специализированный skill доступен, его следует использовать вместо импровизации по памяти.

Особенно:

- Supabase/Postgres best practices — schema/RLS/SQL;
- browser/Playwright/Computer Use — UX QA;
- GitHub/CI workflow — checks/PR/review;
- web performance — после появления preview и измеряемой проблемы;
- Cloudflare/Wrangler — только при изменении Cloudflare runtime.

Недоступность необязательного skill не блокирует release: это фиксируется как limitation.

## 6. Checkpoints вместо большого скачка

Даже один release реализуется фазами.

### A — Contracts

- types;
- schema/interfaces;
- analytics contracts;
- pure logic tests.

### B — Mandatory vertical slice

Один реальный end-to-end path.

### C — Expansion

Дополнительные состояния и продукты только после проверки основного slice.

### D — Observability

Проверить, что новое поведение корректно видно в analytics/admin.

### E — QA

Tests/build/CI, database gates, preview/browser QA, diff review.

## 7. Vertical slice прежде полноты taxonomy

Для ALIVE 4.0 первый обязательный пример:

`сигарета после еды → микроосознанность → действие → outcome → три метрики → learning → admin event`

Не расширять всю систему, пока этот путь не связан end-to-end.

## 8. Implementation invariants

Для release задаётся явный список инвариантов.

Примеры:

- НЗТ не называется курением;
- vape/hookah не получают cigarette Health Minutes;
- quick log не считается craving intervention;
- private `Зачем` не попадает в generic analytics;
- UI на русском;
- удаление/исправление raw event пересчитывает derived state;
- пользователь не видит private данные другого пользователя.

Каждый invariant проверяется перед handoff.

## 9. Tests появляются вместе с логикой

Новая нетривиальная domain logic без automated проверки не считается законченной, если testing capability доступна.

Приоритет:

- metric calculations;
- ranking;
- analytics mapping;
- migration transforms;
- delete/recompute;
- content selection;
- permission helpers.

В Direct GitHub Mode предпочтительный runner — GitHub Actions или другой подключённый CI.

Если automated runner отсутствует, пункт честно получает `НЕ ПРОВЕРЕНО`; это не требует от владельца вручную поднимать локальную среду.

## 10. Browser QA пользовательского интерфейса

Build не доказывает удобство.

Если доступен preview и browser capability, Codex проверяет:

1. critical user flow;
2. desktop;
3. mobile;
4. loading;
5. empty;
6. error;
7. тексты и CTA;
8. фактическое сохранение результата.

В Direct GitHub Mode предпочтителен deployed preview.

Если preview/browser недоступны — `НЕ ПРОВЕРЕНО`, а не требование ручной настройки владельцем.

## 11. Производительность

После появления preview и только при наличии измеряемого основания проверять:

- time to useful home;
- открытие `Хочу закурить`;
- latency первого полезного response;
- layout shift CTA;
- bundle regressions.

Оптимизация выполняется после измерения.

## 12. Database quality gate

Любая новая schema до применения к live alpha должна пройти максимально доступный development gate:

- migrations в правильном порядке;
- RLS isolation;
- security advisor;
- performance advisor;
- existing-data compatibility;
- correction/delete/recompute;
- rollback/forward-fix.

В Direct GitHub Mode использовать Supabase tooling/development branch/project вместо требования локальной БД.

### Fail semantics инструментов

Зелёный GitHub conclusion сам по себе не доказывает, что вложенный инструмент реально применял gate.

Для каждой CI-команды, которая должна останавливать workflow при дефекте, Codex обязан:

- явно задать fail semantics инструмента (`--fail-on error`, strict mode или документированный эквивалент), если default допускает exit code 0 при diagnostics;
- проверить в логе фактически исполненную команду, а не только YAML и conclusion;
- проверить ожидаемый success marker и отсутствие diagnostics запрещённого уровня;
- не использовать фильтр, `continue-on-error` или подавление exit code без отдельного обоснования и видимого статуса;
- считать прошлый green run недействительным evidence, если обнаружена false-green semantics, и повторить gate на свежем runner.

Урок PR #8: `supabase db lint --level error` выводил ошибку отсутствующей relation, но завершался успешно из-за default `--fail-on none`. Каноническая команда ALIVE: `supabase db lint --level error --fail-on error`.

## 13. Evidence/content gate

Медицински значимый пользовательский content должен иметь:

- approved claim;
- реальный source;
- соответствие source claim;
- ограничения;
- русскую user copy;
- review date.

LLM не является источником medical fact.

Новое медицинское утверждение сначала проходит research/evidence update.

## 14. Adversarial self-review

После реализации Codex отдельно ревьюит собственный diff как чужой код.

Ищет:

- нарушение strategy;
- лишний scope;
- data loss;
- privacy/RLS leak;
- analytics contamination;
- медицинскую неточность;
- английские user-facing хвосты;
- unreachable/error/empty states;
- duplicated business logic;
- hardcode;
- слабые или фиктивные tests.

Подтверждённые проблемы исправляются до handoff.

## 15. Независимый reviewer предпочтителен

Если multi-agent review доступен, отдельный агент получает PR/diff и проверяет:

- product invariants;
- architecture;
- security/privacy;
- data correctness;
- UX;
- tests.

Если такой capability нет — это фиксируется как `НЕ ПРОВЕРЕНО`, а не становится owner blocker.

## 16. Diff budget

Не делать unrelated cleanup.

Перед handoff указать:

- changed files;
- зачем изменён каждый;
- какие изменения strictly necessary;
- нет ли formatting/generated noise.

## 17. Никаких скрытых fallback

Ошибка не должна незаметно превращаться в выдуманное поведение.

Например:

- нет Evidence → не генерировать medical claim;
- ranking failure → безопасный наблюдаемый fallback;
- нет personal history → не изображать персонализацию.

## 18. Настоящие условия остановки

Codex прекращает implementation только при реальном blocker, например:

- нет доступа к repository ни локально, ни через GitHub;
- нет write access для отдельной branch;
- destructive migration без owner decision;
- medical decision без evidence;
- privacy model change без owner gate;
- неизвестный обязательный secret;
- невозможно безопасно мигрировать данные;
- нельзя обеспечить rollback/forward-fix для опасного изменения.

**Обычная сложность или отсутствие локального checkout не являются blocker.**

## 19. Validation не должен становиться барьером

Если конкретный local tool недоступен, Codex обязан сначала искать remote/connected equivalent.

Примеры:

- local build → CI build;
- local tests → CI tests;
- local diff → PR diff;
- local browser → preview QA;
- local database → Supabase development tooling.

Если эквивалента нет:

- выполнить безопасную часть;
- пометить gate `НЕ ПРОВЕРЕНО`;
- не заставлять владельца вручную становиться DevOps/разработчиком.

## 20. Финальный отчёт строго фактический

Handoff содержит:

### Режим выполнения

- Direct GitHub / Local Repository;
- repository;
- base;
- target branch;
- PR/commit.

### Реализовано

Только фактически сделанное.

### Проверено

Для каждого gate:

- PASS;
- FAIL;
- НЕ ПРОВЕРЕНО.

Минимально:

- source/base/branch;
- typecheck;
- build;
- tests;
- browser desktop;
- browser mobile;
- DB migrations;
- RLS;
- advisors;
- analytics;
- evidence;
- independent review.

### Не проверено

Без эвфемизмов.

### Известные ограничения

Конкретно.

### Следующий шаг

Наименьший логичный следующий slice.

## 21. Quality scorecard

Перед передачей owner оценить 0/1:

- стратегия соблюдена;
- scope сфокусирован;
- данные корректны;
- privacy/RLS проверены где применимо;
- evidence проверено;
- analytics интерпретируемы;
- automated checks выполнены где доступны;
- build/CI прошёл где доступен;
- browser flow проверен где доступен;
- mobile проверен где доступен;
- error/empty states проверены;
- русский UI проверен;
- документация обновлена;
- rollback существует;
- self-review выполнен.

Нельзя называть релиз полностью проверенным, если критический gate не выполнен.

Но неполный validation state не должен искусственно блокировать безопасную работу в отдельной branch.

## 22. Итог

> **ALIVE должен развиваться агентами безопасно и последовательно непосредственно из доступной подключённой среды. Качество обеспечивается ветками, наблюдаемыми проверками, evidence, тестами, preview и rollback — а не обязательной локальной инженерной настройкой владельца.**
