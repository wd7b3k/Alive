# Launcher для Codex — ALIVE 4.0.0-alpha.1

Это первый prompt для реализации `4.0.0-alpha.1`.

Полная спецификация release живёт в `CODEX_PROMPT.md` и канонических документах repository.

---

Работай с private repository `wd7b3k/Alive`.

Нужно реализовать первый пользовательский release новой серии:

**ALIVE `4.0.0-alpha.1`**

Ожидаемая base branch:

`agent/r1-data-evidence-admin`

Целевая рабочая ветка:

`agent/v4.0.0-alpha.1`

## Шаг 0 — определить режим выполнения, но не создавать владельцу барьеры

Прочитай `docs/CODEX_EXECUTION_MODES.md`.

Допустимы два режима.

### Direct GitHub Mode — нормальный режим

Если локального checkout нет, но через GitHub integration/connector доступен `wd7b3k/Alive` на чтение и запись, **продолжай работу**.

Не требуй от владельца:

- `git clone`;
- GitHub Desktop;
- CLI authentication;
- ручной терминал;
- локальный Node/Supabase;
- создания repository environment.

В этом режиме:

- читай repository через GitHub;
- используй отдельную branch;
- делай небольшие логические commits;
- используй PR diff как основной diff review;
- GitHub Actions как build/typecheck/test gate, если доступны;
- Supabase tooling/development environment для database gate;
- deployed preview + browser capability для UX QA, если доступны;
- все недоступные проверки честно отмечай `НЕ ПРОВЕРЕНО`.

### Local Repository Mode

Если полноценный локальный checkout уже существует, можешь использовать обычный shell/git workflow.

Но это дополнительная возможность, а не условие продолжения.

### Остановись только при настоящем blocker

Например:

- `wd7b3k/Alive` недоступен вообще;
- нет write access, а задача требует изменений;
- невозможно использовать отдельную branch;
- destructive/privacy/medical решение требует owner gate;
- невозможно обеспечить безопасный rollback.

**Отсутствие `.git` в текущей временной папке blocker не является.**

## Environment Check

До runtime-изменений зафиксируй в `IMPLEMENTATION_PLAN.md`:

```text
repository: wd7b3k/Alive
execution mode: Direct GitHub | Local Repository
base branch:
target branch:
repository read access:
repository write access:
CI capability:
browser/preview capability:
Supabase capability, если требуется:
relevant skills available:
known environment limitations:
```

## Затем восстанови контекст

Прочитай:

1. `README.md`
2. root `AGENTS.md`
3. применимые scoped `AGENTS.md`
4. `docs/CURRENT_STATE.md`
5. `docs/PROJECT_EVOLUTION.md`
6. `docs/PRODUCT_STRATEGY.md`
7. `docs/TECHNICAL_STRATEGY.md`
8. `docs/DEVELOPMENT_RULES.md`
9. `docs/CODEX_EXECUTION_MODES.md`
10. `docs/CODEX_QUALITY_PROTOCOL.md`
11. `docs/CODEX_SKILL_ROUTING.md`
12. `docs/AGENT_CONTINUITY.md`
13. `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`
14. `docs/METHODOLOGY.md`
15. `docs/PRODUCT_PRINCIPLES.md`
16. `docs/DATA_MODEL.md`
17. `docs/ARCHITECTURE.md`
18. `docs/PRIVACY_AND_DATA.md`
19. `docs/HYPOTHESES_AND_METRICS.md`
20. `docs/ROADMAP.md`
21. `releases/v4.0.0-alpha.1/README.md`
22. `releases/v4.0.0-alpha.1/REQUIREMENTS.md`
23. `releases/v4.0.0-alpha.1/VALIDATION.md`
24. `releases/v4.0.0-alpha.1/ROLLBACK.md`
25. полностью `releases/v4.0.0-alpha.1/CODEX_PROMPT.md`

Если старый документ требует обязательный local checkout, это требование superseded `CODEX_EXECUTION_MODES.md`.

## Не начинай с кода

Сначала полностью заполни:

`releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md`

Зафиксируй:

- `Я понял ALIVE так`;
- пользовательскую проблему;
- product hypothesis;
- exact scope;
- non-goals;
- invariants;
- modules/tables/API;
- analytics contract;
- compatibility;
- privacy/evidence risks;
- testing strategy;
- remote/local validation strategy;
- skill/tool routing;
- checkpoints;
- rollback/forward-fix;
- unknown assumptions.

После этого проверь план против Product Strategy и Requirements.

## Skills

Если Skills доступны, используй `skills/alive-release-quality/SKILL.md` и только релевантные специализированные skills по `docs/CODEX_SKILL_ROUTING.md`.

Особенно полезны:

- Supabase/Postgres best practices — schema/RLS/SQL;
- browser/Playwright/Computer Use — preview UX QA;
- GitHub/CI — branch/PR/checks/review;
- web performance — после preview и только по измеряемой проблеме;
- Cloudflare/Wrangler — только при реальном изменении Cloudflare runtime.

Недоступность необязательного skill не является blocker.

## Главный implementation principle

**Не пытайся сразу построить весь 4.0.**

Сначала реализуй один сквозной mandatory vertical slice:

> **сигарета после еды → «Хочу закурить» → контекст → короткая микроосознанность из approved Факта/Мифа/Зачем → релевантное действие → outcome → время/деньги/≈здоровая жизнь → personal learning → корректная admin analytics**

До его связного end-to-end состояния не расширяй scope.

Затем продолжай по `CODEX_PROMPT.md` и `REQUIREMENTS.md`.

## Не добавляй в alpha.1

- local LLM;
- внешнюю AI-зависимость core flow;
- Tribute;
- referral;
- Telegram;
- wearables/sensors;
- complex ML;
- paywall/subscription;
- public profiles/leaderboard;
- unrelated refactoring.

## Product invariants

- весь user/admin UI на качественном русском;
- primary CTA — **«Хочу закурить»**;
- `Смыслы` → **`Зачем`**;
- постоянно видны: **Вернул время / Сохранил деньги / ≈ Сохранил здоровую жизнь**;
- cigarette Health Minutes не переносятся на vape/hookah;
- quick log не считается craving intervention;
- private `Зачем`/Связки/notes не попадают в generic analytics;
- medical copy только из Evidence Registry;
- Intervention Engine deterministic и работает без LLM;
- персонализация объясняется фактическими данными;
- НЗТ не является курительным lapse;
- cigarette/vape/hookah имеют разные behavioural semantics.

## Validation без ручной нагрузки на владельца

Выполни максимум доступного автоматически.

В Direct GitHub Mode предпочтительно:

1. review branch diff;
2. GitHub Actions typecheck/build/tests;
3. Supabase development validation, если затронута БД;
4. preview deployment;
5. browser QA desktop/mobile;
6. adversarial self-review;
7. independent reviewer-agent, если доступен.

Если какая-то проверка технически недоступна — отметь `НЕ ПРОВЕРЕНО`, объясни риск и продолжай безопасную часть работы.

**Не требуй от владельца вручную клонировать repo или запускать команды ради прохождения gate.**

## Документация обязательна

Обновляй:

- `IMPLEMENTATION_PLAN.md`;
- `VALIDATION.md`;
- `CURRENT_STATE.md`;
- release docs;
- decision docs;
- `PROJECT_EVOLUTION.md`, если меняется логика проекта;
- AI prompt/response audit trail.

Изменился roadmap — обнови `ROADMAP.md`.

## Git/PR

Работай в `agent/v4.0.0-alpha.1`.

Если branch уже существует, сначала прочитай её состояние/diff относительно base и продолжай её только если это безопасно.

Не merge самостоятельно.

Создай/обнови draft PR.

## Финальный handoff

Строго укажи:

### Режим выполнения

### Реализовано

### Что теперь может пользователь

### Проверено

Для каждого gate: `PASS / FAIL / НЕ ПРОВЕРЕНО`.

### Не сделано

### Известные ограничения

### Changed files и зачем

### Branch / PR / commit

### Следующий минимальный шаг

Цель:

> **не самый большой 4.0, а первый 4.0, которому можно доверять — без превращения владельца проекта в программиста или DevOps.**
