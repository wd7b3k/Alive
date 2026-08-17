# Implementation Plan — ALIVE 4.0.0-alpha.1

Статус: **должен быть заполнен Codex до первого изменения runtime-кода**.

Codex не должен заменять этот файл общим описанием в чате.

## Я понял ALIVE так

Заполнить перед кодом:

- product thesis;
- цель release;
- North Star;
- почему этот release нужен сейчас;
- какие ключевые ограничения нельзя нарушить.

## Пользовательская проблема

Заполнить.

## Гипотеза

Заполнить.

## Scope

Заполнить конкретным перечнем.

## Non-goals

Подтвердить и при необходимости уточнить список из `REQUIREMENTS.md`.

## Mandatory vertical slice

Описать точные шаги canonical cigarette path и соответствующие data/analytics transitions.

## Product invariants

Минимум:

- quick log ≠ craving help;
- НЗТ ≠ smoking lapse;
- Health Minutes cigarette coefficient не применяется к vape/hookah;
- user/admin UI русский;
- private `Зачем` не попадает в generic analytics;
- medical user copy только из Evidence Registry;
- delete/correction пересчитывает derived data;
- один user не читает чужие private data;
- LLM не нужен для core flow.

Добавить найденные release-specific invariants.

## Затрагиваемые модули

Заполнить.

## Затрагиваемая схема/API

Заполнить до SQL/code changes.

## Existing-data compatibility

Как сохраняются/мигрируют:

- `user_meanings`;
- `goal_text`;
- existing episodes/actions;
- legacy Facts/Myths state;
- текущие baseline/product data.

## Analytics contract

Перечислить события, поля, момент фиксации и reason codes.

## Evidence/content contract

Какие existing approved claims/content используются.

Новые medical claims не создавать без evidence update.

## Testing strategy

- unit tests;
- integration tests, если применимо;
- browser QA;
- mobile;
- DB/RLS;
- performance.

## Skills/tools

Для каждого:

- skill/tool;
- зачем;
- доступен ли;
- fallback.

Минимально проверить необходимость:

- `alive-release-quality`;
- Supabase;
- Postgres best practices;
- browser/Computer Use/Playwright;
- web-perf;
- GitHub CI/review workflow.

## Checkpoints

### A — R1 readiness

### B — contracts/tests

### C — canonical cigarette slice

### D — vape/hookah semantics

### E — admin/analytics

### F — QA/self-review

Не переходить к следующему checkpoint при критическом FAIL предыдущего.

## Validation commands

Заполнить фактическими командами после inspection repo.

Минимально ожидаются из `app/`:

```bash
npm ci
npm run typecheck
npm run build
```

После добавления test script — выполнить его.

## Rollback / forward-fix

Заполнить до destructive/remote action.

## Unknown assumptions

Все неизвестные предположения перечислить до implementation.
