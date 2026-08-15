# Архитектура ALIVE v3 — принятое направление

## 1. Статус

Документ фиксирует архитектуру новой серии. **Platform bootstrap уже начат:** frontend и PostgreSQL/RLS schema существуют, Google OAuth и Cloudflare deployment ещё проходят V3-GATE-01.

Основной принцип: **простая архитектура, достаточная для нескольких участников и дальнейшего роста, без преждевременного усложнения.**

## 2. High-level

`Browser / Mobile Web`
→ `alive.hmnos.ru`
→ `Cloudflare Pages`
→ `Supabase Auth (Google)`
→ `Supabase PostgreSQL + RLS`
→ `Edge Functions / DB functions`

Operational jobs позднее:

`Supabase Cron → aggregation / health / maintenance`

Incident/digest email позднее:

`Edge Function → email provider`

## 3. Frontend

Web-first responsive client находится в `app/`.

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

PostgreSQL — durable runtime data store. **Schema source of truth — только `supabase/migrations/` в `wd7b3k/Alive`.**

Основные принципы:

- normalized enough for integrity;
- raw events immutable/traceable where possible;
- derived metrics rebuildable;
- RLS on private entities;
- soft delete where auditability matters;
- schema migrations versioned in git.

## 6. Privileged logic

Edge Functions/DB functions используются только там, где действительно требуются privileged credentials/authorization, в частности для будущих:

- admin operations;
- UGC publish/review;
- weekly digests;
- health checks;
- privileged aggregations.

Не использовать Edge Functions для каждой простой CRUD-операции без причины.

## 7. Analytics

Отделять:

- product events;
- behavioural domain facts;
- operational telemetry.

Не дублировать sensitive text в analytics.

Для будущей групповой статистики использовать заранее агрегированные daily metrics, а не тяжёлые пересчёты всей истории при каждом открытии.

## 8. Module boundaries

ALIVE v3 реализуется как modular monolith на уровне приложения/БД с явным ownership и public contracts между модулями.

Никакой необходимости в microservices на ранней стадии нет.

## 9. Data model evolution

Raw tobacco facts не зависят от ALIVE equivalence model.

Пример:

- raw: `hookah_session_count=1`;
- derived: `alive_units=10` по `equivalence_model=v1`.

При изменении модели raw history остаётся прежней.

## 10. Security

До внешнего пилота:

- RLS coverage/tenant isolation tests;
- admin authorization tests, когда admin появится;
- secret scanning;
- CSP/security headers;
- audit critical privileged actions;
- backup/restore path;
- export/delete test.

## 11. Domain

Основной адрес: `alive.hmnos.ru`.

DNS/deployment metadata после настройки отражаются в repo docs, но реальные secrets — нет.

## 12. Что не требуется v3.0

- Kubernetes;
- microservices;
- ClickHouse;
- Redis cluster;
- GPU/LLM infrastructure;
- event bus;
- сложный data warehouse.

Добавлять только при измеренном trigger.
