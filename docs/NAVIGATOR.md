# Навигатор по документации

Чтение любой задачи начинается отсюда. Смысл файла — не читать весь `docs/` (101 файл),
а взять два-три документа по теме и вывод команды о фактическом состоянии.

Обновляется той же задачей, которая меняет документацию: новый документ, смена назначения
или обнаруженное расхождение — строка здесь, в том же коммите.

## Общие вводные

Habitoff (репозиторий `wd7b3k/Alive`, имя историческое) — приложение для отказа от курения:
человек фиксирует тягу, проходит короткий сценарий замены и видит собственную статистику.
Русскоязычный контур работает на своём VPS в Москве: Ubuntu, self-hosted Supabase, Caddy,
домен `habitoff.ru`. Фронтенд — Vite/React, PWA, сборка подписана коммитом и отдаётся
на `/version.json`. Продукт на стадии подготовки пилота: сначала ядро участников в прямом
контакте, затем поток самостоятельных.

Три правила, из которых следует почти всё остальное (полностью — `AGENTS.md`):

- репозиторий — единственный источник истины; решение, которого нет в git, не принято;
- схема и содержимое базы меняются только миграциями; прод — не место ручных правок;
- работа ведётся ветками, сессия заканчивается пушем, карточку доски двигает коммит.

## Что читать по теме

Тема — та же, что `epic` карточки и тег постановки в `docs/tasks/`.

| Тема | Читать | Состояние берётся из |
|---|---|---|
| `infra` | `INFRASTRUCTURE_STATE.md`, `ROLLOUT.md`, `RELEASE_POLICY.md`, `infra/*/README.md` | `scripts/state.sh`, `check-deploy-drift.mjs`, сервер |
| `process` | `AGENTS.md`, `docs/tasks/README.md`, `docs/board/README.md` | `scripts/tasks.mjs`, `board.mjs check` |
| `release` | `RELEASE_POLICY.md`, `CURRENT_STATE.md`, `ROADMAP.md` | `releases/`, `/version.json` |
| `pilot` | `PRODUCTION_READINESS.md`, `ROLLOUT.md`, `HYPOTHESES_AND_METRICS.md` | доска, срез `BACKLOG.md` |
| `design` | `DESIGN_SYSTEM.md`, `SCREENS.md`, `V3_VISUAL_UX_BASELINE.md` | `app/src/redesign/`, тесты инвариантов CSS |
| `brand` | `BRANDBOOK.md`, `TONE_OF_VOICE.md` | `app/src/assets/` |
| `content` | `TONE_OF_VOICE.md`, `METHODOLOGY.md`, `GLOSSARY.md` | миграции каталогов |
| `flow` | `PRODUCT_PRINCIPLES.md` (P1–P20), `SCREENS.md`, `V3_PARITY_BASELINE.md` | `app/src/redesign/`, тесты |
| `auth` | `AUTH_PROVIDERS.md`, `PRIVACY_AND_DATA.md` | сервер, живая проверка входа |
| `privacy` | `PRIVACY_AND_DATA.md`, `PROJECT_CHARTER.md` | RLS-тесты `supabase/tests/local/` |
| `seo` | `SEO_AND_ANALYTICS.md`, `SEO_VISIBILITY_AUDIT.md`, `tasks/R-20260905-01-seo-…`, ADR-0017 | живые запросы к `habitoff.ru` |
| `perf` | `ARCHITECTURE.md`, `MODULES.md` | замеры сборки и рендера |
| `money` | `PROJECT_CHARTER.md` §2, `docs/tasks/R-…-money-….md` | — (решение подвешено) |
| `legal` | `PRIVACY_AND_DATA.md`, `PROJECT_CHARTER.md` | — (внедрение не начато) |
| `knowledge` | `METHODOLOGY.md`, `SOURCE_REGISTER.md`, `ORIGINS_AND_ATTRIBUTION.md`, `EDITORIAL_PROTOCOL_MED.md`, ADR-0017, ADR-0018 | карточки — из каталога базы; статьи — `content/knowledge/<кластер>/*.md`, сборка `app/src/services/knowledge-articles.ts` и `knowledge-article-pages.ts` |
| `social` | `PRODUCT_STRATEGY.md`, `TONE_OF_VOICE.md` | — |

Сквозные, читаются при любой значимой задаче: `AGENTS.md`, `docs/CURRENT_STATE.md`
и действующие `docs/decisions/ADR-*.md` по теме.

## Где что лежит

| Что | Где | Не путать с |
|---|---|---|
| Правила работы AI | `AGENTS.md` | чатом |
| Состояние работ | `docs/board/cards.json`, срез `BACKLOG.md` | памятью |
| Постановки | `docs/tasks/` — разборы `R-…`, задачи `T-…` | `docs/ai_sessions/` (это запись сессии) |
| Принятые решения | `docs/decisions/ADR-*.md` | документами, которые их описывают |
| Состояние продукта | `docs/CURRENT_STATE.md` | `INFRASTRUCTURE_STATE.md` (это про сервер) |
| Состояние репозитория и прода | `scripts/state.sh` | документами |
| Инфраструктура как код | `infra/` | сервером |

## Не источник истины

Чаты, память AI, `docs/ai_sessions/**` (запись прошлого, а не текущее состояние),
любой документ без даты последней проверки, скриншот, ZIP на машине владельца.

## Известные расхождения

Ведётся здесь, чтобы следующая сессия не спорила с документом, о котором уже известно,
что он неверен. Закрывается задачей, а не молчанием.

- **31.08.2026 · `CURRENT_STATE.md` отрицает наблюдаемость, которая работает.** Раздел
  «Что осталось до полноценного прода», пункт 2: «наблюдаемости нет — первым мониторингом
  является владелец с телефоном». То же в `ROLLOUT.md` §5, пункты 3 и 4: «конфигурация
  сервера существует только на сервере» и наблюдаемость в списке несделанного. Мониторинг
  работает с 28.08.2026 (ADR-0013), из админки виден с 30.08 (ADR-0016), `infra/` в
  репозитории с 30.08. Найдено попутно задачей по бэкапам, чинить отдельно — карточка
  `current-state-otricaet-rabotayuschuyu`.
- **31.08.2026 · `PROJECT_CHARTER.md` §2 против решений о деньгах.** Устав объявляет проект
  полностью некоммерческим и исключает подписочную выручку; 30.08 обсуждены донаты и
  подписка. ADR нет, решение подвешено — `docs/tasks/R-20260830-01-money-monetization.md`.

## Как поддерживать

- задача, которая меняет назначение документа или заводит новый, правит строку таблицы
  в том же коммите;
- обнаруженное расхождение попадает в раздел выше с датой и ссылкой на задачу;
- раздел «Общие вводные» переписывается только при смене контура, стека или стадии —
  он должен оставаться коротким.
