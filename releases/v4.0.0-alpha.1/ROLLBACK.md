# Rollback — ALIVE 4.0.0-alpha.1

## Цель

4.0.0-alpha.1 является первым пользовательским release новой product model, поэтому rollback должен отделять:

- frontend rollback;
- database forward-fix/rollback;
- content/evidence rollback;
- analytics rollback.

Нельзя откатывать raw user facts только ради возврата интерфейса.

## Frontend

Если preview/runtime regressions:

1. вернуть deployment на последний accepted commit;
2. не удалять новые raw events, уже созданные пользователями;
3. сохранить compatibility code для чтения данных, если schema уже применена;
4. зафиксировать incident/reason в release handoff.

## Database

Предпочтение — additive migrations и forward-fix.

Не выполнять destructive DOWN автоматически.

Если новая migration не прошла development gate, она не применяется к live alpha.

Если migration уже применена и проблема обнаружена позже:

- сначала оценить наличие данных в новых таблицах/колонках;
- выполнить forward-fix;
- drop допустим только если доказано отсутствие нужных данных и есть owner decision.

## Legacy compatibility

Не удалять в alpha.1:

- `user_meanings`;
- `goal_text`;
- legacy Facts/Myths state;
- raw episodes/actions/tobacco events.

Это позволяет вернуть предыдущий frontend без потери истории.

## Evidence content

Если пользовательская формулировка признана неточной:

- снять конкретный content item с публикации;
- не удалять source/claim history;
- создать исправленную content version;
- при medically significant correction записать decision/review.

## Health Minutes

Если коэффициент/модель признаны неверными:

- не переписывать raw tobacco history;
- отключить affected projection/display;
- выпустить новую versioned model;
- явно объяснить изменение методики.

Не переносить ошибочный коэффициент на другие product types.

## Analytics

Если событие имеет неверную семантику:

- остановить запись неправильного event;
- не интерпретировать исторические events как правильные;
- при возможности пометить/version event schema;
- исправить admin query;
- сохранить note о диапазоне загрязнённых данных.

Не удалять analytics массово без необходимости.

## Feature fallback

Если Intervention Engine v1 не может дать корректный персональный ranking:

- использовать curated deterministic safe fallback;
- показывать честную формулировку без fake personalization;
- фиксировать fallback event.

Если micro-awareness unavailable:

- craving flow должен продолжить работать без медицинского сообщения;
- LLM не генерирует замену отсутствующему content.

## Preview rollback

4.0 alpha должен сначала существовать как reviewable preview/draft PR.

Не менять canonical production domain до owner acceptance.

## После rollback

Обязательно обновить:

- `CURRENT_STATE.md`;
- release validation;
- AI/incident handoff;
- roadmap/decision, если проблема системная.

## Главный принцип

> **Откат пользовательского интерфейса не должен уничтожать фактическую историю поведения человека.**
