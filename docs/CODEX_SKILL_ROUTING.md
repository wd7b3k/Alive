# Маршрутизация специализированных skills для ALIVE

Цель — не заставлять универсального coding-agent каждый раз заново изобретать workflow для PostgreSQL, Cloudflare, GitHub, QA и documentation.

Codex и другие агенты должны использовать специализированные skills, когда они доступны в текущем окружении.

Skills не заменяют документацию ALIVE: они задают **как качественно выполнить тип работы**, а repo определяет **что и зачем нужно сделать в ALIVE**.

## 1. Обязательное правило

Перед значимой задачей агент отвечает себе:

> Есть ли специализированный skill для этого типа работы?

Если есть — прочитать и применить его **до изменения файлов**.

Если skill недоступен:

- не придумывать актуальные API/CLI flags по памяти;
- использовать актуальную официальную документацию;
- записать отсутствие skill/tool в validation notes, если оно влияет на качество проверки.

## 2. Supabase

### `supabase`

Использовать для любой работы, связанной с:

- Supabase Database;
- Auth;
- Edge Functions;
- Realtime;
- Storage;
- cron/queues;
- Supabase client libraries;
- RLS/infrastructure state.

### `supabase-postgres-best-practices`

Обязателен для:

- новой schema;
- индексов;
- SQL queries;
- RLS-проектирования;
- migrations;
- performance review PostgreSQL;
- security/performance advisors follow-up.

ALIVE-specific требования поверх skill:

- raw facts отдельно от projections;
- user-owned data private by default;
- delete/correction имеет recompute path;
- analytics не содержит sensitive free text;
- migrations проверяются на development DB до live alpha.

## 3. Cloudflare

### `cloudflare`

Использовать при изменениях платформенной архитектуры Cloudflare.

### `wrangler`

Использовать **перед любыми wrangler-командами или изменением Worker configuration**.

Причина: CLI/config быстро меняются; нельзя опираться на память модели.

### `workers-best-practices`

Обязателен, если появляется/изменяется Cloudflare Worker.

Проверять минимум:

- secrets;
- bindings;
- request-scoped state;
- promises;
- error handling;
- types;
- observability;
- configuration.

### `web-perf`

Использовать после появления preview user-facing release для реального performance/accessibility аудита.

Особенно для:

- home load;
- `Хочу закурить`;
- Core Web Vitals;
- layout shift;
- network dependency;
- accessibility tree;
- bundle regression.

Если Chrome DevTools MCP/аналогичный browser performance tool не подключён, не объявлять performance gate закрытым.

### Другие Cloudflare skills

`durable-objects`, `agents-sdk`, `sandbox-sdk` и другие не использовать «на будущее».

Они включаются только если roadmap действительно открывает соответствующую архитектурную потребность.

## 4. GitHub

### `github`

Использовать для ориентации в repo, PR, issues, branch state и code context.

### `gh-fix-ci`

Использовать при реальном падении GitHub Actions.

Не чинить CI по догадке из статуса PR: сначала прочитать конкретный failed check/log.

### `gh-address-comments`

Использовать при наличии review feedback в PR.

Каждый комментарий:

- понять;
- определить, действительно ли нужен change;
- реализовать минимально;
- проверить;
- ответить по существу.

### `yeet`

Использовать для controlled publish workflow:

- scope review;
- intentional commit;
- push;
- draft PR.

Нельзя автоматически переводить PR из draft в accepted/merged state без owner gate.

## 5. QA и browser work

Если Codex environment предоставляет:

- Computer Use;
- browser automation;
- Playwright skill/tool;
- visual browser QA,

user-facing release обязан использовать его.

Не ограничиваться DOM/code review.

Минимальный critical-path QA:

1. Google auth shell / authenticated state;
2. home;
3. `Хочу закурить`;
4. один полный episode;
5. outcome save;
6. metrics update;
7. delete/correction;
8. mobile viewport;
9. admin permission boundary.

Если browser QA недоступен — `НЕ ПРОВЕРЕНО`.

## 6. Design work

Если доступен skill/workflow реализации дизайна из Figma или screenshot context, использовать его только после того, как UX contract уже определён в repo.

Нельзя позволять visual-generation skill самостоятельно определять product information architecture.

Для ALIVE сначала:

- user problem;
- hierarchy;
- flow;
- states;
- analytics;

и только затем визуальная реализация.

## 7. Security review

Если Codex предоставляет skill `scan code changes for security`, `deep security scan` или аналогичный quality workflow, использовать перед крупным release, особенно если меняются:

- auth;
- RLS;
- admin access;
- referrals;
- webhooks;
- payments/donations;
- AI gateway;
- external integrations.

Результаты review не исправляются механически: сначала подтвердить applicability к ALIVE.

## 8. Documentation maintenance

Если доступен skill обновления документации по code changes, использовать его как дополнительную проверку drift.

Но итоговые изменения docs всё равно обязаны соответствовать:

- `DEVELOPMENT_RULES.md`;
- `AGENT_CONTINUITY.md`;
- `PROJECT_EVOLUTION.md`;
- текущему release unit.

Автогенерация docs не является source of truth без review.

## 9. Research

Для медицинских/поведенческих исследований использовать научные search/review capabilities, если доступны.

Приоритет:

- Consensus/academic search для peer-reviewed literature;
- официальный web для WHO/Cochrane/NICE/CDC;
- official competitor websites для product features;
- original source вместо вторичного пересказа.

Research skill не имеет права напрямую публиковать medical user copy без Evidence Registry gate.

## 10. Рекомендуемый собственный skill ALIVE

Повторяющийся release workflow должен быть вынесен в отдельный portable skill:

`alive-release-quality`

Его playbook хранится в:

`skills/alive-release-quality/SKILL.md`

Если Codex instance поддерживает project/personal Skills — установить этот skill и использовать для каждого значимого ALIVE release.

Skill не дублирует весь PRODUCT_STRATEGY. Он заставляет агента выполнять последовательность:

`orient → plan → implement slice → validate → adversarial review → document → handoff`.

## 11. Не превращать skills в перегрузку

Одновременно загружать только skills, релевантные текущей задаче.

Пример frontend-only task:

- `alive-release-quality`;
- browser/QA workflow;
- `web-perf` только на performance phase.

Не нужно загружать Supabase skill, если schema/API не меняются.

Пример migration task:

- `alive-release-quality`;
- `supabase`;
- `supabase-postgres-best-practices`.

Это уменьшает контекстный шум.

## 12. Skill selection фиксируется в implementation plan

В `IMPLEMENTATION_PLAN.md` добавить раздел:

### Skills/tools

- skill;
- зачем нужен;
- доступен ли;
- что будет использоваться как fallback.

Таким образом следующий reviewer понимает, была ли применена специализированная методика или агент работал только из общей памяти.

## 13. Принцип

> **Использовать универсальный интеллект для продуктового решения, а специализированный skill — для дисциплины выполнения конкретного типа инженерной работы.**
