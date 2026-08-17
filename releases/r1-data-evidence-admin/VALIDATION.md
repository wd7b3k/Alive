# R1 — Validation

## Статус

R1 является implementation branch поверх strategy foundation.

Schema migrations пока не применяются к живому alpha/production до прохождения проверки SQL и owner review.

## Обязательные проверки

### Scope

- изменения соответствуют Product Strategy;
- нет local LLM / Tribute / referral implementation;
- существующие raw tobacco facts не переписываются;
- legacy `Смыслы` и `goal_text` не удаляются до завершения UI migration.

### Database

- все migrations применяются последовательно на чистой копии актуальной схемы;
- migration reset воспроизводит итоговую schema;
- `supabase db advisors` / MCP advisors не выявляют новых критических security/performance проблем;
- RLS participant isolation проходит для всех новых user-owned tables;
- participant не может читать чужие `user_triggers`, `user_replacements`, `user_goals` или learning projections;
- participant не может читать общую `analytics_events`;
- admin может читать только структурированную аналитику и не получает через dashboard чужие private text;
- неавторизованный/participant пользователь не открывает `/admin`;
- изменение/удаление raw episode имеет понятный rebuild path для learning projections до production acceptance.

### Evidence

- каждый опубликованный Fact/Myth имеет verified claim;
- каждый claim имеет хотя бы один источник;
- все пользовательские формулировки русские;
- у каждого claim есть ограничения и дата ревизии;
- «≈20 минут» нигде не описывается как персональный прогноз или линейный биологический таймер;
- кальян и вейп не переводятся в Health Minutes через ALIVE units;
- пользовательский текст не является простой копией заголовка исследования.

### Admin dashboard

- TypeScript typecheck PASS;
- production build PASS;
- `/admin` корректно работает на desktop и mobile ширине;
- когортная воронка не смешивает старых активных пользователей с новыми регистрациями;
- отсутствие данных отображается как отсутствие данных, а не как доказательство нулевой эффективности;
- продуктовые показатели считаются по структурированным events;
- технические ошибки отделены от product outcome;
- никакие private notes / личные тексты «Зачем» / свободные тексты Связок не загружаются в admin data loader.

### Localization

- пользовательские и админские labels на русском;
- англоязычные machine identifiers не отображаются в UI;
- библиографический original title допустим только во внутреннем Evidence Registry; интерфейс использует русский source label.

## Acceptance gate

До применения migrations к alpha:

1. strategy foundation принят либо явно разрешён stacked test;
2. CI зелёный;
3. SQL migrations проверены на отдельной базе/branch;
4. security advisors проверены;
5. владелец просмотрел content tone и Evidence caveats.

До merge R1:

- все пункты выше PASS либо явно записаны как accepted limitation;
- CURRENT_STATE синхронизирован;
- rollback проверен;
- следующий runtime release не должен использовать новые сущности, пока R1 не принят.
