# Гипотезы и метрики Habitoff

> **Коды гипотез сохраняют префикс `H-ALIVE-` и после ребрендинга.** Это
> идентификаторы, к которым привязаны уже собранные измерения и ссылки в коде,
> релиз-юнитах и записях сессий. Переименование сделало бы несравнимыми данные
> до и после смены имени. См. `docs/decisions/ADR-0003-rebrand.md`, раздел
> «Граница замены».


Все gates здесь provisional до получения первых реальных данных.

## Где эти метрики считаются

`admin_hypothesis_metrics(days)` — функция в базе (миграция `20260827123000`), экран
«Гипотезы» в закрытом разделе `/health`. Только администратору, только агрегаты, ни одного
идентификатора пользователя.

До 27.08.2026 формул не существовало нигде: ни view, ни функции, ни скрипта. Решать
GO / ITERATE / PIVOT / STOP было бы не по чему.

**Часть метрик из этого документа посчитать нечем**, и витрина показывает их строкой
«нечем считать» с объяснением, а не нулём — ноль и «не проверяли» разные ответы. На
27.08.2026 это:

| Гипотеза | Метрика | Чего не хватает |
|---|---|---|
| H-ALIVE-001 | расход против исходного уровня | сохранение настроек перезаписывает строку продукта, прежний baseline исчезает без истории |
| H-ALIVE-003 | повторное узнавание Связки | в эпизоде нет ссылки на `user_links` |
| H-ALIVE-003 | доля контекстов «другое» | ~~варианта «другое» нет в интерфейсе~~ — вариант есть с 30.08.2026, данные копятся; витрина пересчитана не была, см. ниже |
| H-ALIVE-004 | просмотры и польза Смыслов | событий просмотра нет, поля «помогло» нет, ссылки из эпизода нет |
| H-ALIVE-006 | возврат после напоминания | механизма напоминаний в продукте нет |
| H-ALIVE-007 | понимание единиц | нужен разговор с участником, а не запрос |
| H-ALIVE-007 | исправления записей | редактирования эпизода не существует |
| H-ALIVE-009 | доля отключивших пищевые замены | переключателя в интерфейсе нет, история состояния не хранится |
| H-ALIVE-010 | инциденты приватности | реестра инцидентов нет; ноль означал бы «не проверяли» |

Список — сам по себе результат: он показывает, на какие вопросы пилот ответить не сможет,
**до** того, как пилот начнётся. Обоснование и что с этим делать — ADR-0006.

### Что изменилось 30.08.2026

Дыра «варианта «другое» нет в интерфейсе» закрыта: на шаге контекста появилась карточка
«Моей ситуации тут нет» с полем ввода, и `custom_trigger_text` наконец достижим
(ADR-0019, Р1). Метрика стала **собираемой**.

Считаемой она станет позже. Строка `admin_hypothesis_metrics` по-прежнему отвечает
«не считается: варианта «другое» нет в интерфейсе», и это теперь неправда — формула не
переписывалась, потому что чтение собранного строится в Р2 вместе с разделом «Голоса».
Записано здесь именно как расхождение, а не как сделанное: витрина, которая говорит
о продукте неверно, хуже витрины, которая молчит.

## H-ALIVE-001 — Core behavioural loop

**Гипотеза:** если пользователь регулярно фиксирует craving context и получает релевантную альтернативу, доля эпизодов без target nicotine action будет расти относительно собственного baseline.

Основные метрики:

- craving sessions;
- replacement completion rate;
- successful response rate;
- target usage vs baseline;
- craving delta;
- return rate after lapse.

### Как читать воронку после сокращения сценария (2026-08-26)

Сценарий тяги умеет пропускать экраны, которые система уже знает по личной истории:
выбор продукта при серии одинаковых разборов, отдельный экран потребности при устойчивом
повторении, повторный вопрос о контексте, названном карточкой на Главной. Пороги — в
`app/src/domain/flow-defaults.ts`, это эвристики, а не измеренные величины.

Состав записи эпизода при этом не зависит от длины пути: `target_product`,
`trigger_code`, `need_code`, `craving_before`, `craving_after`, `helpfulness`, `outcome`
пишутся одинаково на любом пути, и все шесть метрик выше считаются как раньше.

Что меняется — интерпретация событий воронки:

- `flow_opened` несёт `product_prefilled`, `trigger_prefilled`, `need_prefilled` в
  `metadata`. Без них короткий и полный сценарий неразличимы постфактум;
- `flow_abandoned` кладёт номер шага в `numeric_value`, и номер больше не равен числу
  пройденных человеком экранов. Сравнивать точки обрыва можно только внутри групп с
  одинаковыми флагами `*_prefilled`.

Шаг фиксации результата не пропускается ни на одном пути — это инвариант, проверяемый
`app/src/domain/flow-defaults.test.ts` и `app/src/flow-shortcuts.test.tsx`, а не
договорённость.

## H-ALIVE-002 — Персонализация

**Гипотеза:** outcome-aware ranking со временем превосходит общий статический список Замены.

Метрики:

- helpfulness top-3 personalized vs catalog baseline;
- craving reduction;
- repeat-use of effective replacements;
- post-replacement nicotine use.

## H-ALIVE-003 — Связки

**Гипотеза:** явное моделирование повторяющихся Связок помогает человеку раньше замечать автоматизм и повышает вероятность alternative response.

Метрики:

- user-created Links;
- Link reuse/recognition;
- successful responses by recognized Link;
- share of `Other/unknown` contexts.

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
- help/tooltip usage;
- user-reported confusion;
- abandonment by flow step;
- incorrect data entries/deletions.

Gate: если первый pilot cohort систематически требует устного обучения, v3.0 UX считается незавершённым.

## H-ALIVE-006 — Together

Относится к v3.1.

**Гипотеза:** видимая активность небольшой группы мягко повышает вероятность возвращения выпавшего пользователя без shame/competition.

Метрики:

- reactivation after inactivity nudge;
- active days/7;
- no increase in negative self-report from comparison;
- Together views → next meaningful action.

## H-ALIVE-007 — Multi-product normalization

**Гипотеза:** raw cigarette/hookah/vape data плюс понятные Habitoff units позволяют отслеживать общую behavioural динамику при нескольких продуктах, не скрывая реальные raw values.

Метрики:

- comprehension of Habitoff units;
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

## H-ALIVE-009 — NRT/food as optional replacements

**Гипотеза:** контекстное включение NRT и ограниченных food/drink replacements увеличивает coverage ситуаций без создания новой автоматической зависимости от еды.

Метрики:

- use/helpfulness;
- daily food replacement count;
- smoking after NRT/food intervention;
- user disable rate.

## H-ALIVE-010 — Privacy trust

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
