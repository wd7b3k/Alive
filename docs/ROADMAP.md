# Roadmap ALIVE

Roadmap ALIVE подчинён product/evidence gates.

Номер версии не доказывает готовность. Следующий этап открывается после acceptance предыдущего либо явного owner decision.

## Уровни roadmap

Используются два взаимосвязанных уровня.

### Capability gates

Внутренние технологические и продуктовые возможности, которые должны быть построены в правильном порядке.

### Пользовательские версии

Сквозные вертикальные срезы, в которых несколько capability работают вместе и дают реальный пользовательский опыт.

Это позволяет не выпускать «версию одного модуля», но и не строить всю систему одним большим diff.

---

# FOUNDATION

## F0 — Product Strategy Foundation

Статус: **готов в отдельной ветке / ожидает owner merge gate**.

Цель:

- новая product thesis;
- Technical Strategy;
- product-specific cigarette/vape/hookah model;
- Time/Money/Health Minutes;
- referral/self-marketing direction;
- future donation model;
- staged local-LLM strategy;
- evidence/hypothesis boundaries.

Каноническая формула:

> **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**

---

# DATA FOUNDATION

## R1 — Данные, доказательная база и контроль продукта

Статус: **в разработке / draft PR**.

Цель:

> построить правильную структуру данных и наблюдаемости до пользовательской перестройки 4.x

Scope:

- глобальные + собственные Триггеры;
- глобальные + собственные Замены;
- пользовательские preferences;
- context-aware intervention rules;
- `Зачем` как отдельная domain entity;
- Evidence Registry;
- русский слой Фактов/Мифов;
- content impressions;
- structured product analytics;
- admin dashboard;
- personal learning projections;
- correction/delete/recompute;
- distinction `craving / quick log / conscious use`;
- legacy Facts/Myths/Meanings compatibility.

Gate до live alpha:

- migrations development DB PASS;
- RLS isolation PASS;
- security/performance advisors reviewed;
- typecheck/build PASS;
- admin permission path PASS;
- early-exit telemetry определена;
- owner review Evidence user copy.

---

# SERIES 4.x

## 4.0.0-alpha.1 — Первый сквозной контур новой модели

Это **первый пользовательский release серии 4.x**.

Главная цель:

> впервые показать новую стратегию ALIVE как связанный пользовательский опыт, а не как набор отдельных модулей

### Сквозной core loop

`Зачем → Хочу закурить → контекст → микроосознанность → действие → outcome → метрики → обучение`

### Обязательный vertical slice

Сначала полностью проходит один эталонный сценарий:

> сигарета после еды → распознавание контекста → релевантный Факт/Миф/Зачем → персонально ранжированное действие → outcome → пересчёт Time/Money/Health Minutes → learning → admin analytics

Только после его PASS расширять remaining alpha.1 scope.

### Scope alpha.1

#### Зачем

- пользовательское название `Зачем` вместо `Смыслы`;
- goals/values/directions;
- создание/редактирование/скрытие;
- personal copy;
- использование в craving context;
- legacy compatibility.

#### Home

Home отвечает:

1. что сделать при тяге;
2. где я сейчас;
3. что сегодня важно;
4. что ALIVE уже понял обо мне.

Primary CTA:

**«Хочу закурить»**

Постоянно видны:

- вернул время;
- сохранил деньги;
- ≈ сохранил здоровую жизнь.

#### Момент тяги

- быстрый вход;
- внутренний decision loop не превращается в длинный wizard;
- максимум минимально нужных вопросов до первого действия;
- известная Связка используется автоматически/подсказкой;
- Fact/Myth/Зачем — короткий контекстный слой;
- понятный fallback при отсутствии данных.

#### Product-specific flows

**Сигарета** — полноценный discrete flow.

**Вейп** — отдельная модель обращения к устройству/затяжек/интервала; нельзя просто заменить слово «сигарета».

**Кальян** — отдельный pre-session/session flow; важный decision point может быть до сессии.

В alpha.1 допускается различная глубина трёх flows, но семантика не должна быть ложной или общей.

#### Intervention Engine v1

- prepared Link response;
- eligibility;
- context rules;
- personal outcomes where data exist;
- deterministic ranker;
- понятное `Почему это`;
- без LLM dependency.

#### Микроосознанность

- approved Fact;
- approved Myth;
- personal Зачем;
- fatigue/repetition rules;
- impression/usefulness analytics;
- никакой генерации medical text.

#### Outcome

Минимальный outcome:

- помогло/частично/нет;
- тяга после, где уместно;
- использовал никотин или нет;
- expectation/actual для conscious use, если сценарий включён.

#### Analytics/admin

Должно быть видно:

- открытие craving flow;
- первый полезный response;
- шаг выхода;
- structured reason;
- intervention shown/chosen/completed;
- outcome;
- Fact/Myth impression/usefulness;
- metric update;
- repeat craving use;
- product type.

#### Quality foundation

- scoped AGENTS;
- implementation plan;
- automated tests для новой logic;
- browser QA;
- mobile QA;
- adversarial self-review;
- independent reviewer по возможности.

### Non-goals alpha.1

Не реализовывать:

- local LLM;
- Tribute;
- referral growth loop;
- полноценный Telegram front;
- wearables;
- hardware/sensors;
- complex ML/bandit;
- large social feed;
- public leaderboard;
- paid coaching.

### Gate alpha.1

- один canonical vertical slice end-to-end PASS;
- build/typecheck/tests PASS;
- browser desktop PASS;
- browser mobile PASS;
- critical analytics интерпретируемы;
- Russian UI review PASS;
- RLS/data integrity PASS для новых сущностей;
- user-facing medical copy связана с Evidence Registry;
- no cigarette Health Minutes leakage to vape/hookah;
- owner product review.

---

## 4.0.0-alpha.2 — Product-specific depth и Freedom Metrics

Открывается после alpha.1.

Фокус:

- полноценная модель vape device interactions;
- nicotine-free intervals;
- более глубокий hookah pre-session flow;
- personal cost/time models;
- metric versioning UX;
- cross-product substitution detection;
- более точные prepared responses;
- расширение analytics по продуктам.

Gate:

- никакой ложной medical equivalence;
- user понимает разные цели smoke-free vs nicotine-free;
- raw facts сохранены по каждому продукту;
- metrics rebuildable.

---

## 4.0.0-alpha.3 — Outcome Learning, Перепрошивка и Recovery

Фокус:

- intervention effectiveness;
- trigger/link weakening;
- expectation vs actual;
- belief dynamics;
- персональные insights;
- Перепрошивка на собственных данных;
- Recovery после lapse;
- изменение ranker по outcome.

Gate:

- рекомендации меняются объяснимо;
- пользователь видит, почему изменился вывод;
- никаких ложных causal claims;
- recovery measured.

---

## 4.0.0-beta.1 — Путь, Вместе и self-marketing

Фокус:

- новая модель Пути;
- progress beyond streak;
- privacy-safe Вместе;
- optional friend relationship;
- value realization moments;
- invite/share card;
- referral attribution.

Referral CTA только после подтверждённого позитивного value moment.

Gate:

- no shame/leaderboard;
- no private leakage;
- invite→activation measurable;
- referral не ухудшает cessation experience.

---

## 4.0.0-beta.2 — Omnichannel / Telegram

Фокус:

- canonical application API/contracts;
- Telegram adapter;
- identity linking;
- state parity web↔messenger;
- craving/recovery/check-in messages;
- channel orchestration.

Gate:

- business logic не дублируется в Telegram;
- один user state;
- messenger улучшает real-moment access.

---

# PRODUCT EVIDENCE GATE

## E1 — Проверка основной гипотезы

До local LLM и сложной adaptive intelligence.

Минимум:

- реальные добровольные пользователи;
- стабильный runtime;
- реальное использование в craving moments;
- no critical safety/privacy failure;
- минимум достаточной продолжительности для leading outcomes.

Проверить:

- использование относительно baseline;
- episodes without target use;
- repeat real-moment use;
- prepared Link response;
- micro-awareness;
- intervention effectiveness;
- recovery;
- retention, интерпретируемый в контексте outcome.

Решение:

`GO / ITERATE / PIVOT / STOP`

---

# AFTER EVIDENCE GATE

## 4.1 — Local LLM Semantic Layer

Только после `GO` либо отдельного сильного evidence decision.

Scope:

- model-agnostic AIProvider;
- self-hosted/open-weight model;
- русский ALIVE benchmark;
- structured outputs;
- semantic trigger/context extraction;
- summary;
- approved content matching;
- shadow mode;
- deterministic fallback;
- privacy-minimized context.

LLM не становится:

- Evidence Registry;
- medical authority;
- metric calculator;
- authorization engine;
- единственным ranking mechanism.

---

## 4.2+ — Adaptive Intelligence

Только после накопления dataset.

Возможные направления:

- cohort priors;
- contextual ranking;
- contextual bandits;
- embeddings/similar episodes;
- offline fine-tuning after separate privacy decision.

Advanced ML не строится без benchmark/evaluation dataset.

---

# LATER SUPPORT TRACK

## Donation Support / Tribute

После отдельного owner decision и регулярной доказанной пользы.

- voluntary support;
- no paywall;
- no core entitlement;
- provider security review;
- Tribute integration/webhooks only if necessary;
- Charter/Privacy/ADR sync.

---

# Постоянный operational track

На каждом user-facing release:

- documentation trace;
- implementation plan;
- unit/integration tests;
- CI;
- browser QA;
- mobile QA;
- Russian copy review;
- RLS/security;
- performance review when preview available;
- evidence freshness;
- analytics interpretation;
- rollback/forward-fix;
- AI prompt/response audit;
- adversarial self-review;
- independent review where available.

## Research track

Еженедельный ALIVE Research Watch отслеживает:

- исследования;
- рекомендации;
- конкурентов;
- JITAI/personalization;
- AI;
- wearables;
- design patterns.

Значимый finding получает решение:

`внедрить / эксперимент / наблюдать / не использовать`

и только после этого попадает в roadmap.

## Roadmap rule

> **Мы не строим следующий слой потому, что он интересный. Мы строим его, когда предыдущий слой дал достаточно данных, чтобы следующий стал обоснованным способом увеличить ценность ALIVE.**
