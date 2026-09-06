# T-20260905-01 · [i18n] Слой строк: тексты уезжают из компонентов

    Тип: задача
    Тема: i18n
    Карточка доски: i18n-foundation
    Ветка: task/i18n-foundation
    Из разбора: R-20260905-01-i18n-english.md
    Поставлено: 05.09.2026 · чат: https://claude.ai/code/session_01Ms5KnD2VoEv5yFWaHqMN9Y

## Предпосылки — проверить первыми командами

- `bash scripts/state.sh` — ветка чистая, доска без ошибок, ноль неотправленного
- `git rev-parse --short origin/main` — работа начинается от актуального `origin/main`
- `cd app && npm test && npm run build` — зелено **до** правок; иначе чинится не эта задача
- `ls docs/tasks/R-20260905-01-i18n-english.md` — разбор на месте, решения оттуда

## Доступы

    Сверх обычного: —

## Инварианты — нарушать нельзя

- Русский интерфейс после задачи выглядит и ведёт себя ровно как до неё: это перенос
  строк, а не редактура. Любая правка формулировки — отдельная строка в `BACKLOG.md`
  (`docs/tasks/README.md`, «Найденное попутно»)
- Латиница в тексте, который видит человек, по-прежнему запрещена; служебные ключи
  остаются машинными (`docs/TONE_OF_VOICE.md` §8а)
- Ключ словаря — не текст: `flow.craving.title`, а не `Что происходит сейчас`. Иначе
  правка русской строки ломает английскую (решение R-20260905-01, §1)
- Ни одной новой рантайм-зависимости (`app/package.json` — четыре, разбор §1)
- Аналитика не меняется: коды событий и `reason_code` от языка не зависят
  (`docs/PRIVACY_AND_DATA.md`, `services/analytics.ts`)
- Тесты не ослабляются ради прохода: гард, который мешает, обсуждается, а не правится

## Что сделать

1. `app/src/i18n/`: `index.ts` (контекст локали, `t()`, подстановка `{param}`,
   `plural` через `Intl.PluralRules`), `messages/ru.ts` (единственный словарь этой задачи),
   тип `Messages = typeof ru`.
2. Перенести в словарь **все** тексты, которые видит человек: `RedesignApp.tsx`,
   `redesign/*.tsx`, `redesign/utils.ts`, `data.ts`, `services/seo.ts`,
   `services/prerender.ts`, `services/schema.ts`, `redesign/releases.ts`, `actions.ts`,
   `components/ErrorBoundary.tsx`. Админка и `modules/monitoring`, `modules/analytics` —
   не переносятся (разбор §4, «вне объёма»), но помечаются комментарием.
3. `fmt`, `money`, `when` в `redesign/utils.ts` принимают локаль; `'ru-RU'` и `₽`
   перестают быть константами. Валюта — из настроек, по умолчанию `RUB`.
4. Предрендер и `seo.ts` берут заголовки из словаря, оставаясь единственным источником
   `title`/`description` (комментарий в `prerender.ts` не должен стать неправдой).
5. Гард `app/src/i18n/no-hardcoded-strings.test.ts`: кириллица в `app/src/**` вне
   `i18n/messages/`, тестов и перечисленных исключённых модулей — падение с именем файла
   и строкой.
6. Гард `app/src/i18n/messages.test.ts`: ключи не дублируются, каждый ключ используется
   хотя бы раз (мёртвые строки — это будущий мусор перевода), параметры в строке
   совпадают с параметрами вызова.
7. ADR по решениям разбора: `bash scripts/next-adr.sh`, содержание — §1, §2, §3 разбора.
8. Документы: `docs/NAVIGATOR.md` (строка темы `i18n`), `docs/tasks/README.md` (тема
   в список), `docs/ARCHITECTURE.md` и `docs/MODULES.md` (новый слой),
   `docs/CURRENT_STATE.md`. Эпик `i18n` в `docs/board/cards.json`.

## Приёмка — команды и ожидаемый вывод

- `cd app && npm run typecheck && npm run lint && npm test && npm run build` — всё зелено
- `npx vitest run src/i18n` — оба новых гарда проходят
- `grep -rn "[А-Яа-яЁё]" app/src --include=*.tsx --include=*.ts | grep -v -e i18n/messages -e '\.test\.' -e modules/ -e redesign/admin` — пусто
- `node scripts/board.mjs check` — без расхождений
- Скриншоты `/`, `/knowledge`, `/links`, `/meanings` на 390 — совпадают с текущим продом
  по тексту и вёрстке

## Не делать

- Не переводить ничего на английский: словарь один, русский.
- Не менять формулировки, не «улучшать» тон, не трогать каталоги в базе.
- Не подключать `i18next` и подобное (разбор §1).
- Не начинать `/en/` маршруты — это задача 03.
