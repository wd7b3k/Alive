# Карта модулей Habitoff v3

## 1. Identity & Profile

Владеет:

- identity mapping;
- display profile;
- role;
- locale/timezone;
- onboarding status.

Не владеет behavioural history.

## 2. Onboarding & Baseline

Владеет:

- target dependencies;
- cessation bridges;
- baseline usage;
- product cost references;
- пользовательскими настройками первой конфигурации.

## 3. Nicotine Product Model

Владеет каталогом типов:

- cigarette;
- hookah;
- vape;
- NRT как intervention, но не target tobacco event.

Содержит versioned equivalence models.

## 4. Episode

Canonical behavioural event:

`trigger → craving → need → response → outcome`.

Владеет:

- episode lifecycle;
- target product;
- private note;
- craving/outcome facts.

## 5. Trigger & Need Catalog

Общие справочники и пользовательские extensions.

Не публикует private пользовательский текст автоматически.

## 6. Replacement Engine

Владеет:

- candidate generation;
- ranking;
- eligibility rules;
- explanation why suggested;
- versioned ranking logic.

Не владеет raw episode history.

## 7. Meanings

Владеет:

- global meanings catalog;
- private user meanings;
- order/active state;
- submission into UGC review.

## 8. Links

Владеет:

- private user Links;
- global templates;
- Link CRUD;
- relationship to triggers/needs/replacements;
- UGC submission.

## 9. Food & Drink Replacements

Владеет:

- food/drink candidate catalog;
- time-of-day eligibility;
- daily limits/guardrails;
- user preferences.

Не назначает лечебную диету.

## 10. NRT

Владеет фактом использования:

- spray;
- gum;
- patch.

Не назначает дозировку и не считает NRT relapse.

## 11. Tobacco Usage

Владеет raw facts:

- cigarettes quantity/cost;
- hookah sessions/cost/duration;
- vape puffs/device/consumable facts.

Raw facts отделены от Habitoff units.

## 12. Metrics & Equivalence

Владеет derived metrics:

- Habitoff units;
- baseline delta;
- money/time estimates;
- successful responses;
- broken Links;
- streak/interval metrics.

Каждая derived metric имеет definition/version.

## 13. Together

Появляется в v3.1.

Владеет только разрешёнными group aggregates и re-engagement presentation logic.

Не читает private content напрямую.

## 14. UGC

Владеет:

- explicit submissions;
- moderation status;
- attribution permission;
- merge/publish workflow.

Private original остаётся у исходного модуля.

## 15. Experiment / Methodology

Владеет пользовательским объяснением:

- что проверяет Habitoff;
- факты vs hypotheses vs heuristics;
- privacy explanation;
- methodology versions.

## 16. Analytics

Владеет product usage events без sensitive free text.

## 17. Admin & Product Intelligence

Появляется в v3.2.

Владеет:

- product/operational dashboards;
- UGC Inbox;
- content quality signals;
- recommendations owner/admin.

## 18. Health & Monitoring

Появляется в v3.2.

Владеет:

- health checks;
- operational incidents;
- recovery state;
- email notification orchestration.

## 19. Release & Configuration

Владеет:

- release version;
- schema/methodology versions;
- feature flags;
- runtime-safe public configuration.

Secrets не являются частью public configuration.
