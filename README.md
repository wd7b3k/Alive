# ALIVE

ALIVE — некоммерческий экспериментальный продукт для человека, который хочет изменить никотиновую зависимость не только запретом, счётчиком дней или силой воли, а через наблюдение собственных автоматизмов, подбор альтернативных ответов и постепенное обучение на личных результатах.

Проект появился из **собственной потребности автора справиться с никотиновой зависимостью** и сначала создаётся как инструмент для автора и небольшой группы знакомых с той же проблемой.

ALIVE не претендует на уникальное авторство всех используемых идей. Это авторская система как **синтез, адаптация и проверка на практике** собственных наблюдений и заимствованных подходов из поведенческой психологии, методов изменения привычек, практик внимания, мотивационных подходов, социальной поддержки и доказательных инструментов прекращения употребления никотина. Конкретные источники и заимствования фиксируются по мере развития проекта.

## Source of truth

**Единственный канонический источник истины ALIVE — этот репозиторий: `wd7b3k/Alive`.**

Чаты, локальные ZIP, Supabase/Cloudflare dashboards и прежний каталог ALIVE в HumanOS не являются самостоятельными источниками истины. Значимое состояние внешней инфраструктуры должно иметь безопасное отражение в git без секретов.

Исторический контур `wd7b3k/humanos/projectsv2.0/products/alive/` использовался до выделения ALIVE в отдельный repository и после миграции считается архивным.

## Статус

- проект полностью некоммерческий;
- медицинских обещаний нет;
- продажа пользовательских данных, рекламное профилирование и скрытая монетизация не являются частью модели;
- последняя legacy production-точка — ALIVE v2.7;
- v2.8 не является production release;
- новая каноническая серия начинается с v3.0;
- пользовательские данные из v2.x мигрировать не требуется: реального периода эксплуатации ещё не было;
- **ALIVE v3.0 Platform находится в разработке**;
- Supabase/PostgreSQL schema уже развёрнута migrations из этого проекта; Google OAuth и Cloudflare ещё не завершены.

## Продуктовая формула

`ИМПУЛЬС → КОНТЕКСТ → ПОТРЕБНОСТЬ → АЛЬТЕРНАТИВНЫЙ ОТВЕТ → РЕЗУЛЬТАТ → ОБУЧЕНИЕ`

ALIVE должен постепенно увеличивать пространство между импульсом и автоматическим действием и выяснять, что помогает конкретному человеку в конкретном контексте.

## Структура репозитория

- `app/` — React + TypeScript + Vite frontend;
- `supabase/` — versioned PostgreSQL migrations и DB runbook;
- `docs/` — стратегия, методология, privacy, архитектура, решения и AI audit trail;
- `releases/` — release units, requirements, validation и rollback.

## Главные документы

1. [`AGENTS.md`](AGENTS.md) — обязательные правила AI/Codex и разработки.
2. [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — текущее состояние и следующий gate.
3. [`docs/PROJECT_CHARTER.md`](docs/PROJECT_CHARTER.md) — назначение, статус и границы проекта.
4. [`docs/PRODUCT_STRATEGY.md`](docs/PRODUCT_STRATEGY.md) — продуктовая стратегия.
5. [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) — экспериментальная методология.
6. [`docs/ORIGINS_AND_ATTRIBUTION.md`](docs/ORIGINS_AND_ATTRIBUTION.md) — происхождение системы и политика атрибуции.
7. [`docs/PRODUCT_PRINCIPLES.md`](docs/PRODUCT_PRINCIPLES.md) — обязательные UX/product-принципы.
8. [`docs/PRIVACY_AND_DATA.md`](docs/PRIVACY_AND_DATA.md) — privacy и чувствительные данные.
9. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — архитектура v3.
10. [`docs/MODULES.md`](docs/MODULES.md) — карта модулей и ownership.
11. [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — концептуальная модель данных.
12. [`docs/HYPOTHESES_AND_METRICS.md`](docs/HYPOTHESES_AND_METRICS.md) — гипотезы и метрики.
13. [`docs/ROADMAP.md`](docs/ROADMAP.md) — поэтапное развитие.
14. [`docs/RELEASE_POLICY.md`](docs/RELEASE_POLICY.md) — релизная дисциплина.
15. [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — канонические термины.
16. [`docs/INFRASTRUCTURE_STATE.md`](docs/INFRASTRUCTURE_STATE.md) — безопасное отражение внешней инфраструктуры.
17. [`docs/V3_PARITY_BASELINE.md`](docs/V3_PARITY_BASELINE.md) — blocking acceptance criterion: минимум продуктовой глубины v2.7, обязателен к прохождению перед `v3.0 RELEASED`.
18. [`docs/V3_VISUAL_UX_BASELINE.md`](docs/V3_VISUAL_UX_BASELINE.md) — blocking acceptance criterion: визуальный/UX-baseline, mobile safe zones, бренд-continuity.
19. [`docs/V3_REDESIGN.md`](docs/V3_REDESIGN.md) — активная спецификация текущего UI (глубокий редизайн интерфейса), blocking перед финальным `v3.0`.

## Домены и инфраструктура

Планируемый пользовательский адрес: `alive.hmnos.ru`.

Текущая v3-архитектура: Cloudflare Pages + Google Sign-In через Supabase Auth + Supabase PostgreSQL/RLS + Edge/DB Functions только для privileged logic.

## Ключевое правило

Репозиторий должен позволять новому разработчику или AI восстановить состояние ALIVE без доступа к предыдущим чатам.
