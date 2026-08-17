# Response / Handoff — documentation, quality process и подготовка 4.0

Дата: 2026-08-17

## Выполнено

### README

Корневой `README.md` обновлён как главный индекс проекта.

Он теперь содержит:

- каноническую product thesis;
- статус эволюции 2.x → 3.x → Strategy Foundation → R1 → 4.x;
- правило repo-only source of truth;
- навигацию по ключевой документации;
- documentation hard rule;
- design/evidence principles;
- current architecture;
- критерий handoff между агентами.

### Documentation continuity

Добавлены:

- `docs/PROJECT_EVOLUTION.md` — хронология и rationale смены продуктовой модели;
- `docs/DEVELOPMENT_RULES.md` — data-first правила разработки;
- `docs/AGENT_CONTINUITY.md` — обязательный protocol восстановления/передачи контекста;
- `docs/CODEX_QUALITY_PROTOCOL.md` — новый процесс контроля качества Codex;
- `docs/CODEX_SKILL_ROUTING.md` — правила использования specialized skills;
- `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md` — канонические UX/UI требования;
- `docs/RESEARCH_MONITORING.md` — protocol регулярного research/competitor monitoring;
- `docs/research/2026-08-17-design-and-competitor-baseline.md` — dated baseline исследования;
- `docs/decisions/2026-08-17-v4-series-and-agent-quality.md` — ADR перехода к 4.x и нового quality process.

### Scoped AGENTS

Добавлены:

- `app/AGENTS.md`;
- `supabase/AGENTS.md`;
- `docs/AGENTS.md`.

Они задают локальные contracts для frontend, PostgreSQL/RLS и documentation work.

Root `AGENTS.md` обновлён и теперь требует читать scoped files, quality protocol и skill routing.

### Codex quality improvement

На основании review ранних AI sessions выявлена системная проблема:

- один prompt мог одновременно задавать frontend, schema, auth и documentation;
- значительная часть environment-dependent checks оставалась незакрытой;
- большой diff создавал ложное ощущение готовности.

Принят новый обязательный workflow:

`orient → implementation plan → vertical slice → tests → validation → adversarial self-review → independent review → documentation → factual handoff`

Добавлен portable Agent Skill:

`skills/alive-release-quality/SKILL.md`

### Specialized skills

Зафиксирована рекомендуемая маршрутизация:

- Supabase + Postgres best practices для DB/RLS;
- GitHub/gh-fix-ci/review/publish workflows для CI/PR;
- Cloudflare/Wrangler только при соответствующих runtime changes;
- web-perf после preview;
- browser/Computer Use/Playwright для user-facing QA, если доступны.

### Внешнее подтверждение подхода Codex

Проверены актуальные официальные материалы OpenAI по Codex.

Подтверждено:

- Codex использует `AGENTS.md` для repo guidance и команд проверки;
- scoped/nested instructions поддерживаются;
- Codex лучше работает при configured dev environment, надёжных tests и ясной documentation;
- Skills предназначены для закрепления повторяемых team workflows;
- multi-agent/reviewer workflow является поддерживаемым направлением.

### Design/research baseline

Зафиксированы patterns и trade-offs Smoke Free, Kwit, QuitNow, EX Program, Pivot и QuitSure.

Добавлены современные направления:

- personalized digital cessation;
- JITAI;
- platform onboarding/feedback/accessibility;
- product-specific behavior;
- progressive disclosure;
- time-to-value;
- contextual rather than feed-like education.

### Scheduled research watch

Создана scheduled task `ALIVE Research Watch`.

Режим:

- еженедельно;
- понедельник утром;
- Europe/Berlin;
- condition watch — уведомлять только при значимом новом finding.

Мониторятся исследования, guidelines, competitors, personalization/JITAI, AI, wearables/sensors и UX trends.

### Roadmap 4.x

`docs/ROADMAP.md` переработан.

Пользовательская серия:

- `4.0.0-alpha.1` — первый сквозной core loop;
- `4.0.0-alpha.2` — product-specific depth/metrics;
- `4.0.0-alpha.3` — outcome learning/reframe/recovery;
- beta stages — Путь/Вместе/referral и omnichannel;
- отдельный Product Evidence Gate;
- local LLM только после evidence gate.

### Release unit 4.0.0-alpha.1

Создано:

- `releases/v4.0.0-alpha.1/README.md`;
- `REQUIREMENTS.md`;
- `IMPLEMENTATION_PLAN.md`;
- `VALIDATION.md`;
- `ROLLBACK.md`;
- `CODEX_PROMPT.md`.

Master prompt требует сначала полностью пройти canonical cigarette vertical slice, и только потом расширять alpha scope.

### CURRENT_STATE

`docs/CURRENT_STATE.md` синхронизирован с:

- R1 status;
- новой documentation policy;
- scoped AGENTS;
- quality protocol;
- research watch;
- design baseline;
- 4.x decision;
- 4.0.0-alpha.1 preparation.

## Не выполнено намеренно

- runtime 4.0 не реализовывался;
- новая branch `agent/v4.0.0-alpha.1` не создавалась: её должен создать Codex при фактическом запуске implementation prompt;
- R1 migrations не применены к live DB;
- R1 database/security gates остаются открыты;
- portable skill создан в repo, но его installation/discovery в конкретном Codex workspace зависит от доступной Codex configuration;
- independent Codex review ещё не выполнялся, потому что implementation 4.0 ещё не началась.

## Результат

Следующий Codex получает не просто большой feature prompt, а repo-native quality system:

- hierarchical instructions;
- repeatable release skill;
- focused release unit;
- preflight plan;
- explicit invariants;
- programmatic checks;
- browser/DB gates;
- adversarial review;
- handoff requirements.

## Следующий шаг

1. Закрыть R1 validation gates либо явно начать stacked 4.0 development с незакрытыми gates.
2. Передать Codex `releases/v4.0.0-alpha.1/CODEX_PROMPT.md`.
3. Не принимать большой diff без canonical vertical slice PASS и factual validation report.
