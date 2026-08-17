# ALIVE 4.0.0-alpha.1

## Назначение

Первый пользовательский release серии 4.x.

Цель:

> **показать первый сквозной пользовательский контур новой продуктовой стратегии ALIVE**

Это не «полный 4.0» и не попытка одновременно закончить весь roadmap.

## Обязательная точка входа для Codex

Первым prompt для Codex использовать:

`CODEX_LAUNCHER.md`

Он начинается с обязательного **Environment preflight**.

Если в Codex Environment нет локального git checkout `wd7b3k/Alive`, release не начинается и Codex должен вернуть:

`BLOCKED: LOCAL_REPOSITORY_UNAVAILABLE`

GitHub Connector не является заменой локального checkout, локального diff, build/tests, migration validation или browser QA.

Только после успешного preflight Codex читает полный `CODEX_PROMPT.md` и остальные release/repository instructions.

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

1. `CODEX_LAUNCHER.md` — обязательный первый prompt и environment fail-fast
2. `CODEX_PROMPT.md` — полная спецификация реализации
3. `REQUIREMENTS.md`
4. `IMPLEMENTATION_PLAN.md`
5. `VALIDATION.md`
6. `ROLLBACK.md`

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

Release не называется готовым, пока:

- Environment preflight имеет PASS;
- critical vertical slice реально работает end-to-end;
- критические пункты `VALIDATION.md` имеют фактический PASS либо явно принятое owner limitation;
- handoff честно различает PASS / FAIL / НЕ ПРОВЕРЕНО.
