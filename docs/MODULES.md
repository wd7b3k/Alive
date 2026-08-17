# Каноническая карта модулей ALIVE

Этот документ фиксирует product/domain ownership. Технические границы реализации следуют `TECHNICAL_STRATEGY.md`.

## 1. Identity & Consent

Владеет:

- auth identity mapping;
- profile/display data;
- locale/timezone;
- consent versions;
- privacy choices;
- account lifecycle.

Не владеет behavioural history.

## 2. Dependence Profile

Владеет:

- enabled nicotine products;
- product roles;
- personal baseline;
- quit/reduction goal;
- journey state;
- strategy preferences.

## 3. Nicotine Products

Владеет product definitions и product-specific semantics:

- cigarette;
- vape;
- hookah;
- NRT/treatment role.

Raw usage facts хранятся отдельно от normalization/health heuristics.

## 4. Episode

Canonical decision event:

`context → impulse → pause → recognition → decision → action → outcome`

Не каждый episode обязан иметь все поля.

Владеет:

- lifecycle;
- target product;
- context/trigger;
- craving facts;
- decision;
- outcome;
- optional private note;
- correction/deletion state.

## 5. Links / Связки

Владеет:

- personal Links;
- global templates;
- trigger/context relation;
- prepared `Когда X → делаю Y` response;
- Link effectiveness;
- weakening state;
- explicit UGC submission.

## 6. Goals / Зачем

Владеет:

- goals;
- values;
- personal formulations;
- active/order state;
- contextual relevance;
- explicit UGC submission where applicable.

## 7. Evidence Registry

Владеет:

- evidence claims;
- sources;
- evidence strength;
- limitations;
- reviewed/versioned status;
- approved user copy linkage.

Medical claims не создаются другими модулями напрямую.

## 8. Facts

Владеет пользовательским представлением approved evidence facts и contextual eligibility.

Не является source of medical truth — source находится в Evidence Registry.

## 9. Myths / Reframe

Владеет:

- belief catalog;
- user belief strength;
- evidence relation;
- linked Links/triggers;
- personal experiments;
- expectation vs outcome;
- belief change.

## 10. Micro-awareness

Orchestration layer, выбирающий минимально достаточный contextual element:

- Fact;
- Myth/reframe;
- personal insight;
- Goal/Value.

Учитывает repetition/fatigue.

## 11. Intervention Engine

Владеет:

- candidate generation;
- eligibility/safety rules;
- product-specific logic;
- prepared Link responses;
- ranking;
- explanation;
- model version.

Не владеет raw episode history, а читает его через contract/projections.

## 12. Replacement Catalog

Каталог доступных behavioural actions:

- physical;
- sensory;
- environmental;
- food/drink;
- breathing;
- cognitive;
- emotional/acceptance;
- music;
- social;
- values-related.

`Replacement` — один тип intervention, не весь decision engine.

## 13. Treatment Support

Владеет фактом выбранной пользователем cessation support strategy и adherence-related state.

Может учитывать NRT и другие evidence-based approaches.

Не назначает дозировки и не считает NRT smoking relapse.

## 14. Tobacco / Nicotine Usage

Владеет raw facts:

### Cigarette

quantity/time/cost.

### Vape

puffs/device interactions/groups/device/consumable/cost.

### Hookah

session/duration/cost/context.

Raw facts сохраняются независимо от derived models.

## 15. Outcome Learning

Владеет rebuildable personal projections:

- intervention effectiveness;
- Link effectiveness/weakening;
- expectation vs actual effect;
- context-specific outcomes;
- later cohort priors.

Первичная learning logic structured/deterministic, не LLM-based.

## 16. Metrics

Владеет versioned derived metrics:

- Time Saved;
- Money Saved;
- Health Minutes;
- baseline delta;
- smoke-free/nicotine-free state;
- nicotine-free intervals;
- optional ALIVE units.

Health Minutes отдельно версионируются и не выводятся из ALIVE units автоматически.

## 17. Journey / Путь

Владеет presentation/projection logic долгосрочного прогресса:

- freedom status;
- weakened Links;
- belief change;
- returned time/money/Health Minutes;
- relevant milestones.

## 18. Recovery

Владеет flow после target use/lapse:

- immediate recovery state;
- next-risk response;
- return-to-plan;
- no-shame presentation.

## 19. Together

Владеет только whitelist group/friend aggregates и re-engagement presentation.

Не имеет прямого доступа к private free text.

## 20. Referral

Владеет:

- eligible value moments;
- invite tokens;
- click/attribution;
- share events;
- optional friend relationship invitation.

Referral не создаёт consent на sharing behavioural data.

## 21. Donation

Будущий модуль добровольной поддержки разработки.

Владеет provider integration/audit state после отдельного gate.

Donation status не является entitlement к core ALIVE functions.

## 22. Evidence/Hypothesis Governance

Владеет разделением:

- proven/external evidence;
- evidence-informed design;
- heuristic;
- ALIVE hypothesis.

Hypothesis Registry хранит experiment, metric, success/failure criteria и version.

## 23. Analytics

Владеет product usage events без sensitive free text.

Не является источником domain truth.

## 24. Admin & Product Intelligence

Владеет:

- product/operational dashboards;
- evidence/content review tooling;
- UGC inbox;
- experiment visibility;
- health/incident state.

Private user history не является default admin surface.

## 25. Channel Orchestration

Владеет mapping между Domain/Application commands и конкретным frontend/channel representation.

Web/Telegram/Mobile не копируют decision logic.

## 26. AI / Semantic Intelligence

Появляется после product evidence gate.

Владеет provider abstraction и constrained semantic tasks:

- classify;
- summarize;
- match/retrieve;
- structured generation.

Не владеет evidence truth, authorization, canonical metrics или raw DB write access.

## 27. Release & Configuration

Владеет:

- release version;
- methodology/model versions;
- feature flags;
- runtime-safe public config;
- experiment rollout state.

Secrets не являются частью public configuration.
