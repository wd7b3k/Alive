# Архитектура ALIVE — принятое направление

## 1. Статус

Этот документ фиксирует high-level runtime architecture. Подробная стратегия развития находится в `TECHNICAL_STRATEGY.md`; product semantics — в `PRODUCT_STRATEGY.md`.

Принцип:

> **эволюционировать существующий простой modular monolith, не делать rewrite ради стратегии и не строить инфраструктуру раньше измеренной необходимости.**

## 2. High-level

```text
Web / Messenger / Mobile
        ↓
Channel adapters / Application API
        ↓
ALIVE Domain Core
        ↓
Supabase Auth + PostgreSQL + RLS
        ↓
Raw facts + rebuildable projections + Evidence
        ↓
Optional Learning/AI layers
```

Текущий web delivery:

`Browser → Cloudflare Pages → Supabase Auth/Data/API`.

Privileged/server-side commands используют Edge Functions/DB functions только там, где это действительно требуется.

## 3. Frontends

### Web

React + TypeScript + Vite.

- mobile-first real-time flow;
- desktop-friendly analysis/configuration;
- no service secrets;
- business decision logic не дублируется в UI.

### Messenger

Channel adapter преобразует входящее сообщение в canonical ALIVE application command и ответ обратно в messenger representation.

### Mobile

Использует тот же canonical backend state/API. Device-specific возможности не меняют domain semantics.

## 4. Channel independence

ALIVE должен оставаться одним продуктом:

- одна identity;
- одна Dependence Model;
- одни Links/Goals/outcomes;
- один Intervention Engine;
- одни metric models.

Нельзя поддерживать отдельную product logic для web/Telegram/mobile.

## 5. Auth

Google Sign-In через Supabase Auth сохраняется текущим identity path.

Внутренний ownership использует internal UUID/`auth.uid()` boundary.

Authorization никогда не строится на user-editable metadata.

## 6. Database

PostgreSQL — durable runtime store.

Schema source of truth — `supabase/migrations/`.

Основные принципы:

- raw facts traceable;
- derived state rebuildable;
- model semantics versioned;
- RLS на user-owned exposed data;
- correction/delete with recompute;
- migration discipline.

## 7. Raw vs derived

Пример:

```text
raw: cigarette_event quantity=1
raw: hookah_session duration=75m
raw: vape puffs/interactions

↓ versioned models

derived: baseline delta
         Time Saved
         Money Saved
         Health Minutes
         optional ALIVE units
```

Новая модель не переписывает raw history.

## 8. Domain modules

Канонический ownership определён в `MODULES.md`.

Ключевые boundaries:

- Episode;
- Nicotine Products;
- Links;
- Goals/Зачем;
- Evidence/Facts/Myths;
- Micro-awareness;
- Intervention;
- Treatment Support;
- Outcome Learning;
- Metrics;
- Journey/Recovery;
- Together;
- Referral;
- Donation;
- AI/Semantic Intelligence.

## 9. Evidence architecture

Medical claim не создаётся runtime-LLM или frontend.

Pipeline:

`source → evidence claim/version → reviewed user content → product exposure`

Evidence Registry должен иметь отдельный ownership и auditability.

## 10. Intervention architecture

Первая версия преимущественно deterministic:

`context → product-specific resolver → Link matcher → eligibility → micro-awareness → candidate generation → personal ranking → explanation`

Personal ranking строится на structured outcomes.

LLM не required dependency.

## 11. Metrics architecture

Постоянные пользовательские метрики:

- Time Saved;
- Money Saved;
- Health Minutes.

Все расчёты имеют model version. Health Minutes дополнительно хранят evidence/product coverage и не выводятся из ALIVE units автоматически.

Для быстрого UI используются rebuildable daily/lifetime projections.

## 12. AI architecture

AI вводится только после product evidence gate.

Архитектурно:

`Domain/Application → AIProvider abstraction → self-hosted/local inference`

LLM получает минимальный context и constrained tasks.

ALIVE работает при полном отказе LLM.

LLM не имеет:

- service-role DB access;
- authorization authority;
- Evidence Registry write authority;
- canonical metric authority.

## 13. Referral architecture

Referral — secondary service и не блокирует cessation flow.

Invite token opaque и не содержит private identity/metrics.

`проходить вместе` требует отдельного consent после регистрации.

## 14. Donation architecture

Donation provider не является foundation dependency.

До отдельного gate core ALIVE не знает о платёжном статусе пользователя.

После подключения provider donation остаётся non-entitlement support model.

## 15. Analytics

Разделяются:

- domain facts;
- product analytics;
- operational telemetry.

Sensitive free text не копируется в generic analytics.

## 16. Security

До внешнего расширения обязательны:

- RLS coverage;
- two-user isolation;
- admin authorization tests;
- secret scanning;
- export/delete tests;
- Together whitelist tests;
- referral privacy tests;
- backup/restore path;
- privileged action audit.

## 17. Reliability

Core cessation path деградирует независимо от secondary systems:

- LLM down → deterministic core works;
- analytics down → core works;
- Together down → personal flow works;
- referral down → core works;
- Tribute down → core works.

## 18. Scaling

Порядок:

1. query/index/projection optimization;
2. async jobs where measured;
3. horizontal inference scaling after AI introduction;
4. service extraction only after measured bottleneck.

Не строить distributed infrastructure для гипотетической нагрузки.

## 19. Deployment/source of truth

- repo = source of truth;
- production deployment связан с commit/release;
- runtime config имеет safe repo representation;
- secrets вне git/frontend/logs;
- branch/release/validation/rollback discipline обязательна.

## 20. Architecture gates

Перед существенным infrastructure expansion необходимо показать:

- измеренный bottleneck;
- why current architecture insufficient;
- expected gain;
- migration/rollback cost;
- privacy/security impact.

По умолчанию выбирается самый простой вариант, сохраняющий product contract.
