# Концептуальная модель данных Habitoff v3

Это не финальная SQL schema. Документ фиксирует business entities и границы до реализации migrations.

## Core identities

### `users`

- internal UUID;
- auth identity reference;
- display name/avatar;
- role/status;
- locale/timezone;
- created/last_seen.

### `user_settings`

- baseline parameters;
- enabled nicotine products;
- target/bridge roles;
- cost defaults;
- food/NRT preferences;
- privacy/group sharing preferences.

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
- private_note;
- deleted_at.

**Контекст вне каталога.** `trigger_code` и `custom_trigger_text` — исключающая пара:
либо код из каталога, либо текст человека, никогда оба. Признак «в каталоге такого
нет» — константа `OTHER_TRIGGER_CODE` (`app/src/data.ts`); в базу она не пишется, а
раскладывается на пустой `trigger_code` и текст. Пустой ввод сохраняется как «Другое»:
пустой `custom_trigger_text` при пустом `trigger_code` означал бы потерянный эпизод,
а не отказ отвечать. Текст приватен наравне с `private_note` и в аналитику не уходит
(ADR-0017, Р1).

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
- raw payload by typed fields;
- deleted_at.

Product-specific typed details должны позволять хранить:

- cigarette quantity;
- hookah session count/duration;
- vape puffs/device type/liquid/device data.

Raw facts не переписываются при изменении Habitoff equivalence model.

## Catalogs

### `triggers_catalog`
### `needs_catalog`
### `replacements_catalog`
### `meanings_catalog`
### `link_templates`

Global published entities versioned/traceable.

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

Versioned weights, например:

- cigarette = 1 unit;
- hookah = 10 units/session;
- vape = 0.1 unit/puff.

### `methodology_versions`

Версия пользовательской методологии/формулировок.

## Derived metrics

### `daily_user_metrics`

Rebuildable daily projection:

- raw usage by product;
- Habitoff units by model version;
- baseline delta;
- successful responses;
- broken Links;
- money/time estimates;
- active flag.

## Product analytics

### `analytics_events`

Без sensitive free text.

### `system_errors`
### `health_checks`
### `incidents`

Operational data отделены от behavioural content.

## Release/audit

### `releases`
### `admin_audit`

## Mandatory ownership rules

- private entities имеют `user_id` и RLS;
- frontend не может доверенно подставлять чужой user_id;
- Together читает только разрешённые projections;
- admin analytics не копирует private text;
- UGC submission не меняет privacy private original.
