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

## Обязательный порядок загрузки контекста

Перед значимой задачей читать в порядке:

1. `README.md`
2. `AGENTS.md`
3. `docs/CURRENT_STATE.md`
4. `docs/PROJECT_CHARTER.md`
5. `docs/PRODUCT_STRATEGY.md`
6. `docs/TECHNICAL_STRATEGY.md` — для architecture/implementation work
7. `docs/METHODOLOGY.md`
8. `docs/PRODUCT_PRINCIPLES.md`
9. `docs/MODULES.md`
10. `docs/DATA_MODEL.md`
11. `docs/ARCHITECTURE.md`
12. `docs/PRIVACY_AND_DATA.md`
13. `docs/HYPOTHESES_AND_METRICS.md`
14. `docs/ROADMAP.md`
15. релевантный `docs/ai_sessions/**/**-response.md`
16. документацию текущего release unit
17. только затем — код.

Если старый документ противоречит `PRODUCT_STRATEGY.md`, изменение не реализовывать из старого текста автоматически: сначала синхронизировать документацию или получить owner decision.

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

Новая AI logic до влияния на пользователя предпочтительно проходит benchmark/shadow mode.

## Метрики

Ключевые user-facing derived metrics:

- Time Saved;
- Money Saved;
- Health Minutes.

Они всегда пересчитываемы из raw facts/baseline и versioned models.

North Star продукта — Sustained Freedom Rate, а не engagement.

## Релизы

Каждый значимый change:

- отдельная ветка;
- release unit;
- strategy/hypothesis traceability;
- validation;
- privacy/security review where relevant;
- rollback/forward-fix;
- prompt/response audit trail;
- draft PR до owner gate.

AI не повышает version и не объявляет release/deploy без фактического подтверждения.

## AI audit trail

Каждый реально выполненный значимый запрос сохраняется парой:

- `docs/ai_sessions/YYYY-MM-DD/NNN-...-prompt.md`
- `docs/ai_sessions/YYYY-MM-DD/NNN-...-response.md`

Ни одно значимое принятое решение не остаётся только в чате.

## Git workflow

- работа в отдельной ветке от актуальной base;
- stage/scope не смешиваются с unrelated changes;
- foundation/code changes проходят validation;
- создаётся draft PR;
- принятой считается версия после merge в `main`;
- handoff указывает branch, PR, validation и open gates.

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
