# Текущее состояние ALIVE

## Статус

ALIVE — самостоятельный private repository `wd7b3k/Alive`.

Канонический production line остаётся **ALIVE v3.0 — PRODUCT ALPHA / IN DEVELOPMENT**.

Параллельно собран **ALIVE v3.1 — Behavioral Depth + Together / DRAFT VALIDATION** в отдельной ветке:

`agent/v3.1-behavioral-depth-together`

Draft PR: `#5`.

v3.1 не считается RELEASED и не должен merge до закрытия runtime/privacy/owner-review gates.

`wd7b3k/Alive` — единственный source of truth. Код, migrations, product rules и release gates меняются сначала в repo; Dashboard/чат не переопределяют repo.

## Живая инфраструктура

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Текущий production host: `https://alive-aw2.pages.dev`.
- Planned canonical host: `https://alive.hmnos.ru`.
- Auth: Google → Supabase Auth.
- Database: Supabase PostgreSQL + RLS.
- Supabase project: `xkigijaqimzuveyzyzyk`, `eu-west-1`.
- GitHub CI: Node `22.12.0`, `npm ci`, typecheck, production build.

Google OAuth был проверен реальным входом на v3.0: Auth user и ALIVE profile автоматически создаются, display name/avatar приходят из Google metadata.

На момент v3.1 validation в live project существует один реальный profile, поэтому честный two-user isolation runtime test нельзя закрыть без второго реального/test account.

## v3.0 baseline

Первый web-shell был технически рабочим, но продуктово значительно беднее legacy v2.7. Это признано regression.

Создан обязательный baseline `docs/V3_PARITY_BASELINE.md`:

**новая версия не может считаться готовой, если пользователь получает менее глубокий продукт, чем утверждённый предыдущий baseline**.

v3.1 поэтому не переписывает Links/Path/Meanings с нуля, а сохраняет богатый v3.0 UI и добавляет новые behavioral/knowledge/Together слои.

## Реализовано в v3.0

### Product UI

- universal onboarding / personal baseline;
- cigarette / hookah / vape как отдельные raw products;
- product role: `target_dependency` / `cessation_bridge`;
- Сегодня — action screen, current metrics, attention links, recent episodes;
- guided craving flow;
- quick nicotine fact logging;
- evening check-in;
- Связки — automatic trigger map + private user Links;
- Смыслы — global catalog + private CRUD/UGC workflow;
- Путь — динамика, raw products, replacement effectiveness, Freedom Fund, rewards;
- Profile/baseline;
- Эксперимент — methodology, assumptions, limitations, privacy;
- Релизы;
- deletion of erroneous/test episode with recalculation;
- inline explanations / `nothing unexplained`.

## Что добавлено в v3.1 branch

### Evidence / research

Созданы:

- `docs/research/NICOTINE_CESSATION_EVIDENCE_2026.md`;
- `docs/research/SMOKING_MYTHS_AND_EXPECTANCIES_2026.md`.

Введена product classification:

- A — evidence по cessation outcome/class intervention;
- B — evidence по acute craving/state/intermediate outcome;
- C — behavioural heuristic ALIVE.

Прямо запрещено переносить population statistics в personal medical prediction.

### Replacement Engine v2

Remote catalog после v3.1 migrations:

- 75 published replacements;
- 18 distinct mechanisms;
- evidence/mechanism/context metadata;
- HumanOS-derived short grounding/breath/attention patterns;
- расширенные food/oral/manual/drink/movement/focus/social/context-change варианты;
- ranking учитывает product, trigger map, need, personal helpfulness, craving delta, outcome и recent repetition;
- top-3 по возможности формируется из разных mechanisms.

### Guided craving UX

Новый v3.1 shell реализует:

`Продукт → Ситуация → Сила тяги → Что нужно → Замена → Результат`

- яркий progress;
- `Шаг N из 6`;
- уже достигнутые этапы кликабельны;
- изменение product/trigger/need инвалидирует dependent replacement state;
- новый русский CTA: `Хочу закурить` / `Хочу затянуться` / `Хочу покурить кальян`;
- no terminal periods in new headings;
- contextual Myth максимум один на короткий flow;
- lapse не обнуляется;
- отдельный driving safety reframe.

### Мифы

Новая global versioned entity `myths_catalog`.

Published seed: 19 myths.

Темы включают:

- успокоение;
- концентрацию;
- паузу;
- кофе;
- после еды;
- стиль/идентичность;
- social smoking;
- low-dose/light;
- hookah/vape;
- НЗТ;
- вес;
- fatalism;
- lapse reset;
- perceived control;
- stress timing;
- pleasure;
- anxiety after cessation.

Private `user_myth_state` хранит `Похоже на меня / Не про меня`, seen/frequency state и защищён RLS.

### Факты

Новая global versioned entity `facts_catalog`.

Published seed: 19 source-linked facts.

Факты являются мягким evidence layer и не требуют полного medical profile пользователя.

Optional cigarette `start_year` и derived pack-years используются только как evidence matching metadata, а не как личный прогноз.

### Вместе

Реализован privacy-safe aggregate contract.

Публичный API:

`public.get_together_summary(days)` — SECURITY INVOKER.

Privileged cross-user aggregation вынесен в неэкспонируемую `private` schema.

Contract возвращает только whitelist aggregates:

- participant/active counts;
- episodes;
- replacement attempts;
- successful responses;
- group distribution относительно собственного baseline;
- mechanism-level aggregate use/helpfulness.

Не возвращаются:

- user ids;
- имена;
- Смыслы;
- Связки;
- notes;
- individual triggers;
- medication details;
- event timestamps.

Detailed group statistics suppress below cohort threshold 3.

### Logo

Approved `brand-logo-full.png` сохранён.

v3.1 active frontend entrypoint теперь явно использует `V31App` и загружает `v31.css` после redesign CSS. Logo hardening фиксирует реальные размеры/visibility bundled asset.

Cloudflare Pages сообщил успешный branch-preview deploy.

Однако задача логотипа **не закрыта окончательно**, пока не выполнен независимый browser visual smoke-test login + authenticated shell + mobile.

## v3.1 database migrations applied

1. `v31_behavioral_content_schema`
2. `v31_replacements_seed`
3. `v31_myths_seed`
4. `v31_facts_seed`
5. `v31_together_aggregates`
6. `v31_together_security_hardening`

RLS защищает private user-owned entities. Service-role/OAuth secrets не добавлены во frontend/repo.

Supabase Security Advisor после Together hardening больше не сообщает публичный SECURITY DEFINER warning.

Остаётся ранее известный Auth warning: leaked-password protection disabled. Текущий продукт использует Google OAuth и не экспонирует password login; вернуться к этому gate до любого password auth.

## v3.1 CI / deployment

GitHub Actions для нового frontend shell:

- locked dependency install — PASS;
- TypeScript typecheck — PASS;
- Vite production build — PASS.

Cloudflare Pages branch preview deployment — SUCCESS по официальной GitHub integration.

Текущая tool environment не даёт прямой browser session к preview hostname, поэтому visual/manual runtime gates остаются открытыми честно, а не объявляются пройденными по build status.

## Still required before v3.1 merge/release

- real browser smoke-test of new guided flow;
- back-step/downstream invalidation interaction test;
- Facts/Myths interaction/source-link check;
- Together suppressed state rendering check;
- start-year edit/preservation check;
- mobile navigation/parity review;
- visual confirmation of approved logo on login/authenticated/mobile;
- second-user RLS/client isolation test when genuine second account or safe test environment exists;
- owner review of medically significant copy;
- final validation/docs handoff.

## Следующий этап после v3.1

Roadmap v3.2 теперь явно включает два связанных контура:

### Admin + Product Intelligence

- operational/product admin;
- funnels;
- replacement/Myths/Facts intelligence;
- UGC review;
- incidents/system health;
- product digests.

### Multi-client Application Layer

Цель:

`Web / Telegram / native mobile / future clients → versioned application/API contracts → domain modules → one canonical PostgreSQL model`

Business logic не должна копироваться между клиентами. Разные frontends становятся adapters над едиными use-cases и raw-event semantics.

Архитектурный redesign этого слоя выполняется отдельным этапом после v3.1 evidence gate, а не скрыто внутри текущего релиза.

## Release discipline

v3.1 остаётся draft PR до закрытия hard gates. Successful migration/build/deploy сами по себе не являются разрешением на merge или статус RELEASED.
