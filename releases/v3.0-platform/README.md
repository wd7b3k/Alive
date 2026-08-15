# ALIVE v3.0 — Platform + Core Loop

Статус: `IN DEVELOPMENT`.

## Цель

Построить первую воспроизводимую многопользовательскую платформу ALIVE на новом стеке и довести её до usable core craving loop для небольшой добровольной группы.

## Source of truth

Только repository:

`projectsv2.0/products/alive/`

Внешние dashboards не заменяют git-конфигурацию и migrations.

## Базовый стек

- React + TypeScript + Vite;
- Cloudflare Pages;
- Supabase Auth / Google;
- Supabase PostgreSQL;
- PostgreSQL RLS;
- Edge/DB functions только для privileged logic.

## Этапы release unit

### Step 1 — Platform bootstrap

- frontend scaffold;
- env contract;
- auth shell;
- `/experiment`;
- initial schema + RLS;
- FR/Risk preregistration.

### Step 2 — External platform connection

- remote Supabase;
- Google OAuth;
- local migration workflow;
- Cloudflare Pages preview;
- `alive.hmnos.ru` после успешного preview.

### Step 3 — Onboarding / Baseline

- product selection;
- target vs bridge;
- cigarette/hookah/vape defaults;
- privacy/methodology explanation.

### Step 4 — Core craving flow

- product;
- trigger;
- craving;
- need;
- top-3 replacements;
- action/outcome.

### Step 5 — Personal content

- Meanings CRUD;
- Links CRUD;
- explicit UGC submission.

### Step 6 — Data control / validation

- correction/delete;
- export/profile deletion basics;
- RLS isolation automation;
- responsive/UX review;
- release validation.

## Out of scope

- `Вместе` — v3.1;
- full admin/product intelligence — v3.2;
- production alerting/digest — v3.2;
- complex AI personalization;
- monetization.

## Acceptance

См. `REQUIREMENTS.md` и `VALIDATION.md`.
