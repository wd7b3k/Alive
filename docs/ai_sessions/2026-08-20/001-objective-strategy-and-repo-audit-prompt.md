# Prompt — объективный стратегический аудит ALIVE (репо + стратегия + релиз)

Дата: 2026-08-20

## Запрос владельца

> Работаешь с репозиторием wd7b3k/Alive. Прочитай документы в порядке AGENTS.md.
> Мне нужно полностью объективное, не одобрительное по умолчанию ревью.
> 1. Аудит документации: сверь README/CURRENT_STATE/INFRASTRUCTURE_STATE/VALIDATION
>    с реальным git — найди конкретные расхождения, а не пожелания "добавить документов".
> 2. Оценка стратегии: что реально отличает продукт, какие риски есть именно сейчас,
>    какие улучшения без нарушения некоммерческого charter.
> 3. Ближайший релиз для реального теста: используй существующие REQUIREMENTS.md/
>    VALIDATION.md как scope, не придумывай новый. Раздели то, что блокирует
>    безопасность/приватность реальных людей, от чистой полировки.
> 4. Roadmap: подтверди/скорректируй по evidence gates.
> 5. Обоснование: продуктовое + доверие когорты/ценность репозитория как артефакта.
> Оформи как пару docs/ai_sessions/<дата>/<N>-<slug>-{prompt,response}.md.
> Не объявляй релиз выпущенным — это решает владелец по RELEASE_POLICY.md.

## Контекст

В привязанном Claude-проекте "Alive" уже существовал более ранний summary этого же
типа ревью (`claude/alive-strategy-review-2026-08-20.md`, создан в предыдущей сессии
того же дня), в котором ключевым выводом аудита было: "по факту в remote git осталась
только `main`, весь путь уже слит". Это утверждение проверено заново в данной сессии
независимым обходом `git branch -a` / `git log --graph --all` / `git merge-base` —
и оно оказалось фактически неверным (см. response, раздел 1.1). Соответственно, этот
проход не повторяет прежний вывод, а исправляет его на основании прямой проверки git.

## Метод

- Репозиторий склонирован анонимно (`git clone https://github.com/wd7b3k/Alive.git`),
  доступа на запись/push в этой сессии нет.
- Документы прочитаны в порядке, предписанном `AGENTS.md`: README → AGENTS →
  CURRENT_STATE → PROJECT_CHARTER → PRODUCT_STRATEGY → METHODOLOGY (заголовок/структура) →
  PRODUCT_PRINCIPLES (структура) → PRIVACY_AND_DATA → ARCHITECTURE/MODULES/DATA_MODEL
  (структура) → HYPOTHESES_AND_METRICS → ROADMAP → последний `ai_sessions` ответ
  (`004-oauth-and-frontend-ci-response.md`) → release unit `releases/v3.0-platform/`
  (README, REQUIREMENTS, VALIDATION) → F0 VALIDATION → код (`app/src`).
- Расхождения проверялись инструментально, а не на глаз: `git log --graph --all`,
  `git merge-base --is-ancestor`, `git rev-list --count`, `sha256sum` для brand-asset,
  `grep`/импорт-трейсинг для мёртвого кода.
