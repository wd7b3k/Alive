# Roadmap ALIVE

Roadmap подчинён product/evidence gates. Версия или направление не становятся обязательными только потому, что описаны заранее.

## F0 — Product Strategy Foundation

Цель:

- зафиксировать финальную product thesis;
- заменить узкую модель `need→replacement` на decision/learning model;
- синхронизировать Methodology, Principles, Hypotheses и Technical Strategy;
- зафиксировать product-specific cigarette/vape/hookah models;
- зафиксировать три постоянные метрики свободы;
- определить referral/self-marketing;
- определить будущую donation support model;
- определить staged local-LLM strategy;
- устранить противоречия старой документации.

Gate:

- strategy docs согласованы между собой;
- runtime code не меняется в этом release unit;
- следующий AI/разработчик может вывести требования из repo без чата.

## R1 — Canonical Domain Alignment

Цель: привести существующую модель данных/модулей к новой стратегии без UX rewrite ради rewrite.

Scope:

- Goals/Зачем вместо старой смысловой модели;
- Links with prepared responses;
- product roles;
- expectation/outcome fields;
- evidence/hypothesis boundaries;
- metric model versioning;
- correction/recompute contract.

Gate:

- migration/design review;
- raw history сохраняется;
- rollback/forward-fix path;
- RLS contract не ухудшается.

## R2 — Product-specific Episodes

Цель: разные behavioural flows для cigarette/vape/hookah.

### Cigarette

Discrete impulse/decision/outcome flow.

### Vape

Device interactions, puffs, grouping and nicotine-free intervals.

### Hookah

Pre-session decision points, session duration/cost and social context.

Gate:

- каждый product имеет raw facts;
- frontend не подменяет product semantics;
- cross-product state не создаёт ложную medical equivalence.

## R3 — Freedom Metrics Engine

Цель: сделать постоянными:

- Time Saved;
- Money Saved;
- Health Minutes.

Scope:

- personal baseline;
- versioned calculation models;
- product coverage;
- methodology explanation;
- fast projections;
- delete/correction recompute.

Gate:

- raw/derived consistency;
- zero silent historical reinterpretation;
- Health Minutes clearly understood as heuristic.

## R4 — Evidence + Micro-awareness

Цель: превратить Facts/Myths/Goals из библиотек в active contextual layer.

Scope:

- Evidence Registry;
- approved content versions;
- contextual micro-awareness selector;
- repetition/fatigue rules;
- belief strength;
- expectation/outcome relation;
- contextual `Зачем`.

Gate:

- medical claims sourceable;
- LLM cannot create production health claims;
- qualitative UX does not feel lecturing/spammy.

## R5 — Intervention Engine

Цель: единый decision engine вместо простого Replacement Engine.

Scope:

- candidate mechanisms;
- prepared Link responses;
- eligibility;
- deterministic personal ranker;
- explanation;
- fallback behavior;
- feature flags.

Gate:

- fast craving flow;
- explainable ranking;
- personal outcomes affect future choices;
- no LLM dependency.

## R6 — Outcome Learning + Reframe

Цель: сделать персональную модель зависимости полезной и видимой.

Scope:

- intervention effectiveness;
- Link weakening;
- expectation vs actual outcome;
- belief dynamics;
- personal insights;
- Перепрошивка based on real data.

Gate:

- user can understand why recommendation changed;
- derived learning rebuildable;
- no invented causal claims.

## R7 — Journey + Recovery + Together

Цель: поддерживать длинный путь и возврат после lapse.

Scope:

- journey states;
- recovery flow;
- new Путь;
- privacy-safe Together aggregates;
- optional friend relationship.

Gate:

- no shame/leaderboard;
- no private leakage;
- recovery produces measurable re-engagement or ITERATE decision.

## R8 — Referral / Self-marketing

Цель: проверить organic growth из моментов полученной пользы.

Scope:

- value moments;
- privacy-safe share cards;
- invite links;
- attribution;
- optional `Вместе с другом` consent.

Gate:

- no referral prompt in craving/lapse/crisis/treatment contexts;
- invite→activation measurable;
- no negative cessation UX impact.

## R9 — Multi-channel API + Telegram

Цель: доказать, что ALIVE является одним продуктом на разных фронтах.

Scope:

- canonical application API/ports;
- channel-independent state;
- Telegram adapter;
- identity linking;
- messenger craving/recovery/check-in flows.

Gate:

- state parity web↔messenger;
- no duplicated decision logic;
- messenger materially improves real-moment access or ITERATE decision.

## R10 — Product Evidence Gate

Цель: проверить core product hypothesis на реальных пользователях до AI/infrastructure expansion.

### Feasibility

- несколько добровольных пользователей;
- минимум 14 дней стабильного использования;
- real impulse moments;
- no safety/privacy failures.

### Mechanism

Проверить:

- pause/use outcomes;
- Link prepared responses;
- micro-awareness;
- intervention ranking;
- recovery;
- usage vs baseline.

Decision:

`GO / ITERATE / PIVOT / STOP`.

## R11 — Local LLM Semantic Layer

Только после `GO`/достаточного product evidence.

Цель: улучшить understanding/personalization, не заменяя deterministic core.

Scope:

- model-agnostic AIProvider;
- local/self-hosted inference;
- Russian ALIVE benchmark;
- structured outputs;
- trigger/context classification;
- summary;
- approved content matching;
- shadow mode;
- privacy boundary;
- deterministic fallback.

Gate:

- benchmark quality;
- medical hallucination threshold;
- latency/cost acceptable;
- ALIVE works when LLM is down.

## R12 — Adaptive Intelligence

После достаточного dataset.

Возможные направления:

- cohort priors;
- contextual ranking;
- bandit experiments;
- embeddings/similar episodes;
- optional offline fine-tuning after separate privacy/data decision.

Не строить advanced ML без dataset/evaluation gate.

## R13 — Donation Support / Tribute

После отдельного owner decision и когда продукт уже показывает регулярную пользу.

Цель: добровольная поддержка разработки без paywall.

Scope:

- Tribute integration;
- support CTA;
- webhook/security if needed;
- donation analytics;
- explicit non-entitlement model.

Gate:

- Charter/Privacy/ADR updated;
- donation does not alter core access;
- provider security review complete.

## Parallel operational track

На каждом runtime release независимо выполняются:

- security/RLS isolation;
- backup/restore;
- export/delete;
- CI;
- responsive parity;
- release notes;
- rollback/forward-fix;
- AI prompt/response audit trail.

## Roadmap rule

Следующий этап открывается не потому, что предыдущий «написан», а потому что его acceptance/evidence gate выполнен либо владелец явно принимает решение изменить порядок.
