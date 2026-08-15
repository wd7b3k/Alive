# Архитектура ALIVE v3 — принятое направление

## 1. Статус

Документ фиксирует целевую архитектуру новой серии. Реализация ещё не начата.

Основной принцип: **простая архитектура, достаточная для нескольких участников и дальнейшего роста, без преждевременного усложнения.**

## 2. High-level

`Browser / Mobile Web`
→ `alive.hmnos.ru`
→ `Cloudflare Pages`
→ `Supabase Auth (Google)`
→ `Supabase PostgreSQL + RLS`
→ `Edge Functions / DB functions`

Operational jobs:

`Supabase Cron → aggregation / health / maintenance`

Incident/digest email:

`Edge Function → email provider`

## 3. Frontend

Планируется web-first responsive client на `alive.hmnos.ru`.

Требования:

- mobile-first craving flow;
- desktop-friendly analytics/settings/methodology;
- no service secrets;
- direct authenticated Supabase client допустим только для RLS-защищённых user-scoped операций;
- privileged/admin/server operations только через server-side functions.

Cloudflare Pages — static hosting/deployment layer, а не business backend.

## 4. Auth

Google Sign-In через Supabase Auth.

Не создавать собственные passwords/invite sessions.

Внутренняя модель использует `auth.uid()`/internal UUID для tenant isolation.

## 5. Database

PostgreSQL — durable source of truth.

Основные принципы:

- normalized enough for integrity;
- raw events immutable/traceable where possible;
- derived metrics rebuildable;
- RLS on private entities;
- soft delete where auditability matters;
- schema migrations versioned in git.

## 6. Privileged logic

Edge Functions/DB functions используются для:

- admin operations;
- UGC publish/review;
- weekly digests;
- health checks;
- privileged aggregations;
- operations requiring service credentials.

Не использовать Edge Functions для каждой простой CRUD-операции без причины.

## 7. Analytics

Отделять:

- product events;
- behavioural domain facts;
- operational telemetry.

Не дублировать sensitive text в analytics.

Для групповой статистики использовать заранее агрегированные daily metrics, а не тяжёлые пересчёты всей истории при каждом открытии.

## 8. Module boundaries

ALIVE v3 может быть реализован как modular monolith на уровне кода/БД, но ownership и public contracts между модулями должны быть явными.

Никакой необходимости в microservices на ранней стадии нет.

## 9. Data model evolution

Raw tobacco facts не зависят от ALIVE equivalence model.

Пример:

- raw: `hookah_session_count=1`;
- derived: `alive_units=10` по `equivalence_model=v1`.

При изменении модели raw history остаётся прежней.

## 10. Security

До внешнего пилота:

- RLS coverage report;
- tenant isolation tests;
- admin authorization tests;
- secret scanning;
- CSP/security headers;
- audit critical privileged actions;
- backup/restore path;
- export/delete test.

## 11. Domain

Основной адрес: `alive.hmnos.ru`.

DNS/deployment metadata после настройки должны быть отражены в repo docs, но реальные secrets — нет.

## 12. Что не требуется v3.0

- Kubernetes;
- microservices;
- ClickHouse;
- Redis cluster;
- GPU/LLM infrastructure;
- event bus;
- сложный data warehouse.

Добавлять только при измеренном trigger.
