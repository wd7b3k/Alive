# R1 — проверка перед принятием

## Статус

R1 является implementation branch поверх Strategy Foundation.

Миграции намеренно не применяются к живой alpha/production БД до прохождения отдельной проверки SQL, RLS, security advisors и owner review контента.

## Обязательные проверки

### Scope

- изменения соответствуют Product Strategy;
- нет local LLM / Tribute / referral implementation;
- существующие raw tobacco facts не переписываются;
- legacy `Смыслы`, `goal_text`, старые Facts/Myths tables не удаляются разрушительно;
- quick-use logging не считается использованием ALIVE в момент тяги.

### Database

- все R1 migrations применяются последовательно на чистой development-копии актуальной схемы;
- migration reset воспроизводит итоговую schema;
- повторный запуск security/performance advisors не выявляет новых критических проблем;
- RLS participant isolation проходит для всех новых user-owned tables;
- participant не может читать чужие `user_triggers`, `user_replacements`, `user_goals`, `user_awareness_state` или learning projections;
- participant не может читать общую `analytics_events`;
- admin может читать структурированную аналитику, но dashboard не получает чужие private text;
- неавторизованный/participant пользователь не открывает `/admin`;
- owner admin role выдаётся отдельным контролируемым bootstrap после database gate, а не автоматически;
- удаление/исправление episode приводит к корректному rebuild personal learning;
- `episode_kind` корректно отличает `craving`, `quick_use`, `conscious_use` и совместимость `unknown`;
- legacy `user_myth_state` переносится только для однозначно соответствующего нового проверенного контента;
- новые/старые критичные foreign keys имеют покрывающие индексы там, где это требуется advisor/query pattern.

### Evidence

- каждый опубликованный Факт/Миф имеет verified claim;
- каждый claim имеет минимум один первичный/авторитетный источник;
- при наличии свежего систематического обзора/руководства он имеет приоритет перед устаревшим вторичным пересказом;
- более старые исследования используются только с явной причиной, если они остаются ключевым количественным основанием;
- пользовательские формулировки полностью русские;
- пользовательская карточка содержит самостоятельное понятное объяснение, а не заголовок статьи;
- у каждого claim есть ограничения, уровень доказательности, дата проверки и дата следующей ревизии;
- «≈20 минут» нигде не описывается как персональный прогноз или буквальный линейный таймер жизни;
- кальян и вейп не переводятся в Health Minutes через ALIVE units;
- reduction/dual-use content не создаёт ложного впечатления медицинской эквивалентности продуктов;
- старый content state не превращает старую непроверенную формулировку в verified claim.

### Админский раздел

- TypeScript typecheck PASS;
- production build PASS;
- `/admin` корректно работает на desktop и mobile ширине;
- admin styles не влияют на обычный ALIVE UI;
- когортная воронка не смешивает старых активных пользователей с новыми регистрациями;
- quick nicotine log не увеличивает показатель «использовали работу с тягой»;
- отсутствие данных отображается как отсутствие данных, а не как доказательство нулевой эффективности;
- structured reason code отображается русским названием;
- технические ошибки отделены от product outcome;
- никакие private notes / личные тексты «Зачем» / свободные тексты Связок не загружаются в admin data loader;
- раннее закрытие craving flow до сохранения получает step telemetry до финального принятия R1 либо явно остаётся accepted limitation.

### Локализация

- все пользовательские и админские labels на русском;
- старые пользовательские строки `reset`, `NRT`, `meaning` и аналогичные англоязычные термины не попадают в новый UI;
- англоязычные machine identifiers не отображаются пользователю;
- original title научной публикации допускается только во внутреннем Evidence Registry; интерфейс использует русский source label;
- raw backend/OAuth error text не должен выводиться пользователю без русской обёртки.

## Уже проверено без изменения живой БД

Read-only запросами подтверждены необходимые текущие поля/функции schema и существование legacy Facts/Myths state.

Текущий живой Security Advisor показывает только ранее известное предупреждение о leaked-password protection. Парольный вход сейчас не используется.

Текущий Performance Advisor выявил два старых неиндексированных foreign keys; R1 добавляет для них индексы. После применения R1 advisor запускается повторно.

## Acceptance gate до применения migrations к alpha

1. Strategy Foundation принят либо явно разрешён stacked test;
2. frontend typecheck/build зелёные;
3. все migrations успешно применены на отдельной development database;
4. RLS isolation tests пройдены;
5. security/performance advisors проверены после migration;
6. владелец просмотрел tone и caveats стартовых Фактов/Мифов;
7. определён безопасный owner admin bootstrap.

## Acceptance gate до merge R1

- все пункты выше PASS либо явно зафиксированы как accepted limitation;
- CURRENT_STATE синхронизирован;
- rollback path проверен;
- PR остаётся draft до завершения validation;
- следующий пользовательский release не должен зависеть от R1 schema в production, пока R1 не принят.
