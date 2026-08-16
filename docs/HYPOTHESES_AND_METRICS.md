# Гипотезы и метрики ALIVE

Все gates provisional до получения первых реальных данных. Они проверяют usability/behavioural feasibility и продуктовые механики, а не клиническую эффективность ALIVE как лечения.

## H-ALIVE-001 — Core behavioural loop

**Гипотеза:** если пользователь регулярно фиксирует craving context и получает релевантную альтернативу, доля эпизодов без target nicotine action будет расти относительно собственного baseline.

Основные метрики:

- craving sessions;
- replacement completion rate;
- successful response rate;
- target usage vs baseline;
- craving delta;
- return rate after lapse.

## H-ALIVE-002 — Персонализация

**Гипотеза:** outcome-aware ranking со временем превосходит общий статический список Замeн.

Метрики:

- helpfulness top-3 personalized vs catalog baseline;
- craving reduction;
- repeat-use of effective replacements;
- post-replacement nicotine use;
- diversity of selected mechanisms;
- share of recommendations explained by prior personal outcome when n is sufficient.

Guardrail:

- не показывать ложную statistical certainty при малом n.

## H-ALIVE-003 — Связки

**Гипотеза:** явное моделирование повторяющихся Связок помогает человеку раньше замечать автоматизм и повышает вероятность alternative response.

Метрики:

- user-created Links;
- Link reuse/recognition;
- successful responses by recognized Link;
- share of `Other/unknown` contexts;
- repeat lapse rate in recognized context;
- use of implementation-intention form `Если X → сначала Y`.

## H-ALIVE-004 — Смыслы

**Гипотеза:** персональные Смыслы полезны как отдельный intervention и как долгосрочная идентичностная опора.

Метрики:

- Meaning views/uses;
- helpfulness;
- craving delta when used;
- user-created Meanings;
- submitted UGC candidates.

## H-ALIVE-005 — UX comprehensibility

**Гипотеза:** новый пользователь способен понять продукт без устного объяснения автора.

Метрики:

- onboarding completion;
- first craving flow completion;
- abandonment by flow step;
- back-navigation frequency;
- changed-answer frequency;
- stale/downstream-invalid state incidents;
- help/tooltip usage;
- user-reported confusion;
- incorrect data entries/deletions.

v3.1 qualitative questions:

- понятен ли CTA без объяснения;
- замечает ли пользователь progress;
- понимает ли, что можно вернуться на предыдущий шаг;
- понимает ли разницу между Мифом, Фактом и Замeной.

Gate: если pilot cohort систематически требует устного обучения, UX считается незавершённым.

## H-ALIVE-006 — Together

**Гипотеза:** видимая активность небольшой группы мягко повышает вероятность возвращения выпавшего пользователя без shame/competition.

Основные метрики:

- Together opens;
- Together repeat opens;
- Together view → next meaningful action;
- reactivation after inactivity;
- return after nicotine-use episode;
- active days/7 before/after first Together exposure;
- qualitative comparison harm.

Hard guardrails:

- privacy incidents = 0;
- raw/private user data exposed in Together = 0;
- leaderboard/ranking of people = 0;
- detailed aggregates for cohort below privacy threshold = 0.

Главный comparative metric — изменение пользователя относительно собственного baseline.

## H-ALIVE-007 — Multi-product normalization

**Гипотеза:** raw cigarette/hookah/vape data плюс понятные ALIVE units позволяют отслеживать общую behavioural динамику при нескольких продуктах, не скрывая реальные raw values.

Метрики:

- comprehension of ALIVE units;
- correction rate;
- ability to compare baseline trend;
- zero medical-equivalence misunderstanding in qualitative feedback.

## H-ALIVE-008 — Vape-specific model

**Гипотеза:** для электронок интервальные и puff-based механики полезнее модели «один discrete smoking episode».

Метрики:

- puffs/day;
- interval expansion;
- device consumption duration;
- quick-log usage;
- targeted intervention completion.

## H-ALIVE-009 — НЗТ и пищевые Замены

**Гипотеза:** контекстное включение НЗТ и ограниченных food/drink replacements увеличивает coverage ситуаций без создания новой автоматической зависимости от еды.

Метрики:

- use/helpfulness;
- daily food replacement count;
- food share among all replacements;
- smoking after NRT/food intervention;
- user disable rate;
- share of non-food alternatives when hunger is not the identified need.

## H-ALIVE-010 — Privacy trust

**Гипотеза:** ясные privacy controls и отсутствие скрытой публикации повышают готовность фиксировать реальные данные.

Hard metric:

- privacy incidents = 0.

Secondary:

- completion of sensitive fields;
- user deletion/correction usage;
- qualitative trust feedback.

## H-ALIVE-011 — Разнообразие механизмов Замены

Относится к v3.1.

**Гипотеза:** три функционально разные Замены полезнее, чем три похожих варианта одного типа.

Метрики:

- percent of top-3 sets with 3 distinct mechanisms;
- selection rate by mechanism;
- completion/helpfulness by mechanism × need × trigger;
- rejection/no-selection rate;
- exploration-to-repeat balance;
- repeated same-mechanism fatigue.

Guardrail:

- не вводить искусственное diversity, если один evidence-based option объективно должен присутствовать при сильной тяге.

## H-ALIVE-012 — Myth Engine

**Гипотеза:** контекстный разбор положительного ожидания от сигареты повышает вероятность alternative response в тех ситуациях, где это ожидание реально присутствует у пользователя.

Исследовательское основание:

- smoking outcome expectancies связаны с lapse;
- есть preliminary evidence для expectancy-challenge interventions;
- конкретная композиция ALIVE остаётся экспериментальной.

Метрики:

- myth shown/opened;
- `Похоже на меня` / `Не про меня`;
- replacement selected after contextual Myth;
- alternative-response rate in matched context;
- repeat lapse rate in matched context;
- myth seen frequency;
- user dismissal/annoyance;
- eventual expected-vs-observed benefit delta, только если эта механика будет добавлена отдельным gate.

Guardrails:

- максимум один contextual Myth в коротком craving flow;
- no shame;
- no repeated spam;
- `not_relevant` существенно снижает/отключает показы;
- не просить пользователя специально закурить для проверки убеждения.

## H-ALIVE-013 — Facts layer

**Гипотеза:** короткие чередующиеся evidence reminders помогают сохранять причины изменения привычки в поле внимания, не превращая ALIVE в scareware.

Метрики:

- fact impressions;
- details opens;
- source opens;
- benefit/risk card balance;
- dismiss/avoidance qualitative feedback;
- next meaningful action after Fact exposure.

Facts не оцениваются по тому, «испугался ли человек».

Guardrails:

- fabricated personal medical risk = 0;
- source missing for medical fact = 0;
- punitive Fact immediately after lapse = 0;
- repeated fear-only sequence = 0.

## H-ALIVE-014 — Context disruption after lapse

**Гипотеза:** изменение хотя бы одного элемента привычной цепочки после inevitable/use episode может уменьшить автоматичность повторного сценария.

Метрики:

- context-disruption prompt shown;
- user-selected new response/Link after lapse;
- repeat event rate in same trigger/context;
- return to ALIVE after lapse.

Safety guardrail:

- driving flow никогда не предлагает курение во время управления автомобилем.

## H-ALIVE-015 — Evidence-treatment escalation

**Гипотеза:** когда behavioural replacements систематически недостаточны, мягкая видимость доказательной pharmacotherapy/support снижает долю пользователей, которые делают вывод «мне ничего не помогает».

Метрики:

- evidence-treatment info opened;
- NRT usage logging where voluntarily reported;
- return/continuation after repeated high-craving episodes;
- qualitative comprehension.

Guardrail:

- dose/prescription advice generated by ALIVE = 0.

## Первый pilot evidence gate

После стабильного v3.1 и 3–5 добровольных участников провести минимум 14 дней реального использования до крупных product assumptions.

Не трактовать 14 дней как доказательство клинической эффективности. Это usability/behavioural feasibility gate.

Decision outcomes:

- `GO` — core loop используется в реальных эпизодах и есть признаки полезной персонализации;
- `ITERATE` — потребность есть, но UX/ranking/measurement мешают;
- `PIVOT` — люди не используют систему в момент тяги или ключевая модель не соответствует их поведению;
- `STOP` — продукт не даёт полезного сигнала даже после устранения очевидных UX проблем или создаёт неприемлемые privacy/safety риски.

## Следующий research gate после v3.1

До реализации v3.2 отдельно спроектировать:

- Admin / Product Intelligence;
- transport-independent application use-cases;
- versioned API contracts;
- identity mapping для Web / Telegram / native mobile;
- idempotent writes/retries;
- общий contract test suite между client adapters.

Этот следующий этап не должен менять semantic meaning v3.1 raw history.
