# ALIVE v3.1 — implementation response / handoff

Дата: 2026-08-16

## Branch

`agent/v3.1-behavioral-depth-together`

## Pull request

Draft PR `#5` — `ALIVE v3.1: behavioral depth, Myths, Facts and Together`

Base: `main` (`86b4608...` v3.0 deep interface redesign)

## Что выполнено

### Research

Созданы два независимых research artifacts:

- `docs/research/NICOTINE_CESSATION_EVIDENCE_2026.md`
- `docs/research/SMOKING_MYTHS_AND_EXPECTANCIES_2026.md`

Зафиксировано разделение:

- A — evidence по cessation outcome/class intervention;
- B — evidence по acute craving/state/intermediate outcome;
- C — behavioural heuristic ALIVE.

Запрещён fabricated personal medical risk из cohort averages.

### Replacement Engine v2

Live catalog после migrations:

- 75 published Replacements;
- 18 distinct mechanisms.

Добавлены/расширены:

- grounding;
- breathing;
- attention;
- movement;
- pause;
- oral/manual;
- food/drink;
- focus;
- reflection;
- social;
- context change;
- meaning/reward;
- evidence-treatment metadata.

Адаптированы короткие HumanOS v1.0 techniques без выдачи их за доказанную cessation therapy.

Ranking v2 учитывает:

- product;
- trigger mapping;
- need;
- craving intensity where metadata exists;
- personal helpfulness;
- craving delta;
- successful response history;
- recent repetition;
- evidence metadata.

Top-3 по возможности формируется из трёх разных mechanisms.

### Guided craving UX

Новый v3.1 shell:

`Продукт → Ситуация → Сила тяги → Что нужно → Замена → Результат`

Реализовано:

- заметный progress;
- `Шаг N из 6`;
- кликабельные достигнутые steps;
- downstream invalidation;
- product-aware CTA:
  - `Хочу закурить`;
  - `Хочу затянуться`;
  - `Хочу покурить кальян`;
- Russian user-facing copy;
- contextual Myth максимум один;
- lapse-safe outcome flow;
- driving safety copy;
- no smoking optimization.

### Мифы

Созданы:

- `myths_catalog`;
- private `user_myth_state`.

Published seed: 19 myths.

User relevance:

- `Похоже на меня`;
- `Не про меня`.

RLS own-user only.

Myth Engine использует trigger/need/product/context mapping и repetition penalty.

### Факты

Создан `facts_catalog`.

Published seed: 19 source-linked Facts.

Facts — мягкий общий evidence layer, не personal mortality calculator.

Optional cigarette `start_year` + derived pack-years добавлены только как evidence matching metadata.

### Lapse / context disruption

- episode не обнуляет историю;
- quick/guided flow напоминает изменить привычный context;
- driving: безопасно остановиться и выйти; никогда не курить за рулём;
- observational prompt не рекомендует глубже/дольше курить или докуривать.

### Вместе

Добавлен main-menu route `Вместе`.

Aggregate contract показывает:

- participants;
- active today/period;
- episodes;
- replacement attempts;
- successful responses;
- distribution относительно каждого собственного cigarette baseline;
- safe mechanism aggregates.

Нет leaderboard.

Privacy:

- public API не возвращает user ids/names/private texts;
- detailed aggregates suppress ниже 3 participants;
- public function — SECURITY INVOKER;
- privileged aggregate implementation вынесен в unexposed `private` schema;
- Security Advisor warning по public SECURITY DEFINER устранён.

### Logo

Approved `brand-logo-full.png` сохранён без изменения.

Active entrypoint теперь явно:

- рендерит `V31App`;
- загружает `v31.css` после redesign CSS;
- logo CSS задаёт реальные non-zero dimensions/visibility.

Cloudflare Pages branch preview deploy успешен.

**Но logo issue пока не объявляется окончательно закрытым:** нужен реальный visual smoke-test deployed login + authenticated header + mobile. Build/deploy status недостаточен.

## Supabase migrations applied

1. `v31_behavioral_content_schema`
2. `v31_replacements_seed`
3. `v31_myths_seed`
4. `v31_facts_seed`
5. `v31_together_aggregates`
6. `v31_together_security_hardening`

## Validation

### PASS

- DB migrations;
- catalog counts;
- RLS on new tables;
- private myth state policies;
- Together aggregate contract smoke-test;
- no private-key patterns in Together response;
- small-cohort suppression;
- Supabase Security Advisor Together hardening;
- GitHub Actions locked install;
- TypeScript typecheck;
- Vite production build;
- Cloudflare Pages branch preview deployment.

Latest verified GitHub CI at canonical branch state: SUCCESS.

### Remaining hard gates

- interactive browser guided-flow smoke-test;
- back-step/downstream invalidation interaction;
- Facts/Myths source interaction;
- Together UI suppressed-state rendering;
- start-year edit/persistence through real authenticated browser;
- mobile navigation/layout;
- visual logo confirmation on login/authenticated/mobile;
- two-user client isolation test when a genuine second profile/test account exists;
- owner review of medically significant copy.

## Documentation synchronized

Updated:

- `docs/CURRENT_STATE.md`
- `docs/DATA_MODEL.md`
- `docs/HYPOTHESES_AND_METRICS.md`
- `docs/METHODOLOGY.md`
- `docs/ROADMAP.md`

Release unit:

- `releases/v3.1-behavioral-depth-together/README.md`
- `REQUIREMENTS.md`
- `VALIDATION.md`
- `ROLLBACK.md`

## Следующий этап зафиксирован

v3.2 теперь явно включает:

### Admin + Product Intelligence

- product/admin intelligence;
- funnels;
- Replacement/Myths/Facts effectiveness;
- UGC review;
- health/incidents;
- operational/product digest.

### Multi-client Application Layer

Target architecture:

`Web / Telegram / native mobile / future clients → versioned application/API contracts → domain modules → one canonical PostgreSQL model`

Ключевое требование владельца записано в roadmap: business logic не должна копироваться между client applications; разные клиенты должны быть adapters над едиными use-cases и raw-event semantics.

## Recommendation

PR оставить draft до manual/runtime gates. Не merge только на основании CI + database success.
