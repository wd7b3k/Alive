---
name: alive-release-quality
description: Выполняет значимый релиз ALIVE как проверяемый вертикальный срез: восстанавливает контекст из repo, пишет implementation plan, использует релевантные специализированные skills, реализует минимальный scope, запускает проверки, делает adversarial self-review, обновляет документацию и формирует фактический handoff. Использовать для любых значимых product/runtime/schema release ALIVE.
---

# ALIVE Release Quality

## Когда использовать

Для любого значимого изменения ALIVE, которое затрагивает пользовательский flow, domain logic, PostgreSQL schema, RLS, Evidence Registry, analytics, admin, интеграции или deployment architecture.

## 1. Восстанови контекст

До кода прочитай `README.md`, root и scoped `AGENTS.md`, `CURRENT_STATE`, `PROJECT_EVOLUTION`, Product/Technical Strategy, `DEVELOPMENT_RULES`, `CODEX_QUALITY_PROTOCOL`, `CODEX_SKILL_ROUTING`, релевантные design/data/privacy docs, roadmap и текущий release unit.

Repo — source of truth.

## 2. Запиши preflight

Создай/обнови `releases/<release>/IMPLEMENTATION_PLAN.md`:

- цель и пользовательская проблема;
- hypothesis;
- scope и non-goals;
- product invariants;
- data/API impact;
- analytics;
- privacy/evidence risks;
- skills/tools;
- tests/validation;
- rollback.

Также добавь блок `Я понял ALIVE так` с короткой product thesis и причиной текущего release.

## 3. Выбери специализированные skills

Следуй `docs/CODEX_SKILL_ROUTING.md`.

Если skill недоступен, используй актуальную официальную документацию и явно запиши fallback.

## 4. Реализуй один vertical slice

Сначала один сквозной path:

`user action → domain logic → persistence → outcome → analytics → feedback`.

Для DB:

`migration → RLS → query/write → correction/delete → rebuild`.

Не расширяй весь каталог до прохождения первого slice.

## 5. Tests вместе с логикой

Обязательны для новой нетривиальной domain logic: calculations, ranking, analytics mapping, content selection, migration transforms, delete/recompute и permissions.

## 6. Расширь согласованный scope

Только после working slice. Не делай unrelated refactor.

## 7. Проверь

Frontend минимум:

- typecheck;
- production build;
- unit tests;
- browser critical path, если tool доступен;
- mobile viewport;
- loading/empty/error;
- русский UI.

DB минимум:

- migrations на development DB;
- RLS isolation;
- security/performance advisors;
- existing-data compatibility;
- correction/delete/recompute.

Непроверенное обозначай `НЕ ПРОВЕРЕНО`.

## 8. Adversarial self-review

Прочитай свой diff как reviewer и ищи:

- нарушение стратегии;
- лишний scope;
- data loss;
- privacy/RLS leak;
- analytics contamination;
- medical hallucination;
- английский пользовательский текст;
- hardcode;
- silent fallback;
- duplicate logic;
- неполные states;
- бессмысленные tests.

Исправь найденное.

## 9. Независимый review

Если multi-agent reviewer доступен — используй отдельного агента для review PR/diff. Если нет, запиши `независимый review: НЕ ПРОВЕРЕНО`.

## 10. Документация

До handoff синхронизируй `CURRENT_STATE`, release docs, decisions, roadmap/evolution при необходимости и AI audit trail.

## 11. Handoff

Обязательно:

- Реализовано;
- Проверено `PASS / FAIL / НЕ ПРОВЕРЕНО`;
- Не сделано;
- Ограничения/риски;
- Изменённые файлы и зачем;
- Следующий минимальный slice.

## Запреты

Не объявляй deployment без проверки, не меняй medical claims без evidence gate, не делай destructive migrations без owner decision, не смешивай quick log и craving analytics, не передавай private text в generic admin analytics, не считай Health Minutes медицинским прогнозом, не делай LLM обязательным core и не оставляй английские пользовательские labels.

## Критерий

> Большой diff не является достижением. Достижение — работающий и проверенный end-to-end path, интерпретируемые данные и сохранённая логика решения в repo.
