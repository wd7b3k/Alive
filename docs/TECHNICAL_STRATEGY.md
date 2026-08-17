# ALIVE — техническая стратегия

## 1. Назначение

Техническая стратегия определяет, **как строить ALIVE так, чтобы продуктовая стратегия оставалась реализуемой, проверяемой и расширяемой без архитектурного хаоса**.

Она подчинена `PRODUCT_STRATEGY.md` и не должна самостоятельно менять product semantics.

Ключевые требования:

- один продукт для web, messenger и mobile;
- высокая скорость real-time craving flow;
- низкая стоимость эксплуатации на ранней стадии;
- возможность масштабирования без обязательного rewrite;
- privacy-by-design;
- строгая tenant isolation;
- evidence-first content governance;
- versioned hypotheses, metrics and models;
- raw behavioural facts отдельно от derived interpretations;
- модульность и API contracts;
- release/rollback discipline;
- локальный open-weight LLM только после проверки базовой product hypothesis;
- ALIVE продолжает выполнять core function при недоступности LLM.

## 2. Сохраняем существующий фундамент

Текущий технологический фундамент подходит первой доказательной стадии:

- React + TypeScript + Vite;
- Cloudflare Pages как frontend delivery layer;
- Supabase Auth;
- PostgreSQL;
- Row Level Security;
- Edge Functions / DB functions только для server-side/privileged logic;
- modular monolith;
- GitHub repository как единственный source of truth;
- migrations, release units, validation и rollback в git.

Стратегия не предполагает rewrite платформы ради новой продуктовой модели.

## 3. High-level architecture

```text
                    USERS

      ┌──────────────┼──────────────┐
      │              │              │
     WEB         MESSENGERS       MOBILE
      │              │              │
      └──────── CHANNEL ADAPTERS ───┘
                     │
               ALIVE API / PORTS
                     │
     ┌───────────────┼────────────────┐
     │               │                │
 DOMAIN CORE    CONTENT/EVIDENCE   PRODUCT SERVICES
     │               │                │
     └───────────────┼────────────────┘
                     │
           SUPABASE / POSTGRESQL
                     │
     ┌───────────────┼────────────────┐
     │               │                │
 RAW FACTS      PROJECTIONS       EVIDENCE
     │               │                │
     └───────────────┼────────────────┘
                     │
               LEARNING LAYER
                     │
           optional LOCAL LLM
```

## 4. Modular monolith first

ALIVE остаётся modular monolith до появления измеренного bottleneck.

Модульность означает:

- явный ownership данных;
- public application/service ports;
- отсутствие произвольного изменения private state соседнего модуля;
- возможность выделить модуль в отдельный service позже без изменения product semantics.

Не требуются на ранней стадии:

- Kubernetes;
- microservice zoo;
- Kafka;
- Redis cluster;
- отдельный data warehouse;
- GPU cluster;
- сложный distributed event bus.

## 5. Канонические domain modules

### Identity & Consent

Identity mapping, profile, consent, privacy choices.

### Dependence Profile

Baseline, target products, cessation bridges, goals and journey state.

### Nicotine Products

Cigarette, Vape, Hookah, NRT/treatment roles and product-specific raw facts.

### Episode

Impulse/craving context, decision, action, outcome, correction/deletion state.

### Links

Повторяющиеся Связки и заранее подготовленные responses.

### Goals / Зачем

Goals, values, personal formulations and active relevance.

### Evidence

Claims, sources, evidence levels, limitations and approved user copy.

### Myths / Reframe

Beliefs, belief strength, experiments, expectation vs outcome.

### Intervention

Candidate generation, eligibility, ranking, explanation, versioning.

### Treatment Support

Факт выбранной пользователем evidence-based cessation strategy и adherence-support без назначения дозировок.

### Learning

Personal empirical effectiveness and later cohort priors.

### Metrics

Time Saved, Money Saved, Health Minutes, baseline delta and other derived projections.

### Journey / Recovery

Quit journey state, lapse recovery and progress.

### Together

Privacy-safe group aggregates.

### Referral

Value-moment triggers, invite links, attribution and optional friend relationship.

### Donation

Будущий adapter добровольной поддержки через Tribute; не entitlement system.

## 6. Business logic не живёт во фронтах

Web, Telegram и mobile не должны независимо решать:

- какой Факт показать;
- какой Myth активировать;
- какой intervention выбрать;
- как считать Health Minutes;
- как интерпретировать lapse;
- как ранжировать Замены.

Каноническая логика находится в Domain/Application layer.

Фронты отвечают за presentation, navigation, notifications, device capabilities и local UI state.

## 7. API-first и channel-independent contracts

Значимые product commands должны иметь стабильные application contracts.

Целевой внешний contract — versioned API, например `/api/v1/...`, с OpenAPI-описанием.

Пример направлений:

```text
POST /episodes/start
POST /episodes/{id}/decision
POST /episodes/{id}/outcome
POST /tobacco-events
DELETE /tobacco-events/{id}
GET  /interventions/next
GET  /links
GET  /goals
GET  /progress
GET  /metrics
POST /referrals
GET  /together
```

Конкретные endpoints утверждаются при проектировании API и не считаются зафиксированными только этим примером.

## 8. Supabase access model

Простые user-scoped CRUD операции могут использовать Data API напрямую только при корректном RLS.

Server-side layer обязателен там, где требуется:

- privileged credential;
- сложная business command;
- decision/intervention orchestration;
- webhook verification;
- admin action;
- cross-user aggregate;
- sensitive derived state;
- trusted calculation, который нельзя отдавать клиенту.

Не строить Edge Function для каждой простой операции без причины.

## 9. PostgreSQL как durable source of runtime truth

Schema source of truth — `supabase/migrations/`.

Principles:

- raw facts traceable;
- derived metrics rebuildable;
- versioned semantics;
- RLS on user-owned data;
- indexes driven by real access patterns;
- destructive changes только с migration/rollback strategy.

## 10. Event-oriented raw layer без тяжёлого Event Sourcing

ALIVE не требует полноценного Event Sourcing framework, но raw behavioural history должна хранить факты до их интерпретации.

Примеры:

- craving/impulse episode;
- cigarette event;
- vape interaction/puffs;
- hookah session;
- intervention attempt;
- outcome;
- treatment event;
- belief measurement;
- goal change;
- correction/deletion marker.

Derived projections никогда не являются единственным источником истории.

## 11. Product-specific nicotine data

### Cigarette

Raw quantity, occurred_at, actual/derived cost where applicable.

### Vape

Raw puffs, device interaction/session grouping, device/consumable data, nicotine-free intervals where calculable.

### Hookah

Raw session, duration, actual cost and contextual fields.

### NRT / treatment

Хранится как intervention/treatment fact и не смешивается с smoking relapse.

ALIVE units остаются отдельной behavioural normalization model и не интерпретируются как medical harm equivalence.

## 12. Исправление данных

Пользователь может удалить/исправить ошибочный или тестовый факт.

Система должна:

1. сохранить traceable correction/deletion state;
2. исключить событие из active calculations;
3. инвалидировать зависимые projections;
4. пересчитать derived metrics;
5. не требовать ручной правки счётчиков.

## 13. Versioned derived models

Каждая значимая производная модель получает собственную версию.

Минимум:

- Baseline Model;
- Time Saved Model;
- Money Saved Model;
- Health Minutes Model;
- ALIVE Equivalence Model, если остаётся нужен;
- Intervention Ranking Model;
- Methodology Version.

Raw history не переписывается при обновлении коэффициентов.

## 14. Три базовые метрики

Canonical derived fields должны поддерживать:

- `time_saved_seconds`;
- `money_saved_minor_units`;
- `healthy_life_saved_minutes`.

Health Minutes дополнительно должны указывать:

- model version;
- evidence claim/source version;
- product coverage;
- confidence/heuristic status.

Нельзя использовать ALIVE units для автоматического расчёта Health Minutes.

## 15. Projections для быстрого UX

Real-time flow не должен пересчитывать всю историю.

Нужны rebuildable projections, например:

- daily user metrics;
- lifetime user metrics;
- Link effectiveness;
- intervention effectiveness;
- belief state;
- product-specific usage state;
- nicotine-free interval state;
- cohort-safe aggregate projections.

## 16. Evidence Registry

Рекомендуемые conceptual entities:

```text
evidence_claims
evidence_claim_versions
evidence_sources
approved_content_items
claim_content_links
```

Claim содержит:

- canonical assertion;
- source;
- evidence strength;
- population;
- limitations;
- reviewed_at;
- status;
- version.

Medical user copy публикуется только из approved content layer.

## 17. Content governance

Pipeline:

`SOURCE → EVIDENCE CLAIM → REVIEWED USER COPY → CONTENT VERSION → RELEASE`

LLM может предложить формулировку, но не становится authority.

Изменение medically significant meaning требует evidence review и release trace.

## 18. Intervention Engine v1

До накопления достаточного dataset движок преимущественно детерминированный и объяснимый.

Conceptual pipeline:

```text
Context Resolver
↓
Product-specific Resolver
↓
Link Matcher
↓
Eligibility / Safety Filter
↓
Micro-awareness Selector
↓
Candidate Generator
↓
Personal Ranker
↓
Explanation
```

Первая ranking logic использует:

- curated prior;
- context match;
- availability;
- personal attempts;
- personal outcome;
- recent failures;
- repetition/fatigue rules;
- journey state.

## 19. Personal Learning Engine

Главное правило:

> **LLM не является алгоритмом обучения ALIVE.**

Первичное обучение строится на структурированных outcomes.

Например:

```text
trigger=after_meal
intervention=walk
attempts=9
successful=7
avg_craving_delta=-1.8
```

Такой сигнал можно объяснить, пересчитать и сравнить с baseline.

## 20. Этапы обучения продукта

### Stage A — Curated rules

До пилота.

### Stage B — Personal empirical ranking

После накопления собственных outcomes пользователя.

### Stage C — Cohort priors

После достаточной выборки и privacy review.

### Stage D — Contextual personalization

Комбинации контекста, продукта, Link, journey state и прошлых outcomes.

### Stage E — Adaptive policy

Только после достаточных данных возможно исследовать contextual bandit/другие adaptive-ranking approaches.

Любой advanced algorithm проходит offline evaluation и feature-flag rollout.

## 21. Local LLM появляется после product evidence gate

Не строить AI-инфраструктуру раньше проверки основной ценности ALIVE.

Порядок:

1. deterministic product работает;
2. реальные пользователи используют его в craving moments;
3. измеряется полезность core loops;
4. подтверждаются ключевые product signals;
5. после этого подключается local open-weight LLM как дополнительный semantic layer.

## 22. Задачи локального LLM

Первый scope:

- semantic classification свободного русского текста;
- распознавание trigger/context candidate;
- dedup/cluster похожих Links;
- summary недели;
- retrieval/matching approved Facts/Myths;
- объяснение recommendation;
- constrained conversational layer;
- structured extraction.

LLM не должен выполнять canonical metric calculation или медицинское назначение.

## 23. Model-agnostic AI Provider

Domain code не зависит от конкретного model name.

Нужен абстрактный provider contract, например:

```text
AIProvider
  classify()
  summarize()
  embed()
  generateStructured()
```

Конкретный inference engine/model меняется конфигурацией и benchmark result.

## 24. Self-hosted inference

После AI gate предпочтителен отдельный inference service с OpenAI-compatible API и structured-output support.

В качестве первого кандидата для benchmark допускается vLLM или эквивалентный production-capable serving layer.

Конкретная open-weight модель не фиксируется стратегией. Выбор проводится собственным русскоязычным benchmark ALIVE.

## 25. ALIVE LLM benchmark

Test set должен проверять:

- разговорный русский;
- короткие/грязные voice transcripts;
- опечатки;
- smoking/vape/hookah vocabulary;
- trigger classification;
- structured JSON correctness;
- approved content retrieval;
- устойчивость к medical hallucination;
- latency;
- throughput;
- hardware cost.

Побеждает модель с лучшим балансом `quality × speed × infrastructure cost`, а не с лучшим generic leaderboard score.

## 26. Free/local означает без token API billing, но не без стоимости

Open-weight local model убирает обязательную оплату внешнего API за токены, но остаются:

- hardware;
- hosting;
- electricity;
- storage;
- operations.

Поэтому ALIVE должен:

- работать без LLM;
- использовать маленькую модель для простых задач, если достаточно;
- выполнять batch для некритичных задач;
- не отправлять каждый UI action в LLM.

## 27. AI privacy boundary

LLM получает минимально необходимый context.

Предпочтительно передавать:

- pseudonymous request/session ref;
- только релевантные recent events;
- structured features;
- approved evidence snippets.

Не передавать без необходимости:

- email;
- полный профиль;
- полную behavioural history;
- raw private notes.

LLM logs — disabled или redacted по умолчанию.

## 28. AI security boundary

LLM:

- не получает service-role credential;
- не выполняет произвольный SQL;
- не принимает authorization decisions;
- не публикует UGC;
- не меняет Evidence Registry;
- не обновляет production config;
- не меняет release version.

## 29. RAG только когда появляется реальная задача

До необходимости semantic retrieval полноценный vector/RAG stack не строится.

Когда потребуется, retrieval corpus ограничивается approved:

- Evidence claims;
- Facts;
- Myths;
- intervention catalog;
- methodology.

LLM должен опираться на retrieved approved content вместо медицинского «воспоминания» из weights.

## 30. Web

Текущий React/TypeScript/Vite client сохраняется.

Cloudflare Pages остаётся frontend delivery/deployment layer. Product business backend не переносится во frontend ради удобства.

## 31. Messenger adapters

Telegram — первый messenger adapter.

Adapter pattern:

`incoming message → identity resolve → ALIVE command → Domain/API → messenger representation`

Messenger code не копирует Domain Core.

Новые messenger frontends добавляются тем же способом.

## 32. Mobile

Native/mobile client использует тот же application API и canonical state.

На устройстве допустимы:

- UI state;
- safe cache;
- push token;
- offline SOS content;
- device-specific integrations.

Canonical sensitive behavioural state остаётся backend-owned.

## 33. Latency strategy

SOS/craving flow не должен ждать LLM.

Принцип progressive response:

1. сразу показать безопасный deterministic response/known Link;
2. параллельно загрузить personal projections;
3. optional AI insight может появиться позже и не блокирует действие.

Конкретные SLO устанавливаются после реальных measurements.

## 34. Caching

Разрешено кэшировать:

- public Evidence content;
- catalogs;
- runtime-safe config;
- static assets.

Нельзя публично edge-cache private:

- episodes;
- notes;
- personal Links;
- personal Goals;
- treatment state;
- personal recommendations.

## 35. Async jobs

Асинхронный abstraction нужен для:

- daily/weekly summaries;
- projection recompute;
- cohort aggregates;
- notifications;
- optional AI analysis.

Не привязывать Domain Core к конкретной queue technology. Конкретный backend выбирается по maturity, cost and measured load на implementation gate.

## 36. Referral architecture

Conceptual entities:

- referral invite;
- invite click;
- attribution;
- share event;
- optional friend relationship.

Invite token:

- opaque;
- случайный;
- не содержит user id/email;
- может иметь expiry/revocation.

Referral link не раскрывает sensitive user state.

## 37. Together with friend consent

Referral не создаёт автоматический доступ к данным пригласившего/приглашённого.

После регистрации optional `проходить вместе` требует отдельного consent и whitelist разрешённых агрегатов.

## 38. Donation / Tribute

До подключения donation provider core архитектура не зависит от платежей.

Нужен provider abstraction только когда начинается фактическая интеграция.

Donation status не является entitlement.

То есть donation не участвует в проверках вида:

- can_use_intervention;
- can_view_fact;
- can_use_core_ai;
- can_access_treatment_support.

Webhook/API implementation Tribute проходит отдельный security review, signature validation, idempotency и audit requirements.

## 39. Security

Базовые правила:

- private by default;
- RLS на user-owned exposed entities;
- frontend не задаёт доверенно чужой `user_id`;
- service secrets только server-side;
- sensitive text не копируется в generic analytics;
- privileged actions audited;
- export/delete path проверяется;
- Together использует whitelist projections;
- admin не получает удобный просмотр всей private history по умолчанию.

## 40. Analytics separation

Три разных типа данных:

### Domain facts

Что реально произошло с поведением.

### Product analytics

Как пользователь взаимодействовал с ALIVE.

### Operational telemetry

Errors, latency, health, incidents.

Нельзя подменять domain outcomes product engagement events.

## 41. Reliability и graceful degradation

- LLM down → deterministic engine работает;
- analytics down → craving flow работает;
- Together down → personal journey работает;
- referral down → cessation flow работает;
- Tribute down → ALIVE работает полностью.

Core cessation path не зависит от secondary services.

## 42. Feature flags

Экспериментальные изменения включаются versioned feature flags:

- micro-awareness variants;
- intervention ranker;
- Health Minutes model;
- referral prompts;
- LLM-assisted classification;
- new content logic.

Нужны gradual rollout, cohort testing, rollback и shadow mode.

## 43. Shadow mode для AI и новых rankers

До влияния на пользователя новая logic может работать параллельно:

```text
current engine → A
experimental engine → B
user receives A
B stored for evaluation
```

После offline/online evidence экспериментальная logic допускается в controlled rollout.

## 44. Release traceability

Каждая значимая feature должна иметь трассировку:

`PRODUCT STRATEGY → HYPOTHESIS/REQUIREMENT → MODULE → DATA/API CONTRACT → RELEASE UNIT → VALIDATION → METRIC`

Если feature нельзя связать с утверждённой стратегией или экспериментом, она не добавляется автоматически.

## 45. Release discipline

Каждый значимый этап:

- отдельная ветка;
- release scope;
- prompt/response AI audit trail;
- migrations versioned;
- validation;
- privacy/security checks;
- rollback/forward-fix strategy;
- draft PR до owner gate;
- merge в main = принятое состояние.

## 46. Technical North Star

Архитектура успешна, если:

- новый frontend добавляется без переписывания product logic;
- новая LLM меняется без изменения Domain Core;
- новая metric model вводится без потери raw history;
- эксперимент включается feature flag'ом;
- неудачный release можно откатить;
- один пользователь технически не может читать private data другого;
- core craving assistance остаётся быстрой и доступной при отказе secondary components.

## 47. Последовательность технического развития

### T0 — Strategy Foundation

Документация и устранение противоречий. Без runtime changes.

### T1 — Canonical Domain Model

Синхронизация сущностей с новой product strategy.

### T2 — Product-specific Episodes

Cigarette / Vape / Hookah behavioural models.

### T3 — Metrics Engine

Time / Money / Health Minutes с versioning.

### T4 — Evidence + Micro-awareness

Evidence Registry, Myths, Goals/Зачем и contextual presentation.

### T5 — Intervention Engine

Новая decision architecture и deterministic ranker.

### T6 — Outcome Learning

Personal effectiveness and explainability.

### T7 — Journey / Recovery / Together

Поддерживающая система и privacy-safe group aggregates.

### T8 — Referral Engine

Value-moment self-marketing.

### T9 — Multi-channel API

Telegram и следующие adapters поверх одного Domain Core.

### T10 — Product Evidence Gate

Реальные cohorts и решение GO / ITERATE / PIVOT.

### T11 — Local AI

Self-hosted model-agnostic inference после доказательства core value.

### T12 — Adaptive Intelligence

Cohort priors, advanced ranking, AI-assisted personalization.

### T13 — Donation Support

Tribute после отдельного owner/privacy/security gate.

Порядок может меняться по evidence, но AI и donation не должны опережать доказательство базовой ценности продукта.

## 48. Итоговая техническая формула

> **ALIVE строится как API-first modular monolith с PostgreSQL как durable runtime truth, traceable raw behavioural facts, rebuildable versioned projections, строгой RLS-изоляцией и channel-independent Domain Core.**

> **Система обучения сначала строится на структурированных outcomes пользователя. После проверки продуктовой гипотезы local open-weight LLM добавляется как заменяемый semantic/decision-support layer, но не заменяет Evidence Registry, deterministic safety rules и объективные расчёты.**
