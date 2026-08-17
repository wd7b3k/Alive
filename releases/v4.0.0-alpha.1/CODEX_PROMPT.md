# Master Prompt для Codex — ALIVE 4.0.0-alpha.1

Ты работаешь с private repository:

`wd7b3k/Alive`

Твоя задача — реализовать **первый пользовательский release серии ALIVE 4.x: `4.0.0-alpha.1`** как качественно проверенный вертикальный срез новой продуктовой стратегии.

Не оценивай качество по объёму diff. Цель — связный, проверяемый, интуитивный пользовательский путь и интерпретируемые данные.

---

## 1. Ветка и scope

Base branch:

`agent/r1-data-evidence-admin`

Создай отдельную ветку:

`agent/v4.0.0-alpha.1`

Не меняй `main` напрямую.

Не merge PR самостоятельно.

Работай как stacked alpha поверх R1, пока Strategy Foundation/R1 не приняты владельцем в main.

Не применяй новую/непроверенную schema к live alpha без прохождения database gate и явного разрешения, если оно требуется.

---

## 2. Сначала восстанови контекст

**До первого runtime/code изменения** прочитай в указанном порядке:

1. `README.md`
2. `AGENTS.md`
3. `app/AGENTS.md`
4. `supabase/AGENTS.md`, если затрагиваешь БД
5. `docs/AGENTS.md`
6. `docs/CURRENT_STATE.md`
7. `docs/PROJECT_EVOLUTION.md`
8. `docs/PROJECT_CHARTER.md`
9. `docs/PRODUCT_STRATEGY.md`
10. `docs/TECHNICAL_STRATEGY.md`
11. `docs/DEVELOPMENT_RULES.md`
12. `docs/CODEX_QUALITY_PROTOCOL.md`
13. `docs/CODEX_SKILL_ROUTING.md`
14. `docs/AGENT_CONTINUITY.md`
15. `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`
16. `docs/research/2026-08-17-design-and-competitor-baseline.md`
17. `docs/METHODOLOGY.md`
18. `docs/PRODUCT_PRINCIPLES.md`
19. `docs/DATA_MODEL.md`
20. `docs/ARCHITECTURE.md`
21. `docs/PRIVACY_AND_DATA.md`
22. `docs/HYPOTHESES_AND_METRICS.md`
23. `docs/ROADMAP.md`
24. `docs/decisions/2026-08-17-v4-series-and-agent-quality.md`
25. `releases/v4.0.0-alpha.1/README.md`
26. `releases/v4.0.0-alpha.1/REQUIREMENTS.md`
27. `releases/v4.0.0-alpha.1/VALIDATION.md`
28. `releases/v4.0.0-alpha.1/ROLLBACK.md`
29. R1 migrations и текущий затрагиваемый код.

Не полагайся на старые чаты как source of truth.

---

## 3. Используй skills осознанно

Если в твоём Codex environment доступны соответствующие skills, используй их.

Обязательно проверь наличие/применимость:

- `alive-release-quality` — основной release workflow;
- Supabase skill — если работаешь с Supabase;
- Supabase/Postgres best-practices — для schema, SQL, RLS и индексов;
- browser/Computer Use/Playwright workflow — для реального UX QA;
- web performance skill — после появления preview;
- GitHub workflow skills — для PR/CI/review;
- `gh-fix-ci` — только если реально упал CI;
- Cloudflare/Wrangler skills — только если меняешь Cloudflare runtime/config.

Не загружай нерелевантные skills.

В `IMPLEMENTATION_PLAN.md` запиши, какие skills доступны и какие фактически используешь.

Если специализированный skill недоступен, используй свежую официальную документацию и явно запиши fallback.

---

## 4. Не начинай с кода

Сначала полностью заполни:

`releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md`

Особенно:

- `Я понял ALIVE так`;
- пользовательская проблема;
- hypothesis;
- exact scope;
- non-goals;
- product invariants;
- затрагиваемые таблицы/API;
- analytics contract;
- existing-data compatibility;
- testing strategy;
- skill/tool routing;
- checkpoints;
- unknown assumptions.

После этого самостоятельно проверь план против Product Strategy и Requirements.

Если найдёшь противоречие — исправь документацию или явно зафиксируй blocker до кода.

Не проси владельца повторять информацию, которая уже есть в repo.

---

# 5. Главная цель release

Построить первый **сквозной** пользовательский контур:

> **Зачем → Хочу закурить → контекст → микроосознанность → релевантное действие → outcome → три метрики → обучение**

И сделать этот путь наблюдаемым в admin analytics.

ALIVE не должен выглядеть как сложная терапевтическая схема.

Внутренняя логика сложная; пользовательский flow — короткий.

---

# 6. Mandatory vertical slice — сначала только он

До расширения scope полностью реализуй и проверь один canonical path:

## Сценарий

Пользователь курит сигареты.

Возникает тяга после еды.

Путь:

1. Home.
2. Primary CTA **«Хочу закурить»**.
3. ALIVE понимает/уточняет продукт.
4. Контекст `После еды`.
5. Короткая пауза/наблюдение.
6. Один релевантный approved Fact/Myth/личное Зачем.
7. Один наиболее вероятно подходящий response + возможность увидеть альтернативы.
8. Короткое `Почему это`.
9. Пользователь выполняет действие.
10. Минимальный outcome.
11. Сохраняются raw facts.
12. Обновляется personal learning projection.
13. Пересчитываются три пользовательские метрики.
14. Пользователь получает meaningful feedback.
15. Admin analytics видит правильный funnel/outcome.

**Не расширяй весь 4.0 scope, пока этот путь не работает end-to-end.**

После canonical slice проведи checkpoint review и только затем продолжай.

---

# 7. Home 4.0

Home должен за несколько секунд отвечать на четыре вопроса:

1. Что делать, если прямо сейчас хочется курить?
2. Где я сейчас в процессе?
3. Что сегодня особенно важно?
4. Что ALIVE уже понял обо мне?

Главная CTA:

# **Хочу закурить**

Не использовать `Меня тянет`.

Не создавать несколько равнозначных primary CTA.

## Постоянно видны три метрики

- **Вернул время**
- **Сохранил деньги**
- **≈ Сохранил здоровую жизнь**

Они должны быть визуально легко считываемыми, но не превращать home в бухгалтерский dashboard.

---

# 8. Метрики

Сначала исследуй текущие raw events, baseline и существующие metric helpers/schema.

Не создавай вторую параллельную модель, если текущую можно корректно эволюционировать.

## Время

Основание — personal baseline и реальное время ритуала, где доступно.

## Деньги

Основание — personal product cost/baseline.

## Здоровая жизнь

Для сигарет используй только каноническую approved Health Minutes heuristic/model.

Обязательно:

- `≈`;
- объяснение методики;
- population-level caveat;
- versioned model;
- никакого заявления, что конкретная сигарета гарантированно «отнимает ровно N минут».

### Критический invariant

**Не пересчитывай vape/hookah в Health Minutes через cigarette coefficient или ALIVE units.**

Если для них нет approved model, честно показывай partial coverage.

---

# 9. `Смыслы` → `Зачем`

На пользовательских поверхностях новой версии использовать каноническое название:

# **Зачем**

Зачем включает:

- цель;
- ценность;
- направление;
- личную формулировку.

Используй новую R1 domain model (`goals_catalog` / `user_goals` или фактические имена после inspection migrations).

Не удаляй legacy `user_meanings`/`goal_text` до доказанной migration compatibility.

Пользователь должен уметь:

- создать;
- отредактировать;
- включить/скрыть;
- увидеть своё Зачем в релевантный момент тяги.

Private text не попадает в generic analytics/admin dashboard.

---

# 10. Craving UX

Это high-load состояние.

Требования:

- первый useful response максимально быстро;
- минимум обязательных вопросов;
- одна мысль на экран/момент;
- не заставляй пользователя проходить всю внутреннюю decision chain как wizard;
- известную Связку используй без повторного длинного опроса;
- дополнительные детали можно собрать после action/outcome;
- `Подробнее` не блокирует действие;
- network/secondary content не должны лишать пользователя safe fallback.

Не используй referral/donation/marketing в этом flow.

---

# 11. Микроосознанность

Используй **только approved content из Evidence Registry**.

Один момент может содержать один основной элемент:

- Факт;
- Миф;
- личное Зачем;
- персональный observation из фактических outcomes.

Не показывай все три подряд как обязательные шаги.

Selector должен учитывать доступные R1 поля:

- product;
- context/trigger;
- recent impressions;
- fatigue;
- relevance/usefulness;
- personal state where безопасно.

Не генерируй medical text через LLM.

Если релевантного approved content нет — flow работает без него.

---

# 12. Intervention Engine v1

Это deterministic engine без LLM dependency.

Перед реализацией изучи R1:

- replacement catalogs;
- user replacements;
- preferences;
- context rules;
- personal learning projections;
- prepared Link responses.

Не придумывай новые параллельные таблицы, если R1 уже решает задачу.

## Ranking factors

Минимально учитывать:

- product type;
- trigger/context;
- eligibility;
- craving strength where available;
- prepared response;
- personal enable/disable/preferences;
- personal outcome only при достаточных данных;
- curated fallback.

## Explainability

Показывай короткое `Почему это`, соответствующее реальной ranking logic.

Примеры:

> После еды тебе чаще помогала короткая прогулка.

или:

> Для такой ситуации у тебя ещё нет истории — начнём с короткого варианта.

Не писать «подобрано специально для тебя», если персональных данных для этого нет.

---

# 13. Product-specific flows

## Сигарета

Полный canonical slice.

Discrete episode.

## Вейп

**Не копируй cigarette flow.**

Минимальная alpha semantics:

- потянулся к устройству / собираюсь сделать затяжки;
- контекст;
- возможность отложить;
- nicotine-free interval;
- puffs/group where relevant;
- фоновый автоматизм;
- отдельные тексты.

Не заявляй медицинскую эквивалентность сигарете.

## Кальян

**Не копируй cigarette flow.**

Минимальная alpha semantics:

- приглашение/план/заказ/подготовка как возможный decision point;
- социальный контекст;
- session;
- duration/cost where available;
- отдельные texts/actions.

Не спрашивай каждую затяжку.

Не заявляй медицинскую эквивалентность сигарете.

---

# 14. Outcome и conscious use

Минимальный outcome после intervention:

- помогло;
- частично;
- нет;
- никотин был / не был;
- craving after — только если UX не становится тяжёлым.

Если включаешь conscious-use flow в alpha.1, он должен быть минимальным:

Перед:

> Что ты сейчас ожидаешь получить?

После:

> Получил?

`Да / Частично / Нет`

Не называй conscious smoking доказанной cessation therapy. Это product hypothesis ALIVE.

---

# 15. Feedback после решения

Не ограничивайся toast `Сохранено`.

Покажи один понятный смысл результата, например:

- конкретная метрика выросла;
- ALIVE получил новый outcome для этой Связки;
- response впервые/снова сработал;
- новая информация изменит следующий recommendation.

Не перегружай feedback тремя экранами наград.

---

# 16. Analytics — обязательная часть реализации

До UI implementation зафиксируй event contract в `IMPLEMENTATION_PLAN.md`.

Минимально нужны различимые события:

- craving flow opened;
- product chosen/recognized;
- context chosen/recognized;
- first useful response shown;
- awareness shown;
- awareness feedback;
- intervention shown;
- intervention selected;
- intervention completed;
- outcome saved;
- flow abandoned;
- abandonment step;
- structured reason;
- quick use separately;
- conscious use separately, если включён.

### Запрет

Не отправляй sensitive free text в `analytics_events`.

### Admin

Обнови admin dashboard так, чтобы он показывал:

- новую воронку;
- largest drop-offs;
- русские причины;
- product breakdown;
- intervention usage/outcomes;
- awareness usage/usefulness;
- repeat craving use;
- technical errors.

Не показывай vanity metric без контекста.

---

# 17. Testing — не откладывай

Текущий frontend не имеет полноценного unit test layer.

Добавь **минимальный** подходящий test harness, если его ещё нет.

Предпочтительно Vitest или эквивалент, естественный для текущего Vite/TypeScript стека.

Не добавляй тяжёлую библиотеку без необходимости.

Обязательные tests для новой pure logic:

- Time calculation;
- Money calculation;
- Health Minutes coverage/caveat/model selection;
- intervention ranking;
- deterministic fallback;
- awareness selection/fatigue;
- analytics event mapping;
- cigarette/vape/hookah product semantics;
- correction/delete/recompute helpers, если меняются.

Тесты должны проверять поведение, а не просто существование функции.

---

# 18. Database / RLS

Если требуется новая migration:

1. сначала проверь, нельзя ли решить через R1 schema;
2. используй Supabase/Postgres best-practices skill;
3. migration additive where possible;
4. existing data compatibility;
5. RLS private by default;
6. no hardcoded user IDs;
7. no admin auto-promotion;
8. correction/delete/recompute;
9. security/performance advisors после применения на development DB.

### Live DB

Не применяй непроверенную migration к live alpha.

Если development Supabase branch/local DB недоступны, пометь DB gate `НЕ ПРОВЕРЕНО`; не притворяйся, что SQL проверен.

Продолжай только ту часть работы, которую можно безопасно сделать без ложного PASS.

---

# 19. Дизайн

Не создавай новую визуальную концепцию с нуля.

Следуй:

`docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`

Целевой стиль:

- calm premium;
- adult;
- dark-first;
- понятная hierarchy;
- один сильный primary action;
- минимум competing cards;
- много воздуха;
- понятные icons;
- mobile-first usability;
- не полагаться только на цвет;
- минимум декоративной animation.

Используй привычные platform patterns.

Не копируй competitors визуально.

---

# 20. Русская локализация

Сделай localization sweep всех затронутых surfaces.

Пользователь не должен видеть технические labels:

- NRT;
- reset;
- replacement;
- outcome;
- meaning;
- streak;
- trigger code;
- raw product identifiers.

`Никотин-заместительная терапия` при первом user-facing упоминании писать по-русски полностью либо использовать понятную короткую русскую форму после объяснения.

Не используй англоязычный product jargon ради «технологичности».

---

# 21. Что нельзя делать в alpha.1

Не добавляй:

- local LLM;
- external AI API как core;
- Tribute;
- donation CTA;
- referral/share growth loop;
- Telegram;
- Together redesign;
- wearables;
- sensor JITAI;
- CO device;
- complex ML/contextual bandit;
- subscription/paywall;
- public profiles;
- leaderboard;
- major infrastructure rewrite.

Не меняй logo/brand identity без отдельного owner decision.

---

# 22. Checkpoints

Работай последовательно.

## Checkpoint A — R1 readiness и plan

- прочитан context;
- заполнен Implementation Plan;
- R1 assumptions проверены;
- skills выбраны;
- tests/analytics contracts определены.

## Checkpoint B — contracts и test harness

- types/interfaces;
- pure domain helpers;
- metric model;
- ranking contract;
- analytics contract;
- unit tests.

## Checkpoint C — canonical cigarette vertical slice

Полный end-to-end flow.

**До PASS не расширяй product scope.**

## Checkpoint D — vape/hookah semantics

Добавь distinct flows на том же architecture backbone.

## Checkpoint E — admin/analytics/localization

Воронка, причины, русский UI.

## Checkpoint F — QA

Build/tests/browser/performance/RLS/self-review.

---

# 23. Обязательные programmatic checks

Из `app/`:

```bash
npm ci
npm run typecheck
npm run build
```

После добавления test script:

```bash
npm test
```

или фактическая команда, записанная в `package.json`.

Не изменяй validation result по предположению.

---

# 24. Browser QA

Если доступен browser/Computer Use/Playwright:

Пройди сам:

1. desktop canonical cigarette slice;
2. mobile canonical cigarette slice;
3. vape path;
4. hookah path;
5. loading/empty/error;
6. quick log;
7. delete/correction;
8. admin permission boundary.

Исправь найденные UX bugs и повтори проверку.

Если browser tool недоступен, честно пометь `browser QA: НЕ ПРОВЕРЕНО`.

---

# 25. Performance/accessibility

После появления preview, если доступен `web-perf`/Chrome DevTools workflow:

- измерь Core Web Vitals;
- проверь network chain;
- проверь layout shift;
- проверь, что primary craving CTA доступна сразу;
- accessibility snapshot;
- устраняй только реально измеренные проблемы.

Не оптимизируй «по ощущениям».

---

# 26. Adversarial self-review

Перед handoff переключись из author mode в reviewer mode.

Пройди весь diff и специально ищи:

- нарушение Product Strategy;
- лишний scope;
- fake personalization;
- quick log/craving analytics contamination;
- data loss;
- RLS/privacy leak;
- медицинский claim без Evidence;
- Health Minutes leakage;
- англоязычные UI-хвосты;
- hardcode;
- silent fallback;
- duplicated business logic;
- сломанные empty/error states;
- бессмысленные tests;
- CSS leakage;
- mobile regressions.

Исправь всё подтверждённое до PR handoff.

---

# 27. Independent reviewer

Если Codex environment поддерживает multi-agent/reviewer workflow:

после implementation запусти **отдельного reviewer-agent** на final diff/PR.

Дай ему задачу проверять:

- product invariants;
- architecture;
- data/RLS;
- medical evidence boundary;
- analytics semantics;
- UX/localization;
- tests.

Author-agent должен исправить подтверждённые замечания.

Если independent reviewer недоступен — `НЕ ПРОВЕРЕНО`.

---

# 28. Git/PR

После фактических проверок:

- проверь scope diff;
- не включай unrelated changes;
- commit намеренно;
- push branch;
- открой **draft PR**;
- не merge;
- не называй accepted release до owner gate.

Если GitHub Actions падает — используй CI-specific workflow/skill и реальные logs, а не догадки.

---

# 29. Документация — часть Definition of Done

До handoff обязательно:

- обнови `releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md` фактическим планом;
- обнови `VALIDATION.md` конкретными `PASS / FAIL / НЕ ПРОВЕРЕНО`;
- при необходимости обнови `ROLLBACK.md`;
- обнови `docs/CURRENT_STATE.md`;
- обнови `docs/PROJECT_EVOLUTION.md`, только если произошло новое стратегическое изменение;
- добавь ADR при новом важном решении;
- запиши prompt/response AI audit trail;
- объясни changed files.

Никакое значимое решение не оставляй только в сообщении Codex.

---

# 30. Формат финального handoff Codex

## Реализовано

Фактический scope, без маркетинговых формулировок.

## Что пользователь теперь может сделать

Короткие реальные flows.

## Проверено

Отдельно:

- typecheck;
- build;
- unit tests;
- DB migrations;
- RLS;
- security advisor;
- performance advisor;
- browser desktop;
- browser mobile;
- performance;
- accessibility;
- analytics;
- Evidence copy;
- independent review.

Каждый только:

`PASS / FAIL / НЕ ПРОВЕРЕНО`.

## Не сделано

Все оставшиеся non-goals/open gates.

## Известные ограничения

Конкретные.

## Changed files

Группами и зачем.

## Branch / PR / commit

Фактические значения.

## Следующий минимальный шаг

Не предлагай сразу следующую большую платформу.

---

# 31. Главный критерий

> **Я хочу получить не самый большой 4.0, а первый 4.0, которому можно доверять.**

Если приходится выбирать между количеством функций и проверенной целостностью canonical flow — выбирай целостность и качество.
