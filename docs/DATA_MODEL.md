# Концептуальная модель данных ALIVE

Это не финальная SQL schema. Документ фиксирует business entities, semantics и ownership до реализации migrations.

Главные правила:

- raw facts отдельно от derived interpretation;
- user-owned data private by default;
- derived state rebuildable;
- medical/evidence semantics versioned;
- correction/deletion не требует ручного исправления счётчиков;
- channel frontends работают с одной canonical model.

## Identity

### `users`

- internal UUID;
- auth identity reference;
- display name/avatar;
- locale/timezone;
- status;
- created/last_seen.

### `user_consents`

- user_id;
- consent_type;
- version;
- granted/revoked timestamps.

### `user_settings`

- enabled products;
- privacy preferences;
- notification preferences;
- optional default costs/durations;
- feature preferences.

## Dependence profile

### `user_product_profiles`

Per product:

- user_id;
- product_type;
- role: target_dependency / cessation_bridge / episodic / treatment-related;
- baseline parameters;
- enabled/active;
- personal cost model;
- product-specific settings.

### `journey_state`

- current stage;
- quit/reduction target;
- target date optional;
- smoke-free/nicotine-free goals;
- strategy metadata;
- methodology version.

## Episodes

### `episodes`

Canonical decision episode:

- id;
- user_id;
- target_product;
- started/completed;
- context/trigger;
- craving_before/after optional;
- recognized_link_id optional;
- decision;
- outcome;
- expected_benefit optional;
- actual_benefit optional;
- private_note optional;
- deleted/corrected state.

Не каждый episode обязан заполнять все поля.

### `episode_actions`

Один episode может содержать несколько действий:

- replacement/intervention;
- treatment/NRT action;
- cigarette;
- vape interaction;
- hookah session relation;
- social/environmental action.

## Raw nicotine/tobacco facts

### `tobacco_events`

Общие поля:

- id;
- user_id;
- episode_id optional;
- product_type;
- occurred_at;
- actual cost where known;
- deleted/corrected state;
- typed raw payload/reference.

### Cigarette details

- quantity;
- optional duration;
- optional actual cost.

### Vape details

Нужна возможность хранить:

- raw puffs;
- device interaction/session/group;
- device type;
- consumable type;
- nicotine-related metadata if explicitly known;
- cost;
- interaction timestamps sufficient for nicotine-free interval projections.

### Hookah details

- session count;
- duration;
- actual cost;
- optional pre-session decision/context fields.

Raw facts не переписываются при смене ALIVE units, baseline или Health Minutes model.

## Treatment

### `treatment_plans`

Хранит только выбранную/введённую пользователем strategy metadata:

- type;
- active period;
- optional clinician/pharmacist involvement flag;
- status.

Не является prescription engine.

### `treatment_events`

- treatment plan id;
- event type;
- occurred_at;
- optional structured details.

NRT/treatment events не считаются smoking relapse автоматически.

## Links / Связки

### `link_templates`

Global reviewed templates.

### `user_links`

- user_id;
- context/trigger;
- optional need/function;
- target product;
- prepared response;
- active state;
- user text;
- privacy/UGC state.

### `link_projections`

Rebuildable:

- attempts;
- target-action rate;
- response effectiveness;
- craving dynamics;
- weakening indicator;
- last seen.

## Goals / Зачем

### `goals_catalog`

Optional global templates.

### `user_goals`

- user_id;
- type: goal/value/personal formulation;
- text;
- order;
- active;
- contextual tags;
- private by default;
- UGC state optional.

## Evidence

### `evidence_sources`

- source type;
- title;
- canonical reference;
- publication/update metadata;
- publisher/journal;
- status.

### `evidence_claims`

- canonical claim;
- topic;
- population/context;
- evidence strength;
- limitations;
- status;
- reviewed_at.

### `evidence_claim_versions`

История смысловых изменений claim.

### `content_items`

Approved user-facing content:

- Fact;
- Myth/reframe;
- methodology explanation;
- support content.

Связан с evidence claim/version, где medical meaning существенен.

## Beliefs / Myths / Reframe

### `belief_catalog`

Reviewed belief/myth templates.

### `user_beliefs`

- user_id;
- belief id/text;
- strength;
- active;
- linked Links/triggers.

### `belief_measurements`

- before/after strength;
- experiment relation;
- timestamp.

### `expectation_outcome_observations`

- episode_id;
- expected benefit;
- actual perceived benefit;
- optional state delta.

## Interventions

### `interventions_catalog`

Canonical intervention definitions and categories.

### `intervention_rules`

Versioned eligibility/context rules.

### `intervention_attempts`

- episode;
- intervention;
- rank/source;
- chosen/completed;
- outcome;
- explanation version.

### `intervention_effectiveness`

Rebuildable personal projection:

- attempts;
- completion;
- helpfulness;
- craving delta;
- post-intervention target action;
- context/product dimensions.

## Micro-awareness

### `micro_awareness_exposures`

Хранит минимальные structured facts для fatigue/experiment analysis:

- user_id;
- episode/context;
- content item id;
- type: fact/myth/goal/insight;
- variant/version;
- shown_at;
- optional response.

Не дублирует sensitive free text в analytics.

## Derived metric models

### `baseline_models`
### `time_saved_models`
### `money_saved_models`
### `health_minutes_models`
### `equivalence_models`
### `intervention_ranking_models`
### `methodology_versions`

Каждая model version immutable/traceable после использования.

## User metrics

### `daily_user_metrics`

Rebuildable daily projection:

- raw usage per product;
- baseline delta;
- Time Saved;
- Money Saved;
- Health Minutes + model version/coverage;
- smoke-free/nicotine-free indicators;
- successful impulse responses;
- nicotine-free intervals;
- active flag.

### `lifetime_user_metrics`

Fast lifetime projection.

## Together

### `group_memberships`

Explicit membership/consent state.

### `group_daily_aggregates`

Только whitelist metrics.

### `friend_relationships`

Optional mutual consent relationship после referral; не даёт raw-data access.

## Referral / self-marketing

### `referral_invites`

- opaque token/hash;
- inviter;
- created/expiry/revoked;
- source value moment;
- share variant.

### `referral_events`

- click/visit/activation attribution;
- no sensitive inviter state in public token.

### `share_events`

Что пользователь явно решил поделиться; payload должен быть privacy-filtered snapshot.

## Donation

Будущий scope после отдельного gate.

### `donation_provider_events`

Только если integration нужна для учёта:

- provider;
- external event id;
- verified status;
- amount/currency where allowed/needed;
- processed/idempotency state.

Donation data не создаёт entitlement.

## Hypotheses / Experiments

### `hypotheses`

- code/version;
- mechanism;
- expected effect;
- status;
- success/failure criteria.

### `experiments`

- hypothesis;
- feature flag/cohort;
- start/end;
- metric definitions;
- decision.

## UGC

### `ugc_submissions`

Explicit snapshot после `Предложить в общую базу`:

- source type;
- content snapshot;
- source user;
- attribution allowed;
- moderation status;
- reviewed/published metadata.

Private original не меняет visibility.

## Analytics

### `analytics_events`

Product usage events без sensitive free text.

### `system_errors`
### `health_checks`
### `incidents`

Operational state отдельно от behavioural domain facts.

## Release / audit

### `releases`
### `admin_audit`

## Mandatory ownership/security rules

- private entities имеют `user_id` и RLS;
- frontend не может доверенно задавать чужой ownership;
- Together читает только approved aggregate projections;
- referral tokens не содержат user email/id/private metrics;
- admin analytics не копирует private text;
- UGC требует explicit submission;
- LLM не получает direct privileged DB write access;
- derived model updates не переписывают raw history;
- correction/deletion инициирует deterministic recompute dependent projections.
