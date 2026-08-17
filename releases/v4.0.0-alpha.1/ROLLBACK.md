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

- на development branch предпочтительно удалить ветку и создать чистую после исправления;
- на live сначала оценить наличие данных в новых таблицах/колонках;
- выполнить forward-fix;
- `public.alive_record_awareness_exposure(text,text,text,uuid)` и индекс `analytics_events_one_canonical_event_per_flow_idx` удалять только после остановки alpha frontend и owner decision;
- drop допустим только если доказано отсутствие нужных данных.

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

- alpha.1 fail-closed: не показывать медицинский текст и не объявлять canonical flow завершённым;
- разрешён только активный private `Зачем`, который не выдаётся за medical claim и не уходит в generic analytics;
- LLM не генерирует замену отсутствующему content.

## Preview rollback

4.0 alpha должен сначала существовать как reviewable preview/draft PR.

Не менять canonical production domain до owner acceptance.

## Ephemeral CI

Database validation не создаёт долговечного окружения: teardown выполняется `supabase stop --no-backup` с `if: always()`, затем GitHub runner уничтожается.

Legacy migrations `20260817180000` и `20260817180500` условно работают с `user_myth_state`: при наличии historical table выполняются перенос/индекс, при fresh schema безопасно пропускаются. Не заменять это созданием фиктивной legacy table.

Падение CI не требует очистки live или диска владельца. Исправление migration/test harness оформляется отдельным commit и подтверждается новым полным run.

## После rollback

Обязательно обновить:

- `CURRENT_STATE.md`;
- release validation;
- AI/incident handoff;
- roadmap/decision, если проблема системная.

## Главный принцип

> **Откат пользовательского интерфейса не должен уничтожать фактическую историю поведения человека.**
