# Habitoff

Habitoff — некоммерческий экспериментальный продукт для человека, который хочет изменить
никотиновую зависимость не только запретом, счётчиком дней или силой воли, а через
наблюдение собственных автоматизмов, подбор альтернативных ответов и постепенное обучение
на личных результатах.

Проект появился из **собственной потребности автора справиться с никотиновой
зависимостью** и сначала создаётся как инструмент для автора и небольшой группы знакомых
с той же проблемой.

Habitoff не претендует на уникальное авторство всех используемых идей. Это авторская
система как **синтез, адаптация и проверка на практике** собственных наблюдений и
заимствованных подходов из поведенческой психологии, методов изменения привычек, практик
внимания, мотивационных подходов, социальной поддержки и доказательных инструментов
прекращения употребления никотина. Конкретные источники и заимствования фиксируются по
мере развития проекта.

> До 26.08.2026 продукт назывался **ALIVE**. Причина смены, что стало с логотипом и где
> `alive` осознанно оставлен — [`docs/decisions/ADR-0003-rebrand.md`](docs/decisions/ADR-0003-rebrand.md).
> Слаг репозитория остаётся `wd7b3k/Alive`: переименование репозитория ломает remotes у
> всех клонов и является отдельным инфраструктурным действием. Каталоги на сервере по той
> же причине остались `/srv/alive`.

Старое имя встречается в `docs/ai_sessions/`, `releases/`, `supabase/migrations/` и в
именах RPC — там оно остаётся намеренно: в первых двух это журнал того, что было, а в
последних двух `alive` является идентификатором, на который ссылаются живые данные.

## Source of truth

**Единственный канонический источник истины — этот репозиторий: `wd7b3k/Alive`.**

Чаты, локальные ZIP, панели провайдеров и прежний каталог в HumanOS не являются
самостоятельными источниками истины. Значимое состояние инфраструктуры должно иметь
безопасное отражение в git без секретов.

Исторический контур `wd7b3k/humanos/projectsv2.0/products/alive/` использовался до
выделения продукта в отдельный репозиторий и после миграции считается архивным.

## Статус

- проект полностью некоммерческий;
- медицинских обещаний нет;
- продажа пользовательских данных, рекламное профилирование и скрытая монетизация не
  являются частью модели;
- последняя legacy production-точка — v2.7; v2.8 не является production release;
- новая каноническая серия начинается с v3.0;
- пользовательские данные из v2.x мигрировать не требуется: реального периода
  эксплуатации ещё не было;
- **27.08.2026 продукт переехал с Cloudflare Pages и Supabase Cloud на собственный
  сервер в Москве.** Публичная часть, вход через Google и вход через Яндекс работают на
  своей инфраструктуре.

## Продуктовая формула

`ИМПУЛЬС → КОНТЕКСТ → ПОТРЕБНОСТЬ → АЛЬТЕРНАТИВНЫЙ ОТВЕТ → РЕЗУЛЬТАТ → ОБУЧЕНИЕ`

Habitoff должен постепенно увеличивать пространство между импульсом и автоматическим
действием и выяснять, что помогает конкретному человеку в конкретном контексте.

## Структура репозитория

- `app/` — React + TypeScript + Vite frontend;
- `supabase/` — versioned PostgreSQL migrations, edge-функции и DB runbook;
- `docs/` — стратегия, методология, privacy, архитектура, решения и AI audit trail;
- `releases/` — release units, requirements, validation и rollback.

## Главные документы

1. [`AGENTS.md`](AGENTS.md) — обязательные правила AI и разработки.
2. [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — текущее состояние и следующий gate.
3. [`docs/PROJECT_CHARTER.md`](docs/PROJECT_CHARTER.md) — назначение, статус и границы проекта.
4. [`docs/PRODUCT_STRATEGY.md`](docs/PRODUCT_STRATEGY.md) — продуктовая стратегия.
5. [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) — экспериментальная методология.
6. [`docs/ORIGINS_AND_ATTRIBUTION.md`](docs/ORIGINS_AND_ATTRIBUTION.md) — происхождение системы и политика атрибуции.
7. [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md) — обязательные UX/product-принципы.
8. [`docs/PRIVACY_AND_DATA.md`](docs/PRIVACY_AND_DATA.md) — privacy, чувствительные данные и где они физически лежат.
9. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — архитектура v3.
10. [`docs/INFRASTRUCTURE_STATE.md`](docs/INFRASTRUCTURE_STATE.md) — что и как развёрнуто на сервере.
11. [`docs/AUTH_PROVIDERS.md`](docs/AUTH_PROVIDERS.md) — способы входа и мост Яндекса.
12. [`docs/RELEASE_POLICY.md`](docs/RELEASE_POLICY.md) — релизная дисциплина и порядок выкладки.
13. [`docs/MODULES.md`](docs/MODULES.md) — карта модулей и ownership.
14. [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — концептуальная модель данных.
15. [`docs/HYPOTHESES_AND_METRICS.md`](docs/HYPOTHESES_AND_METRICS.md) — гипотезы и метрики.
16. [`docs/ROADMAP.md`](docs/ROADMAP.md) — поэтапное развитие.
17. [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — канонические термины.
18. [`docs/V3_PARITY_BASELINE.md`](docs/V3_PARITY_BASELINE.md) — blocking acceptance criterion: минимум продуктовой глубины v2.7.
19. [`docs/V3_VISUAL_UX_BASELINE.md`](docs/V3_VISUAL_UX_BASELINE.md) — blocking acceptance criterion: визуальный/UX-baseline, mobile safe zones, бренд-continuity.
20. [`docs/V3_REDESIGN.md`](docs/V3_REDESIGN.md) — активная спецификация текущего UI.
21. [`docs/BRANDBOOK.md`](docs/BRANDBOOK.md) — имя, знак, палитра, цвет наблюдения, голос, применение.
22. [`docs/TONE_OF_VOICE.md`](docs/TONE_OF_VOICE.md) — голос продукта: аудитория, её ценности, правила текста, словарь.
23. [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — токены, шкалы, компоненты и их состояния.
24. [`docs/SCREENS.md`](docs/SCREENS.md) — документация по каждому экрану.
25. [`docs/ROLLOUT.md`](docs/ROLLOUT.md) — как довести работу из ветки до прода и что проверить после.
26. [`docs/decisions/`](docs/decisions/) — ADR: смена имени (0003), дизайн-система (0004),
    цвет наблюдения и вход (0005), готовность к пилоту (0006), свой контур в РФ (0007),
    ярлык на домашнем экране (0008), обнаружение расхождения main и прода (0009),
    голос продукта (0010).

## Домены и инфраструктура

Пользовательский адрес: `https://habitoff.ru`.

Один сервер в Москве: Caddy отдаёт статику и проксирует `/rest/v1`, `/auth/v1`,
`/functions/v1` на self-hosted Supabase (PostgreSQL + RLS, GoTrue, PostgREST,
edge-runtime). Cloudflare не участвует ни в одном звене, включая DNS.

Подробности — в [`docs/INFRASTRUCTURE_STATE.md`](docs/INFRASTRUCTURE_STATE.md), причины —
в [`docs/decisions/ADR-0007-self-hosted-ru-contour.md`](docs/decisions/ADR-0007-self-hosted-ru-contour.md).
Порядок раскатки — [`docs/ROLLOUT.md`](docs/ROLLOUT.md).

## Ключевое правило

Репозиторий должен позволять новому разработчику или AI восстановить состояние Habitoff
без доступа к предыдущим чатам.
