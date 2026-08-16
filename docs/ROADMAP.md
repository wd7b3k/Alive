# Roadmap ALIVE

## F0 — Project Foundation

Цель:

- отделить ALIVE как самостоятельный продуктовый контур;
- зафиксировать миссию, некоммерческий статус, происхождение, privacy, methodology, architecture direction, modules, hypotheses и release discipline.

Gate:

- foundation PR merged;
- новый разработчик/AI может восстановить состояние без чата;
- отсутствует код новой серии до завершения foundation.

## v3.0 — Platform + Core Loop

Цель: построить минимально полноценную многопользовательскую платформу на новом стеке и проверить core behaviour loop.

Scope:

- `alive.hmnos.ru`;
- Cloudflare Pages;
- Supabase Auth + Google;
- PostgreSQL + RLS;
- onboarding/baseline;
- cigarette/hookah/vape;
- raw events + ALIVE Equivalence v1;
- craving flow;
- Trigger/Need/Replacement catalogs;
- Replacement Engine v1;
- food/drink replacements;
- NRT;
- personal Meanings CRUD;
- personal Links CRUD;
- UGC submission;
- page `Эксперимент`;
- explainability/help system;
- export/delete basics;
- release/docs/tests.

Не входит:

- Together;
- полноценная admin intelligence;
- production-grade alerting/digests.

Gate:

- минимум два независимых Google users;
- RLS isolation passes;
- new-user flow понятен без устной инструкции;
- raw cigarette/hookah/vape events корректны;
- core craving flow usable.

## v3.1 — Behavioral Depth + Together

Цель: углубить персональный behavioural engine и одновременно проверить гипотезу социальной поддержки без соревнования.

Scope:

- evidence review современных методов прекращения курения;
- отдельный research по smoking myths / outcome expectancies;
- расширенный каталог Замен с механизмами, evidence metadata и адаптированными HumanOS micro-techniques;
- Replacement Engine v2: три по возможности разных механизма + personal outcome ranking;
- food/drink/oral/manual/grounding/attention/movement/focus/social/context-change replacements;
- guided craving UX: заметный progress, явный шаг, кликабельные завершённые этапы, downstream invalidation;
- русский user-facing copy, ясные product-aware CTA;
- `Мифы` как contextual behavioural entity + private relevance state;
- `Факты` как мягкий evidence layer с прямыми источниками;
- optional smoking start year + cigarette pack-years только как evidence-matching metadata;
- lapse flow без обнуления + context disruption + safe-driving rule;
- group aggregates;
- personal-baseline comparison;
- privacy whitelist;
- small-cohort suppression;
- activity pulse;
- re-engagement without shame;
- approved logo runtime hardening;
- release/docs/security validation.

Не входит:

- leaderboard;
- публичная лента;
- публикация private Meanings/Links/notes;
- полноценная admin intelligence;
- перенос business logic в несколько клиентских приложений;
- native mobile / Telegram client.

Gate:

- отсутствие private data leakage;
- detailed group aggregates suppress small cohorts;
- qualitative feedback не указывает на shame/competition harm;
- replacement suggestions различаются по механизму там, где каталог это позволяет;
- Facts/Myths имеют проверяемый evidence source;
- no fabricated personal medical risk;
- guided flow back-navigation не оставляет stale downstream state;
- approved logo подтверждён в production runtime;
- есть measurable reactivation / behavioural signal или понятный ITERATE decision.

## v3.2 — Admin + Product Intelligence + Multi-client Application Layer

Цель: сделать эксплуатацию и развитие продукта наблюдаемыми и подготовить ALIVE к нескольким клиентским приложениям поверх одной канонической модели данных.

Scope исследования и проектирования начинается только после v3.1 gate.

### Admin / Product Intelligence

- admin role/panel;
- product funnel;
- replacement intelligence;
- Myths/Facts effectiveness;
- Links/Meanings analytics;
- Together aggregates quality;
- UGC Inbox;
- system health;
- incidents;
- email alerts;
- weekly product intelligence;
- operational audit.

### Multi-client architecture

Целевая модель:

`Web / Telegram / native mobile / future clients → versioned application/API contracts → domain modules → one canonical PostgreSQL data model`

Обязательные принципы:

- единая база и единая семантика raw behavioural events;
- business logic не дублируется во frontend, Telegram bot и mobile client;
- клиенты являются adapters/views над общими application use-cases;
- domain boundaries и module ownership сохраняются;
- privileged операции не переносятся в клиент;
- auth/identity mapping проектируется отдельно для каждого transport, но приводит к одному ALIVE user/profile;
- API contracts versioned;
- идемпотентность writes для нестабильных/mobile/messenger transports;
- offline/retry strategy для mobile продумывается до реализации;
- realtime нужен только там, где есть измеренная продуктовая необходимость;
- не вводить микросервисы ради самого наличия нескольких клиентов;
- Supabase/PostgreSQL остаётся canonical data store, пока evidence не требует другого решения.

Отдельные клиенты, которые нужно предусмотреть архитектурно:

- Web;
- Telegram;
- native Android/iOS или общий mobile client;
- последующие messenger/front adapters.

Gate:

- admin не читает private text по умолчанию;
- incidents deduplicated OPEN/RECOVERED;
- weekly digest отвечает «что улучшать», а не просто выгружает цифры;
- минимум два разных client adapters проходят один и тот же application contract test suite;
- одинаковое действие через разные клиенты создаёт семантически одинаковый raw event;
- нет client-specific fork бизнес-правил;
- security/privacy boundary задокументирована для каждого transport.

## После v3.2

Следующие направления только после evidence:

- broader cohorts;
- optional LLM explanations/classification;
- additional nicotine products;
- research export;
- deeper JIT personalization;
- additional client adapters;
- possible integration with HumanOS only через отдельный ADR и consent boundary.

## Правило roadmap

Переходы идут по evidence gates, а не потому, что следующая версия уже описана.
