# Prompt — перенос ALIVE в отдельный GitHub repository

Дата: 2026-08-15

## Запрос владельца

> Давай мы перенесем проект Alive и все его данные и зависимости в полностью отдельную новый репо github.com/wd7b3k/alive, потом вернемся к плану по шагам.

После создания владельцем repository:

> https://github.com/wd7b3k/Alive готово, продолжай

## Требования

1. Перенести весь канонический ALIVE-контур из `wd7b3k/humanos` в отдельный `wd7b3k/Alive`.
2. Перенести product foundation, frontend v3.0, release units, Supabase migrations, ADR и AI audit trail.
3. Новый repository сделать единственным source of truth.
4. Не менять существующую Supabase DB из-за GitHub-переноса.
5. Удалить активное дублирование ALIVE в HumanOS после проверки target repository, оставив только pointer/history при необходимости.
6. После завершения вернуться к V3-GATE-01 и настройке Google OAuth.
