# ALIVE 4.0.0-alpha.1

## Назначение

Первый пользовательский release серии 4.x.

Цель:

> **показать первый сквозной пользовательский контур новой продуктовой стратегии ALIVE**

Это не «полный 4.0» и не попытка одновременно закончить весь roadmap.

## Канонический путь

`Зачем → Хочу закурить → контекст → микроосознанность → релевантное действие → outcome → три метрики → обучение → admin analytics`

## Первый mandatory vertical slice

До расширения на остальные состояния должен полностью работать и быть проверен сценарий:

> **сигарета после еды → короткая пауза → распознанный контекст → approved Fact/Myth/Зачем → персонально ранжированное действие → outcome → Time/Money/Health Minutes → learning projection → admin event**

## Почему именно alpha

Release проверяет:

- целостность новой domain model;
- понятность нового UX;
- правильность аналитики;
- связь Evidence с пользовательским моментом;
- качество deterministic Intervention Engine;
- возможность обучаться без LLM.

## Base

Предпочтительная base:

`agent/r1-data-evidence-admin`

До пользовательской интеграции Codex обязан проверить статус R1 gates.

Новая 4.x schema не применяется к live alpha до отдельного database/security gate.

## Основные документы

- `REQUIREMENTS.md`
- `IMPLEMENTATION_PLAN.md`
- `VALIDATION.md`
- `ROLLBACK.md`
- `CODEX_PROMPT.md`

## Non-goals

- local LLM;
- Tribute;
- referral;
- full Together redesign;
- Telegram;
- wearables/sensors;
- complex ML;
- public social layer;
- subscriptions/paywall;
- hardware.

## Definition of Done

Release не называется готовым, пока критические пункты `VALIDATION.md` не имеют фактического PASS либо явно принятого owner limitation.
