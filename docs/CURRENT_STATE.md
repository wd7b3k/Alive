# Текущее состояние ALIVE

## Статус репозитория

ALIVE — самостоятельный private repository `wd7b3k/Alive`.

`wd7b3k/Alive` — единственный source of truth.

Текущий runtime baseline на `main`: **ALIVE v3.0 product alpha / in development**.

Отдельный draft PR v3.1 с behavioral-depth/Together/Facts/Myths не является принятым production state до merge/owner gate.

## Strategy Foundation

Ветка:

`agent/product-strategy-foundation`

Draft PR:

`#6`

Назначение:

- новая Product Strategy;
- Technical Strategy;
- Evidence/Hypothesis boundaries;
- product-specific nicotine model;
- permanent freedom metrics;
- referral/donation/AI direction.

Каноническая формула:

> **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**

Strategy Foundation остаётся отдельным owner/merge gate.

## R1 — данные, доказательная база и контроль продукта

Рабочая ветка:

`agent/r1-data-evidence-admin`

Base:

`agent/product-strategy-foundation`

Draft PR:

`#7 — ALIVE R1: данные, доказательная база и контроль продукта`

PR mergeable, но остаётся draft до validation gates.

Цель R1:

> **создать правильную структуру данных, доказательной базы, персонального обучения и наблюдаемости до пользовательской перестройки 4.x**

### Персонализируемый domain

В ветке реализованы/спроектированы:

- категории Триггеров;
- собственные Триггеры пользователя;
- категории Замен;
- собственные Замены;
- пользовательские настройки общей Замены;
- контекстные правила вмешательств;
- новая сущность `Зачем` (`goals_catalog` / `user_goals`);
- совместимость со старыми `Смыслами` и `goal_text`;
- персональные проекции эффективности Триггеров и Замен в разрезе пользователя, продукта и контекста;
- полный пересчёт проекций после исправления или удаления исходного эпизода.

Raw episodes/actions остаются source of truth. Personal rankings — rebuildable projections.

### Типы эпизодов

R1 вводит явный `episode_kind`:

- `craving` — работа с импульсом/тягой;
- `quick_use` — быстрый факт уже состоявшегося употребления;
- `conscious_use` — будущий осознанный эпизод употребления;
- `unknown` — временная совместимость.

Это защищает аналитику от смешивания quick log и реального обращения за помощью при тяге.

### Evidence Registry

Добавлены:

- источники;
- проверяемые утверждения;
- claim-source links;
- отдельный русский пользовательский слой Фактов/Мифов;
- evidence level;
- limitations;
- review dates;
- контекст показа;
- история показов/полезности;
- перенос совместимого пользовательского состояния из legacy `user_myth_state` в новый слой.

Стартовая база преимущественно опирается на исследования, систематические обзоры и рекомендации последних лет; landmark studies сохраняются там, где остаются сильным актуальным основанием.

Темы включают:

- ≈20 минут ожидаемой жизни на сигарету как population-level heuristic basis;
- пользу отказа в разных возрастах;
- снижение смертности;
- сердечно-сосудистый риск;
- риск при малом числе сигарет;
- КПТ;
- персонализированные digital interventions;
- доказательную фармакологическую поддержку;
- физическую активность при тяге;
- психическое состояние;
- сон;
- вес;
- кальян;
- вейп;
- dual use.

Научный claim и мотивирующая русская user copy хранятся отдельно.

### Админский контур

Создан отдельный маршрут `/admin`.

Он предназначен для ответа на вопросы:

- используют ли ALIVE;
- доходят ли до реальной ценности;
- где и почему выпадают;
- какие interventions связаны с лучшими outcomes;
- насколько актуальна Evidence Registry;
- здоров ли технически продукт.

Dashboard показывает/должен показывать:

- активность;
- реальное использование craving help;
- долю эпизодов без целевого употребления;
- repeat use;
- cohort funnel;
- product breakdown;
- structured exit reasons;
- Facts/Myths usage/usefulness;
- Evidence freshness;
- technical errors;
- p95 latency после подключения client timing telemetry.

Private notes, личные тексты `Зачем` и свободные тексты чужих Связок в dashboard не загружаются.

### Product analytics

Введён отдельный `analytics_events` поток без sensitive free text.

DB-level capture фиксирует устойчивые domain milestones:

- регистрацию;
- onboarding completion;
- создание `Зачем`;
- создание Связки;
- завершение craving episode;
- quick use отдельно;
- intervention use;
- nicotine product event;
- вечернюю отметку.

Добавлен каталог структурированных причин остановки.

Точный шаг раннего закрытия modal до сохранения результата ещё требует client step telemetry.

## Read-only проверка живой Supabase

Без изменения schema/data подтверждены предпосылки R1:

- `profiles.role/status/onboarding_completed_at` существуют;
- необходимые episode/action/link/meaning/settings поля существуют;
- `public.set_updated_at()` существует;
- legacy `facts_catalog`, `myths_catalog`, `user_myth_state` существуют и учтены в migration strategy.

В живой БД на момент проверки нет пользователя с `role=admin`; есть одна активная учётная запись с `role=participant`.

Автоматически повышать существующих пользователей до администратора запрещено. После database gate нужен контролируемый owner admin bootstrap.

Security Advisor показывал только ранее известное предупреждение leaked-password protection. ALIVE сейчас использует Google OAuth, а password sign-in surface не активен.

Performance Advisor показал существовавшие unindexed foreign keys; R1 добавляет/планирует необходимые индексы. Unused-index notices на маленькой alpha-базе не являются автоматическим основанием удалять индексы.

## R1 открытые gates

R1 migrations **не применены к live alpha/production**.

До принятия R1 остаются:

- последовательное применение migrations на development DB/branch;
- RLS isolation tests;
- security/performance advisors после R1 migrations;
- фактический frontend typecheck/build PASS;
- browser QA `/admin`;
- client step telemetry для раннего выхода craving flow;
- owner review Evidence user copy;
- controlled owner admin bootstrap после DB gate.

GitHub connector ранее не вернул Actions status, поэтому CI PASS не заявляется без фактического результата.

## Новый жёсткий documentation rule

Владелец утвердил:

> **значимое решение, изменение, исследование или релиз без отражения в отдельных файлах git не считается завершённым**

Добавлены:

- `docs/PROJECT_EVOLUTION.md`;
- `docs/DEVELOPMENT_RULES.md`;
- `docs/AGENT_CONTINUITY.md`;
- `docs/CODEX_QUALITY_PROTOCOL.md`;
- `docs/CODEX_SKILL_ROUTING.md`;
- `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`;
- `docs/RESEARCH_MONITORING.md`;
- dated design/competitor research baseline;
- ADR перехода к 4.x и нового agent quality process.

README обновлён как основной индекс проекта.

## Scoped Codex contracts

Добавлены:

- `app/AGENTS.md`;
- `supabase/AGENTS.md`;
- `docs/AGENTS.md`.

Причина: один большой root `AGENTS.md` недостаточно надёжно задаёт требования для frontend, PostgreSQL/RLS и documentation work.

Scoped files задают локальные invariants и programmatic checks.

## Codex quality process

Ретроспектива ранних AI-сессий выявила паттерн:

> широкий prompt → большой diff → часть критических runtime/DB/browser проверок переносится на следующий gate

Это признано главным риском agent-driven разработки.

Новый обязательный loop:

`orient → implementation plan → one vertical slice → tests → validation → adversarial self-review → independent review → documentation → factual handoff`

Большой diff не является критерием успеха.

Portable Agent Skill:

`skills/alive-release-quality/SKILL.md`

Если Codex environment поддерживает Skills, его рекомендуется установить/использовать для каждого значимого ALIVE release.

## Specialized skills

Маршрутизация описана в `docs/CODEX_SKILL_ROUTING.md`.

Ключевые направления:

- Supabase/Postgres best practices для schema/RLS;
- GitHub CI/review/publish workflows;
- Cloudflare/Wrangler при изменении runtime/config;
- web performance после preview;
- browser/Computer Use/Playwright для реального UX QA, если доступны.

Нерелевантные skills не должны загружаться только «для полноты».

## Research monitoring

Создана scheduled task **ALIVE Research Watch**.

Расписание:

- еженедельно;
- понедельник утром;
- timezone Europe/Berlin;
- уведомление только при значимых новых данных или продуктовых изменениях.

Мониторятся:

- peer-reviewed cessation research;
- guidelines;
- digital personalization/JITAI;
- behavioural methods;
- treatment;
- AI safety/usefulness;
- wearables/sensors;
- Smoke Free, Kwit, QuitNow, EX Program, Pivot и новые заметные продукты;
- UX/platform trends.

Любой значимый finding получает решение:

`внедрить / проверить экспериментом / наблюдать / не использовать`

и после принятия фиксируется в repo.

## Design baseline

Создан `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md` и dated research note.

Benchmark включает:

- Smoke Free;
- Kwit;
- QuitNow;
- EX Program;
- Pivot;
- современные исследования digital cessation/personalization/JITAI;
- platform onboarding/feedback/accessibility patterns.

Главный design principle:

> **ALIVE должен быть умнее внутри, чем выглядит снаружи**

В high-load состоянии тяги cognitive load должен уменьшаться.

User/admin UI — качественный русский без machine jargon.

## Решение о серии 4.x

Следующий пользовательский цикл получает номер **4.x**.

Причина: новая версия меняет product backbone, а не просто расширяет v3.

ADR:

`docs/decisions/2026-08-17-v4-series-and-agent-quality.md`

Roadmap обновлён.

## 4.0.0-alpha.1

Release unit уже подготовлен:

`releases/v4.0.0-alpha.1/`

Содержит:

- README;
- REQUIREMENTS;
- IMPLEMENTATION_PLAN template;
- VALIDATION;
- ROLLBACK;
- master `CODEX_PROMPT.md`.

Цель alpha.1:

> **первый сквозной пользовательский контур новой модели**

Mandatory first vertical slice:

`сигарета после еды → Хочу закурить → контекст → микроосознанность → intervention → outcome → Time/Money/Health Minutes → learning → admin analytics`

Только после PASS этого slice расширяется оставшийся alpha.1 scope.

### Alpha.1 включает

- Home нового смысла;
- primary CTA `Хочу закурить`;
- `Смыслы → Зачем`;
- постоянные три метрики;
- contextual approved Fact/Myth/Зачем;
- deterministic Intervention Engine v1;
- personal-outcome ranking where justified;
- distinct cigarette/vape/hookah semantics;
- structured funnel telemetry;
- admin interpretation;
- automated tests для новой domain logic;
- browser/mobile QA;
- adversarial self-review;
- independent reviewer where available.

### Alpha.1 не включает

- local LLM;
- Tribute;
- referral;
- Telegram;
- full Together redesign;
- wearables/sensors;
- complex ML;
- paywall/subscription;
- public social layer.


### Фактическое выполнение alpha.1 — 2026-08-17

Созданы:

- branch `agent/v4.0.0-alpha.1` от `agent/r1-data-evidence-admin`;
- draft PR #8;
- полный implementation plan до runtime-кода;
- pure domain layer для freedom metrics, deterministic intervention ranking, awareness fatigue и analytics allowlist;
- компактный canonical cigarette flow с CTA `Хочу закурить`;
- R1 runtime adapter с безопасным legacy fallback;
- явное разделение `craving` / `quick_use`;
- структурированная client funnel telemetry и её русская admin-интерпретация;
- atomic/idempotent awareness RPC и unique canonical event key по `flow_id`;
- outcome retry без повторного сохранения episode и без показа неподтверждённых метрик;
- 11 automated domain tests.

Фактически выполнены `npm ci`, typecheck, 11/11 tests и production build. Build сохраняет предупреждение о bundle chunk больше 500 kB.

Adversarial self-review и независимый статический review завершены: все подтверждённые P1/P2 исправлены, финальный reviewer не нашёл новых P1/P2. Это не заменяет DB validation.

Canonical E2E ещё не получил PASS: подключённый Supabase project содержит только v3.1, R1/alpha migrations не применялись к live, development branch требует owner cost confirmation. Preview, authenticated browser QA desktop/mobile, DB learning/admin verification, performance и GitHub Actions status остаются `НЕ ПРОВЕРЕНО`.

Поэтому scope на отдельные vape/hookah flows не расширен. Это stop condition release, а не незаметно перенесённая работа.

## Живая инфраструктура main

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Current alpha host: `https://alive-aw2.pages.dev`.
- Planned canonical host: `https://alive.hmnos.ru`.
- Auth: Google → Supabase Auth.
- Database: Supabase PostgreSQL + RLS.
- GitHub CI: dependency install, typecheck, production build.

## Следующий порядок

1. Закрыть R1 validation gates.
2. Принять/merge Strategy Foundation и R1 либо явно разрешить stacked 4.0 development.
3. Запустить `4.0.0-alpha.1` строго по `CODEX_PROMPT.md` и quality protocol.
4. Не добавлять local LLM до Product Evidence Gate.
5. Не добавлять Tribute/referral раньше соответствующих roadmap stages.

## Главный текущий риск

Не скорость кодирования, а **ложная уверенность от большого agent-generated diff без end-to-end validation**.

Следующие релизы оптимизируются прежде всего против этого риска.
