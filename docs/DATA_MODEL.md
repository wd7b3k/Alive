# Концептуальная модель данных ALIVE v3

Документ фиксирует business entities и ownership. SQL source of truth — versioned migrations в `supabase/migrations/`.

## Core identities

### `profiles`

- internal UUID = auth user id;
- display name/avatar;
- role/status;
- onboarding state;
- created/updated timestamps.

### `user_settings`

- goal/preferences;
- food/NRT preferences;
- knowledge/myth reminder switches;
- privacy/group-sharing preferences;
- optional Together alias/card consent for future use.

### `user_nicotine_products`

- product type;
- target/bridge role;
- enabled flag;
- baseline JSON;
- product defaults.

Для cigarettes baseline может содержать:

- `cigarettes_per_day`;
- optional `start_year`.

`pack-years` — derived helper `years × cigarettes_per_day / 20`; не raw fact, не central metric и не применяется к vape/hookah.

## Behaviour

### `episodes`

- id;
- user_id;
- target_product;
- started/completed;
- trigger;
- need;
- craving_before/after;
- outcome;
- helpfulness;
- private_note;
- deleted_at.

### `episode_actions`

Может содержать несколько действий внутри одного episode:

- behavioural replacement;
- food/drink;
- NRT;
- cigarette;
- hookah;
- vape.

## Raw nicotine facts

### `tobacco_events`

Общие поля:

- user_id;
- episode_id optional;
- product_type;
- occurred_at;
- cost_actual;
- raw typed fields;
- deleted_at.

Product-specific typed details позволяют хранить:

- cigarette quantity;
- hookah session count/duration;
- vape puffs/device type/liquid/device data.

Raw facts не переписываются при изменении ALIVE equivalence model.

## Catalogs

### `triggers_catalog`
### `needs_catalog`
### `replacements_catalog`
### `meanings_catalog`
### `identity_scripts_catalog`
### `supports_catalog`
### `rewards_catalog`

Global published entities versioned/traceable.

### Replacement evidence metadata v3.1

`replacements_catalog` дополнительно хранит:

- `mechanism`;
- evidence level `A/B/C`;
- evidence scope;
- source title/url where applicable;
- context tags;
- rotation weight;
- optional intensity range.

Evidence level не означает, что конкретная карточка ALIVE сама доказана как cessation treatment:

- A — intervention/class имеет cessation evidence;
- B — evidence преимущественно по craving/state/intermediate outcome;
- C — ALIVE behavioural heuristic.

## Knowledge layer v3.1

### `myths_catalog`

Versioned published beliefs/outcome expectancies:

- claim/title;
- short reframe;
- explanation;
- mechanism;
- evidence level/scope;
- source/DOI;
- trigger/need/product/context tags;
- related replacement codes;
- last verified date.

Миф — behavioural entity, а не просто FAQ.

### `user_myth_state`

Private user-owned relation:

- user_id;
- myth_code;
- relevance `unknown/relevant/not_relevant`;
- seen/helpful counts;
- last shown;
- dismissed until.

RLS ownership mandatory. Эта сущность не попадает в Together.

### `facts_catalog`

Versioned evidence cards:

- short/full Russian copy;
- category;
- risk/benefit orientation;
- evidence level/kind;
- source/DOI/sample size;
- product scope;
- optional exposure matching metadata (`min/max years`, `min/max pack-years`);
- context tags;
- last verified date.

Exposure metadata выбирает более релевантный **источник**, но не превращает population statistic в individual medical prediction.

## Personal content

### `user_meanings`
### `user_links`

Private by default, RLS user-owned.

## UGC

### `ugc_submissions`

Отдельная сущность после explicit submit:

- source_type;
- submitted content snapshot;
- source_user_id;
- attribution_allowed;
- moderation status;
- reviewed/published metadata.

## Models

### `equivalence_models`

Versioned behavioural weights, например:

- cigarette = 1 unit;
- hookah = 10 units/session;
- vape = 0.1 unit/puff.

Эти weights не являются medical harm equivalence.

### `methodology_versions`

Версия пользовательской методологии/формулировок.

## Together v3.1

Together не имеет публичной user-level projection.

Публичный contract:

### `public.get_together_summary(days)`

`SECURITY INVOKER` wrapper возвращает только whitelist aggregates:

- participant count;
- active today/period;
- episode count;
- replacement attempts;
- successful responses;
- distribution относительно собственного cigarette baseline;
- mechanism-level aggregate use/helpfulness.

Privileged cross-user read вынесен в `private.get_together_summary_internal()` и не экспонируется как public Data API schema.

Privacy rules:

- no user ids;
- no names/aliases;
- no notes;
- no Meanings/Links;
- no individual triggers;
- no medication details;
- no event timestamps;
- detailed baseline/mechanism aggregates suppressed ниже cohort threshold 3.

## Derived metrics

### `daily_user_metrics` — future projection

Rebuildable daily projection:

- raw usage by product;
- ALIVE units by model version;
- baseline delta;
- successful responses;
- broken Links;
- money/time estimates;
- active flag.

Не обязана материализовываться до performance need.

## Product analytics — next stage

### `analytics_events`

Planned: без sensitive free text.

### `system_errors`
### `health_checks`
### `incidents`

Operational data отделяются от behavioural content.

Полноценный Admin / Product Intelligence относится к v3.2.

## Multi-client application layer — next stage

Целевая архитектура v3.2:

`Web / Telegram / native mobile / future clients → versioned application/API contracts → domain modules → one canonical PostgreSQL model`

Business semantics raw events, Episodes, Myths/Facts and privacy rules не должны дублироваться или расходиться между клиентами.

## Release/audit

### release units в git
### будущий `admin_audit`

## Mandatory ownership rules

- private entities имеют `user_id` и RLS;
- frontend не может доверенно подставлять чужой user_id;
- Together читает только whitelist aggregates;
- admin analytics не копирует private text;
- UGC submission не меняет privacy private original;
- новый client adapter не получает право обходить domain/API boundary;
- raw behavioural history сохраняет transport-independent semantics.
