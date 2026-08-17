# Правила работы AI/Codex с ALIVE

Считать корень репозитория `wd7b3k/Alive` корнем самостоятельного продукта ALIVE.

## REPO = единственный source of truth

Репозиторий `wd7b3k/Alive` является единственным каноническим источником истины.

Следствия:

- решение, которого нет в git, не считается принятым состоянием проекта;
- чат, память AI, локальный файл, ZIP, Supabase Dashboard, Cloudflare Dashboard и другие внешние сервисы не являются самостоятельным source of truth;
- внешняя конфигурация, влияющая на работу продукта, имеет безопасное отражение в repo без secrets;
- schema меняется только versioned migrations;
- production deployment связан с конкретным commit/release;
- следующий AI/разработчик сначала восстанавливает состояние из repo;
- при расхождении между чатом и repo каноническим считается repo, пока owner явно не утвердит и не запишет изменение.

## Режим выполнения

Перед significant task прочитать `docs/CODEX_EXECUTION_MODES.md`.

Поддерживаются два режима:

- **Direct GitHub Mode** — основной owner-driven режим без обязательного local checkout;
- Local Repository Mode — дополнительный режим, если полноценный checkout уже доступен.

Отсутствие `.git` в временной рабочей папке не является blocker, если `wd7b3k/Alive` доступен через GitHub integration на чтение и запись.

Владелец не обязан вручную клонировать repository, использовать GitHub Desktop, настраивать CLI authentication или локальную DevOps-среду.

GitHub Connector/интеграция может использоваться как основной execution channel в Direct GitHub Mode, но изменения всегда идут через отдельную branch, commits и draft PR.

Quality gates переносятся на remote equivalents: GitHub Actions, PR diff, preview и Supabase development tooling.

## Scoped instructions

Root `AGENTS.md` задаёт общие правила.

Дополнительно действуют более локальные contracts:

- `app/AGENTS.md` — frontend, UX, localization, browser QA;
- `supabase/AGENTS.md` — PostgreSQL, migrations, RLS, data integrity;
- `docs/AGENTS.md` — documentation, evidence, history.

Перед изменением файла обязательно читать применимый scoped `AGENTS.md`.

## Обязательный порядок загрузки контекста

Перед значимой задачей читать в порядке:

1. `README.md`
2. `AGENTS.md`
3. scoped `AGENTS.md` затрагиваемых директорий
4. `docs/CURRENT_STATE.md`
5. `docs/PROJECT_EVOLUTION.md`
6. `docs/PROJECT_EVOLUTION_CORRECTIONS.md`
7. `docs/PROJECT_CHARTER.md`
8. `docs/PRODUCT_STRATEGY.md`
9. `docs/TECHNICAL_STRATEGY.md`
10. `docs/DEVELOPMENT_RULES.md`
11. `docs/CODEX_EXECUTION_MODES.md`
12. `docs/CODEX_QUALITY_PROTOCOL.md`
13. `docs/CODEX_SKILL_ROUTING.md`
14. `docs/AGENT_CONTINUITY.md`
15. `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md` — для UX/UI
16. `docs/RESEARCH_MONITORING.md` — для evidence/research/competitors
17. `docs/METHODOLOGY.md`
18. `docs/PRODUCT_PRINCIPLES.md`
19. `docs/MODULES.md`
20. `docs/DATA_MODEL.md`
21. `docs/ARCHITECTURE.md`
22. `docs/PRIVACY_AND_DATA.md`
23. `docs/HYPOTHESES_AND_METRICS.md`
24. `docs/ROADMAP.md`
25. релевантные `docs/decisions/`
26. релевантный `docs/ai_sessions/**/**-response.md`
27. документацию текущего release unit
28. только затем — код.

Если старый документ противоречит `PRODUCT_STRATEGY.md` или `CODEX_EXECUTION_MODES.md`, изменение не реализовывать из старого текста автоматически: использовать более новое явное decision или получить owner decision.

## Product thesis guardrail

ALIVE — персональная система освобождения от никотиновой зависимости.

Каноническая короткая формула:

> **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**

Нельзя сводить продукт обратно к `need → 3 replacements` или обычному quit tracker.

Ключевые active mechanisms:

- Связки;
- микроосознанность;
- Факты/Мифы;
- Зачем;
- Intervention Engine;
- treatment support;
- outcome learning;
- Recovery;
- Путь/Вместе;
- Time/Money/Health Minutes;
- product-specific cigarette/vape/hookah logic.

## Quality protocol обязателен

Для любого значимого release использовать `docs/CODEX_QUALITY_PROTOCOL.md`.

Основные требования:

- не начинать с runtime-кода;
- сначала обновить `IMPLEMENTATION_PLAN.md`;
- зафиксировать scope и non-goals;
- сначала сделать один проверяемый vertical slice;
- добавить programmatic tests для новой нетривиальной logic там, где доступен runner;
- выполнить browser QA через preview, если capability доступна;
- сделать adversarial self-review diff;
- по возможности использовать независимого reviewer-агента;
- писать `PASS / FAIL / НЕ ПРОВЕРЕНО` без приукрашивания;
- большой diff сам по себе не является результатом;
- отсутствие local checkout само по себе не является blocker.

## Skills

Специализированные skills использовать по `docs/CODEX_SKILL_ROUTING.md`.

Если установлен `alive-release-quality`, использовать его для значимых ALIVE releases.

Если skill для конкретной технологии доступен, не заменять его устаревшей памятью модели без причины.

Особенно:

- Supabase/Postgres best practices для schema/RLS;
- browser/preview/web performance для user-facing релизов;
- GitHub CI/review skills для failures/review/publish workflows;
- Cloudflare Workers/Wrangler skills только для Cloudflare runtime.

## Финансирование и донаты

ALIVE не строится вокруг paywall, рекламы или продажи sensitive data.

Планируется добровольная поддержка разработки через Tribute после отдельного owner/privacy/security gate.

До фактической интеграции запрещено:

- добавлять payment dependency в core architecture;
- делать donation entitlement к cessation functions;
- ухудшать бесплатную core experience;
- совмещать donation CTA с craving decision.

Фактическое подключение payment/donation provider требует Charter/Privacy/ADR sync.

## Самомаркетинг

Referral/self-marketing допустим только после value realization и является secondary loop.

Запрещено показывать invite CTA:

- в сильную тягу;
- после lapse;
- в crisis state;
- при medical/treatment decision.

Referral link не раскрывает sensitive private data.

## Авторство и заимствования

ALIVE — авторская композиция продуктовой логики, но не заявляет исключительного происхождения всех методов.

AI обязан:

- отделять оригинальные product hypotheses от известных психологических/медицинских методов;
- не выдавать общеизвестные техники за изобретение ALIVE;
- добавлять источники/атрибуцию при идентифицированном заимствовании;
- не копировать защищённые протоколы/тексты без проверки допустимости.

## Evidence-first

Факты, design principles, эвристики и гипотезы всегда различаются.

Каждое медицински значимое утверждение должно иметь проверяемое основание и проходить Evidence Registry/content governance.

LLM не является source of truth для medical claims.

Рабочие эвристики ALIVE должны называться эвристиками.

Примеры:

- ALIVE units — behavioural normalization, не medical harm equivalence;
- Health Minutes — population-level motivational heuristic с versioned evidence/model, не индивидуальный прогноз.

Нельзя переносить cigarette Health Minutes коэффициент на vape/hookah/ALIVE units без отдельной evidence model.

## Никаких медицинских обещаний

Запрещено обещать, что ALIVE:

- вылечит зависимость;
- гарантированно поможет бросить;
- заменяет врача/психотерапевта/доказательную фармакотерапию;
- гарантирует увеличение продолжительности жизни;
- точно прогнозирует персональные Health Minutes.

## Product-specific nicotine behavior

Нельзя реализовывать cigarette/vape/hookah как один flow с заменённым названием.

- cigarette — преимущественно discrete episode;
- vape — device interaction + puffs + interval model;
- hookah — session model с pre-session decision point.

Cross-product normalization не является medical equivalence.

## UX: nothing unexplained

Для неочевидной сущности:

- понятное русское название;
- короткое объяснение;
- `Подробнее`/tooltip;
- meaningful empty state.

Craving flow: minimum cognitive/input load.

Внутренняя decision chain не означает обязательные шаги UI.

## Privacy-by-design

- private by default;
- data minimization;
- sensitive free text не попадает в generic analytics;
- Goals/Links/notes не публикуются автоматически;
- UGC только после explicit submit;
- Together только на whitelist aggregates;
- referral не создаёт friend-data consent;
- service secrets не попадают во frontend/git/logs;
- real sensitive exports/tokens в git запрещены.

## Архитектурная дисциплина

- `TECHNICAL_STRATEGY.md` подчинён Product Strategy;
- modular monolith first;
- не строить infrastructure «на будущее» без measured gate;
- module ownership/public contracts явные;
- raw facts отдельно от rebuildable projections;
- derived models versioned;
- correction/delete запускает recompute;
- business logic channel-independent;
- core работает при отказе secondary services.

## LLM / AI

Local/open-weight LLM вводится **после product evidence gate**, не раньше.

До этого core learning строится на structured outcomes и deterministic logic.

LLM может помогать:

- semantic classification;
- summary;
- retrieval/matching approved content;
- structured extraction;
- constrained explanation/conversation.

LLM:

- не Evidence Registry;
- не metric calculator;
- не authorization engine;
- не privacy/security authority;
- не имеет direct service-role DB access;
- не назначает дозировки;
- не публикует UGC автоматически.

AI integration должна быть model-agnostic через provider abstraction и иметь deterministic fallback.

## Метрики

Ключевые user-facing derived metrics:

- Time Saved;
- Money Saved;
- Health Minutes.

Они всегда пересчитываемы из raw facts/baseline и versioned models.

North Star продукта — Sustained Freedom Rate, а не engagement.

## Релизы

Каждый значимый change:

- отдельная branch;
- release unit;
- implementation plan;
- strategy/hypothesis traceability;
- validation;
- privacy/security review where relevant;
- rollback/forward-fix;
- prompt/response audit trail;
- draft PR до owner gate.

AI не объявляет release/deploy без фактического подтверждения.

## AI audit trail

Каждый реально выполненный значимый запрос сохраняется парой:

- `docs/ai_sessions/YYYY-MM-DD/NNN-...-prompt.md`
- `docs/ai_sessions/YYYY-MM-DD/NNN-...-response.md`

Ни одно значимое принятое решение не остаётся только в чате.

## Git workflow

В Direct GitHub Mode:

- read/write через подключённый GitHub;
- отдельная branch от актуальной base;
- маленькие логические commits;
- draft PR;
- PR diff/CI/preview как remote gates;
- handoff указывает branch, PR, validation и open gates.

В Local Repository Mode допустим обычный local git workflow.

Принятой считается версия после merge в `main` или иного явно зафиксированного owner state.

## Owner decision gates

Явное согласование требуется до:

- изменения privacy model;
- destructive migration;
- смены identity provider/domain strategy;
- paywall/subscription/ads/data monetization;
- фактической donation/payment integration;
- medically significant copy/model changes;
- изменения Health Minutes/ALIVE units coefficients;
- публикации sensitive UGC без explicit consent;
- изменения утверждённой brand identity.
