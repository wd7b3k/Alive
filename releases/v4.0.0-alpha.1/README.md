# ALIVE 4.0.0-alpha.1

## Назначение

Первый пользовательский release серии 4.x.

Цель:

> **показать первый сквозной пользовательский контур новой продуктовой стратегии ALIVE**

Это не «полный 4.0» и не попытка одновременно закончить весь roadmap.

## Обязательная точка входа для Codex

Первым prompt использовать:

`CODEX_LAUNCHER.md`

Он сначала определяет доступный execution mode по `docs/CODEX_EXECUTION_MODES.md`.

### Основной owner workflow

**Direct GitHub Mode** — нормальный режим работы ALIVE.

Если локального checkout нет, но `wd7b3k/Alive` доступен через GitHub integration на чтение и запись, release продолжается непосредственно через отдельную branch, commits и draft PR.

Владелец проекта не обязан вручную:

- клонировать repository;
- пользоваться GitHub Desktop;
- настраивать CLI authentication;
- запускать local Node/Supabase;
- создавать отдельную локальную dev-среду.

GitHub Actions, preview и Supabase tooling используются как remote quality gates, когда доступны.

Local Repository Mode остаётся дополнительной возможностью, если полноценный checkout уже существует.

Отсутствие `.git` в временной папке само по себе blocker не является.

## Канонический путь

`Зачем → Хочу закурить → контекст → микроосознанность → релевантное действие → outcome → три метрики → обучение → admin analytics`

## Первый mandatory vertical slice

До расширения на остальные состояния должен полностью работать сценарий:

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

1. `CODEX_LAUNCHER.md` — первый prompt и выбор execution mode
2. `CODEX_PROMPT.md` — полная спецификация реализации
3. `REQUIREMENTS.md`
4. `IMPLEMENTATION_PLAN.md`
5. `VALIDATION.md`
6. `ROLLBACK.md`
7. `../../docs/CODEX_EXECUTION_MODES.md` — допустимые способы работы

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

## Текущий статус реализации

Canonical cigarette slice остаётся реализованным в draft PR #8.

На hotfix head `e5632aad7a6dcf39fee48146c169a6c9aa1f081b` исправлен бренд-asset: повреждённый растровый логотип заменён на deterministic SVG с утверждённым классическим Ом. Тот же asset используется и в login hero, и в верхнем brand mark; остальной UI намеренно не менялся.

Свежий frontend gate PASS: GitHub Actions `ALIVE frontend CI` run #315 (`Typecheck and build`) завершён `success` на том же hotfix head.

Database/security evidence для alpha остаётся валидным из предыдущих strict прогонов; для hotfix head автоматически запущен повторный `ALIVE database CI` run #55, который на 2026-08-17 ещё находится `in_progress`.

Public preview уже reviewable по визуальной части: [agent-v4-0-0-alpha-1.alive-aw2.pages.dev](https://agent-v4-0-0-alpha-1.alive-aw2.pages.dev/) на 2026-08-17 отображает исправленный классический Ом без изменения остальной композиции экрана входа.

Release всё ещё не является acceptance-ready alpha:

- authenticated browser E2E и `/admin` не выполнены;
- hosted Supabase Advisors и preview performance не подтверждены;
- independent static runtime/SQL review PASS; отдельный DB/CI review зафиксирован в validation;
- vape/hookah expansion не начат до PASS canonical browser E2E.

## Definition of Done

Release не называется полностью проверенным, пока:

- определён execution mode и подтверждён доступ к правильной base/target branch;
- critical vertical slice связан end-to-end;
- критические пункты `VALIDATION.md` имеют фактический PASS либо явно принятое owner limitation;
- handoff честно различает PASS / FAIL / НЕ ПРОВЕРЕНО.

Недоступность локального checkout не является причиной останавливать безопасную работу в Direct GitHub Mode.
