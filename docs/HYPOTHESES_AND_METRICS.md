# Гипотезы и метрики Habitoff

Все gates здесь provisional до получения первых реальных данных.

## H-Habitoff-001 — Core behavioural loop

**Гипотеза:** если пользователь регулярно фиксирует craving context и получает релевантную альтернативу, доля эпизодов без target nicotine action будет расти относительно собственного baseline.

Основные метрики:

- craving sessions;
- replacement completion rate;
- successful response rate;
- target usage vs baseline;
- craving delta;
- return rate after lapse.

## H-Habitoff-002 — Персонализация

**Гипотеза:** outcome-aware ranking со временем превосходит общий статический список Замены.

Метрики:

- helpfulness top-3 personalized vs catalog baseline;
- craving reduction;
- repeat-use of effective replacements;
- post-replacement nicotine use.

## H-Habitoff-003 — Связки

**Гипотеза:** явное моделирование повторяющихся Связок помогает человеку раньше замечать автоматизм и повышает вероятность alternative response.

Метрики:

- user-created Links;
- Link reuse/recognition;
- successful responses by recognized Link;
- share of `Other/unknown` contexts.

## H-Habitoff-004 — Смыслы

**Гипотеза:** персональные Смыслы полезны как отдельный intervention и как долгосрочная идентичностная опора.

Метрики:

- Meaning views/uses;
- helpfulness;
- craving delta when used;
- user-created Meanings;
- submitted UGC candidates.

## H-Habitoff-005 — UX comprehensibility

**Гипотеза:** новый пользователь способен понять продукт без устного объяснения автора.

Метрики:

- onboarding completion;
- first craving flow completion;
- help/tooltip usage;
- user-reported confusion;
- abandonment by flow step;
- incorrect data entries/deletions.

Gate: если первый pilot cohort систематически требует устного обучения, v3.0 UX считается незавершённым.

## H-Habitoff-006 — Together

Относится к v3.1.

**Гипотеза:** видимая активность небольшой группы мягко повышает вероятность возвращения выпавшего пользователя без shame/competition.

Метрики:

- reactivation after inactivity nudge;
- active days/7;
- no increase in negative self-report from comparison;
- Together views → next meaningful action.

## H-Habitoff-007 — Multi-product normalization

**Гипотеза:** raw cigarette/hookah/vape data плюс понятные Habitoff units позволяют отслеживать общую behavioural динамику при нескольких продуктах, не скрывая реальные raw values.

Метрики:

- comprehension of Habitoff units;
- correction rate;
- ability to compare baseline trend;
- zero medical-equivalence misunderstanding in qualitative feedback.

## H-Habitoff-008 — Vape-specific model

**Гипотеза:** для электронок интервальные и puff-based механики полезнее модели «один discrete smoking episode».

Метрики:

- puffs/day;
- interval expansion;
- device consumption duration;
- quick-log usage;
- targeted intervention completion.

## H-Habitoff-009 — NRT/food as optional replacements

**Гипотеза:** контекстное включение NRT и ограниченных food/drink replacements увеличивает coverage ситуаций без создания новой автоматической зависимости от еды.

Метрики:

- use/helpfulness;
- daily food replacement count;
- smoking after NRT/food intervention;
- user disable rate.

## H-Habitoff-010 — Privacy trust

**Гипотеза:** ясные privacy controls и отсутствие скрытой публикации повышают готовность фиксировать реальные данные.

Hard metric:

- privacy incidents = 0.

## Первый pilot evidence gate

После появления стабильного v3.0 и 3–5 добровольных участников провести минимум 14 дней реального использования до крупных product assumptions.

Не трактовать 14 дней как доказательство клинической эффективности. Это usability/behavioural feasibility gate.

Decision outcomes:

- `GO` — core loop используется в реальных эпизодах и есть признаки полезной персонализации;
- `ITERATE` — потребность есть, но UX/ranking/measurement мешают;
- `PIVOT` — люди не используют систему в момент тяги или ключевая модель не соответствует их поведению;
- `STOP` — продукт не даёт полезного сигнала даже после устранения очевидных UX проблем или создаёт неприемлемые privacy/safety риски.
