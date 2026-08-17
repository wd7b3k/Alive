# Ответ AI — R1 данные, доказательная база и админский контур

## Принятое направление

Следующий этап определён как R1 «Данные, доказательная база и контроль продукта».

Причина: дальнейшая перестройка UX без правильной domain/content schema создала бы ещё один слой логики, который позднее пришлось бы мигрировать. Одновременно analytics нельзя откладывать: продуктовые гипотезы должны быть наблюдаемыми с момента запуска новых механизмов.

## Реализовано в branch

### Database

Добавлены migrations для:

- категорий и собственных Триггеров;
- категорий, собственных Замен и пользовательских предпочтений;
- context-aware intervention rules;
- `Зачем` как goals/values/directions;
- Evidence Registry;
- пользовательского слоя Facts/Myths;
- content impressions;
- structured analytics events;
- system errors;
- DB-level product funnel capture;
- compatibility analytics для legacy `goal_text`/`user_meanings`;
- personal learning projections по Триггерам и Заменам.

Все новые private entities защищаются RLS. Admin analytics не требует чтения чужих private notes.

### Evidence

Создан стартовый reviewed seed, включающий материалы по:

- приблизительной оценке ≈20 минут ожидаемой жизни на сигарету;
- пользе отказа в разных возрастах;
- КПТ;
- персонализированным цифровым вмешательствам;
- рекомендациям ВОЗ;
- доказательным cessation treatments;
- кратковременной физической активности при тяге;
- психическому благополучию после отказа;
- кальяну;
- вейпу и dual use.

User copy отделена от scientific claim и source.

### Content taxonomy

Добавлен `CONTENT_AND_PERSONALIZATION_MODEL.md`.

Структура:

`общий каталог → личная сущность → персональная статистика результата`.

### Admin

Созданы:

- `/admin` route;
- `AdminDashboard.tsx`;
- `admin-data.ts`;
- отдельный русский dashboard style.

Dashboard показывает:

- active users;
- craving usage;
- episodes without target nicotine action;
- repeat usage;
- new-user cohort funnel;
- product breakdown;
- structured abandonment reasons when available;
- Facts/Myths usage;
- Evidence freshness;
- system errors;
- p95 latency when collected.

### Documentation

Созданы release docs, validation/rollback, updated CURRENT_STATE и AI audit trail.

## Не выполнено намеренно

- migrations не применены к живой БД до SQL/security validation;
- текущий end-user UI не мигрирован целиком с `Смыслы` на `Зачем`;
- current runtime Replacement Engine пока не переведён на новые context rules/projections;
- exact UI-step abandonment telemetry ещё требует отдельного instrumentation pass;
- local LLM не добавлялся.

## Следующий validation gate

1. открыть stacked draft PR;
2. получить CI typecheck/build;
3. проверить migrations на development database/branch;
4. проверить RLS и advisors;
5. owner review стартовых Facts/Myths;
6. только затем применять R1 schema к alpha.
