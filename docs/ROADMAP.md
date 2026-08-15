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

## v3.1 — Together

Цель: проверить гипотезу социальной поддержки без соревнования.

Scope:

- group aggregates;
- participant cards;
- personal-baseline comparison;
- re-engagement nudges;
- privacy whitelist;
- activity pulse.

Gate:

- отсутствие private data leakage;
- qualitative feedback не указывает на shame/competition harm;
- есть measurable reactivation signal или понятный ITERATE decision.

## v3.2 — Admin + Product Intelligence

Цель: сделать эксплуатацию и развитие продукта наблюдаемыми.

Scope:

- admin role/panel;
- product funnel;
- replacement intelligence;
- Links/Meanings analytics;
- UGC Inbox;
- system health;
- incidents;
- email alerts;
- weekly product intelligence;
- operational audit.

Gate:

- admin не читает private text по умолчанию;
- incidents deduplicated OPEN/RECOVERED;
- weekly digest отвечает «что улучшать», а не просто выгружает цифры.

## После v3.2

Следующие направления только после evidence:

- более сложный personalized ranking;
- optional LLM explanations/classification;
- broader cohorts;
- deeper methodology research;
- additional nicotine products;
- native/PWA enhancements;
- research export;
- possible integration with HumanOS only через отдельный ADR и consent boundary.

## Правило roadmap

Переходы идут по evidence gates, а не потому, что следующая версия уже описана.
