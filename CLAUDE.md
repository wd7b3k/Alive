# Habitoff — вход для Claude Code

Репозиторий `wd7b3k/Alive`. Продукт называется Habitoff, имя репозитория историческое.

## Правила работы — в AGENTS.md

`AGENTS.md` — канонические правила работы AI с этим проектом: source of truth,
дисциплина миграций, evidence-first, privacy-by-design, git workflow, decision gates.
**Прочитать его целиком перед любой значимой задачей.** Всё, что написано ниже, его не
заменяет и не переопределяет.

Порядок загрузки контекста задан в `AGENTS.md`, раздел «Обязательный порядок загрузки
контекста». Следовать ему.

## Как устроено состояние работ

Состояние работ живёт на доске, а не в чатах и не в голове.

- `docs/board/cards.json` — 150 карточек: `id`, `title`, `epic`, `priority`, `status`,
  `commits`, `chats`. Поле `chats` хранит чат-сессию, где карточка обсуждалась.
- `BACKLOG.md` генерируется из карточек, руками не править.
- `scripts/board.mjs` — `apply`, `md`, `build`.
- Карточку двигает коммит: трейлер `Board: done <id>` в сообщении. `Board: new` заводит
  найденное попутно. Порядок — `docs/board/README.md`, решение — ADR-0012.
- Джоб `board` в CI падает, если трейлеры написаны, а карточки о них не знают.

Прежде чем предлагать работу — посмотреть на доске, что по этому направлению уже есть.

## Направления и где они живут

Поле `epic` на доске задаёт направление. Карта: направление → документы → код.

| Направление | epic | Документы | Код |
| --- | --- | --- | --- |
| Аналитика, метрики, счётчики | `seo` | `docs/METRICS.md`, `docs/HYPOTHESES_AND_METRICS.md`, `docs/SEO_AND_ANALYTICS.md`, ADR-0015 | `app/src/services/counters.ts`, `app/src/modules/analytics/` |
| Инфраструктура, сервер, мониторинг | `infra` | `docs/INFRASTRUCTURE_STATE.md`, `docs/RUNBOOK_ALERTS.md`, ADR-0007, ADR-0013 | `infra/monitoring/`, `infra/watchdog/` |
| Процесс, доска, роадмап | `process` | `docs/ROADMAP.md`, `docs/board/README.md`, ADR-0012 | `scripts/board.mjs` |
| Дизайн, экраны, редизайн | `design` | `docs/DESIGN_SYSTEM.md`, `docs/SCREENS.md`, `docs/V3_REDESIGN.md`, `docs/V3_VISUAL_UX_BASELINE.md`, ADR-0004, ADR-0011 | `app/src/redesign/`, `app/src/redesign.css` |
| Бренд | `brand` | `docs/BRANDBOOK.md`, ADR-0003 | `app/src/assets/` |
| Тексты, копирайт | `content` | `docs/TONE_OF_VOICE.md`, ADR-0010 | контент-каталоги в `supabase/` |
| Вход, провайдеры | `auth` | `docs/AUTH_PROVIDERS.md`, ADR-0005 | `app/src/auth-providers.ts` |
| Приватность | `privacy` | `docs/PRIVACY_AND_DATA.md` | — |
| Релизы, выкладка | `release` | `docs/RELEASE_POLICY.md`, ADR-0009 | `deploy.sh` на сервере |
| Готовность к пилоту | `pilot` | `docs/PRODUCTION_READINESS.md`, ADR-0006 | — |
| Производительность | `perf` | `docs/ARCHITECTURE.md` | — |
| Сценарии | `flow` | `docs/SCREENS.md`, ADR-0008 | `app/src/domain/` |

Общий срез состояния — `docs/CURRENT_STATE.md`, он ведётся по датам.
Архитектура — `docs/ARCHITECTURE.md`, `docs/MODULES.md`, `docs/DATA_MODEL.md`.
Стратегия и рамки — `docs/PROJECT_CHARTER.md`, `docs/PRODUCT_STRATEGY.md`,
`docs/PRODUCT_PRINCIPLES.md`, `docs/METHODOLOGY.md`.

## Как владелец хочет работать

**Делать самому, а не выдавать команды.** У тебя есть PowerShell, git и ssh на этой
машине. Выполняй сам и показывай результат. Блоки команд «на вставку» — последнее
средство, а не режим по умолчанию.

**Проверять фактами до утверждения.** Не «должно работать», а проверено командой.
Если результат ещё не доступен — сказать об этом первым, а не после ответа.

**Кратко.** Без преамбул и пересказа сделанного. Русский язык.

**Команды, если они всё же нужны владельцу** — Windows PowerShell, по одной на строку,
без `&&`, без вложенных кавычек. Длинные тексты и скрипты передавать файлом:
heredoc на этом контуре уже приводил к порче файлов.

## Контур: где что живёт

- **Рабочая копия** — Windows, `C:\Users\ПК\Projects\alive\Alive` и воркtree в
  `Alive.worktrees\`. Здесь у тебя есть git-credentials для пуша.
- **Прод** — VPS, ssh-хост `alive`, каталог `/srv/alive/repo`, домен `habitoff.ru`.
  Ходить туда по ssh самостоятельно, не прося владельца.
- **Секреты** — `app/.env` на сервере, права `600`. В git никогда.

## Грабли этого контура

**`git worktree prune` не запускать.** Воркtree могут выглядеть как `prunable`, если
репозиторий читается из другого окружения. Команда снесёт регистрацию рабочих веток.

**Один воркtree — одна сессия.** 31.08 две сессии работали в
`Alive.worktrees/observability` одновременно: правки в `redesign.css` молча исчезли при
переключении ветки, три коммита легли на чужую ветку, а `push` отрапортовал успех,
запушив пустую. Своя сессия — свой воркtree, и он убирается за собой.

**Не открывать проект через Remote-SSH для работы с Claude.** Расширение тогда
исполняется на сервере в Москве, а сервисы Anthropic оттуда отдают 403. Работать
только в локальном окне.

**Профиль PowerShell не загружается** — алиасы и функции из `$PROFILE` недоступны.
Пути и модули указывать явно.

**Прямой `psql` на боевой базе — только чтение.** Любое изменение схемы или контента —
versioned migration из репозитория. Гейт выкладки сверяет число файлов миграций с
числом записей в `supabase_migrations.schema_migrations`.
