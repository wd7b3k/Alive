# Постоянный мониторинг исследований и рынка ALIVE

Этот документ определяет, как ALIVE отслеживает новые исследования, продуктовые подходы, дизайн-паттерны и конкурентные изменения.

Цель — не собирать новости, а своевременно замечать данные, которые могут изменить продуктовую стратегию, медицинский контент, персонализацию или пользовательский опыт.

## 1. Регулярный мониторинг

Создана регулярная задача **ALIVE Research Watch**.

Базовая частота:

- еженедельно;
- понедельник утром;
- уведомление только при наличии значимых новых данных или продуктовых изменений.

Автоматизация является механизмом обнаружения, но не source of truth проекта.

После принятия значимого вывода он должен быть записан в git.

## 2. Что отслеживать

### Доказательные методы отказа

- фармакотерапия;
- никотин-заместительная терапия;
- поведенческое консультирование;
- когнитивно-поведенческие вмешательства;
- мотивационное интервьюирование;
- incentives;
- текстовые программы;
- приложения;
- relapse/lapse recovery;
- harm-reduction transitions, где они релевантны.

### Цифровая персонализация

- персонализированные interventions;
- just-in-time adaptive interventions;
- ecological momentary interventions;
- contextual recommendation systems;
- adaptive trials;
- digital phenotyping;
- wearable/sensor signals;
- privacy-preserving personalization.

### AI

- безопасное применение LLM в cessation/digital health;
- motivational interviewing agents;
- классификация контекста;
- message selection;
- personalization evaluation;
- hallucination/safety studies;
- open-weight/local model quality;
- inference cost/latency.

AI-исследование не меняет правило: core ALIVE работает без LLM до product evidence gate.

### Поведенческая наука

- craving dynamics;
- cue reactivity;
- habit learning;
- expectancy;
- identity change;
- values;
- stress;
- sleep;
- weight;
- social context;
- lapse progression;
- environmental restructuring.

### Медицинские эффекты

- mortality;
- cardiovascular risk;
- cancer risk;
- respiratory recovery;
- mental health;
- oral health;
- second-hand exposure;
- product-specific evidence для cigarettes/vape/hookah.

### Конкуренты

Постоянный основной список:

- Smoke Free;
- Kwit;
- QuitNow;
- EX Program;
- Pivot Breathe.

Дополнительно отслеживать:

- QuitSure;
- новые программы health systems/insurers;
- государственные digital cessation programs;
- новые заметные приложения;
- новые AI-first продукты;
- новые wearable/sensor продукты.

### Платформенные UX-тренды

- Apple Human Interface Guidelines;
- Android/Material guidance;
- accessibility;
- health-data permissions;
- notification patterns;
- mobile/web interaction conventions;
- privacy UX;
- onboarding;
- feedback;
- error recovery.

## 3. Приоритет источников

### Уровень A

- WHO;
- Cochrane;
- NICE;
- национальные клинические рекомендации с прозрачной методологией;
- крупные систематические обзоры/метаанализы;
- хорошо проведённые рандомизированные исследования.

### Уровень B

- peer-reviewed cohort/observational studies;
- qualitative user research;
- feasibility trials;
- официальные product efficacy publications.

### Уровень C

- официальные сайты конкурентов;
- release notes;
- App Store/Google Play descriptions;
- официальные design guidelines;
- техническая документация.

### Уровень D

- профессиональные обзоры;
- отраслевые СМИ;
- conference reports;
- preprints.

Уровень D используется как сигнал для проверки, а не как основание медицинского production claim.

## 4. Требование к свежести

По умолчанию приоритет:

- последние 12–18 месяцев для быстро меняющихся цифровых методов;
- последние 3–5 лет для современных систематических обзоров;
- более старые landmark studies остаются допустимыми, если более новые данные не заменили их и они всё ещё нужны для конкретной величины/вывода.

Возраст исследования сам по себе не определяет качество.

## 5. Что считается значимым событием

Уведомление требуется, если найдено хотя бы одно из следующего:

- новая крупная рекомендация меняет стандарт помощи;
- новый метаанализ заметно усиливает или ослабляет используемую ALIVE механику;
- новое исследование ставит под сомнение опубликованный Fact/Myth;
- появляется новый метод с достаточно сильным evidence;
- конкурент вводит новый паттерн, который явно решает важную проблему ALIVE;
- появляется массовый новый UX-паттерн, уменьшающий cognitive load;
- появляется доказанный способ real-time intervention;
- появляется технологический сдвиг в wearables/sensors/AI, который может изменить roadmap;
- обнаруживается privacy/safety risk в используемом подходе;
- меняются платформенные или регуляторные требования.

Незначительные косметические изменения конкурента не требуют уведомления.

## 6. Формат weekly finding

Каждый значимый finding должен содержать:

### Что изменилось

Короткое описание нового факта/продуктового изменения.

### Источник

- название;
- дата;
- URL/DOI;
- тип источника.

### Качество основания

- высокая уверенность;
- умеренная уверенность;
- предварительные данные;
- продуктовый сигнал без доказательства эффективности.

### Что это меняет для ALIVE

Конкретная связь с:

- strategy;
- evidence claim;
- feature;
- UX;
- data model;
- roadmap;
- safety.

### Решение

Одно из:

- **внедрить**;
- **проверить экспериментом**;
- **наблюдать**;
- **не использовать**.

### Следующее действие

Например:

- обновить Evidence Registry;
- создать hypothesis;
- создать ADR;
- изменить content;
- добавить roadmap candidate;
- ничего не менять.

## 7. Как finding попадает в репозиторий

Автоматическое уведомление само по себе не меняет продукт.

После owner/agent decision:

1. создать `docs/research/YYYY-MM-DD-<topic>.md` либо обновить существующий тематический обзор;
2. при medical claim обновить Evidence Registry/seed;
3. при изменении стратегии создать ADR;
4. при новой проверяемой механике добавить hypothesis;
5. при изменении очередности обновить ROADMAP;
6. при реализации создать отдельный release unit.

## 8. Research note

Рекомендуемая структура:

```text
# Тема

Дата проверки

## Вопрос

## Новые источники

## Что известно

## Что остаётся неопределённым

## Влияние на ALIVE

## Решение

## Что проверить дальше
```

Research note должен отделять фактические данные от интерпретации ALIVE.

## 9. Конкурентный мониторинг

Для каждого сильного изменения конкурента фиксировать:

- пользовательскую проблему;
- реализацию;
- насколько паттерн привычен;
- evidence, если конкурент его публикует;
- возможную причину эффективности;
- риски;
- что можно адаптировать;
- что нельзя копировать;
- потенциальную метрику ALIVE.

Не считать маркетинговый claim конкурента доказательством.

## 10. Дизайн-мониторинг

Не следить за эстетическими трендами отдельно от поведения.

Приоритет имеют изменения, которые улучшают:

- time-to-value;
- понятность;
- accessibility;
- error recovery;
- feedback;
- one-handed mobile use;
- notification fatigue;
- privacy comprehension;
- cross-channel continuity.

## 11. AI-мониторинг

Для AI-разработок отдельно проверять:

- реальный outcome, а не benchmark текста;
- размер выборки;
- наличие clinician/human evaluation;
- safety;
- reproducibility;
- персонализацию vs generic generation;
- стоимость и latency;
- возможность deterministic fallback.

Preprint не становится основанием core architecture без отдельного review.

## 12. Review уже принятой доказательной базы

Evidence Registry должен иметь `review_due_at`.

При наступлении срока:

- ищется более свежий systematic review/guideline;
- проверяется, изменился ли вывод;
- пользовательская формулировка пересматривается;
- старый источник не удаляется из истории без причины.

## 13. Quarterly product benchmark

Минимум раз в квартал выполнять сравнительный проход основных конкурентов по:

- onboarding;
- home;
- craving help;
- plan;
- progress;
- treatment support;
- facts/education;
- reminders;
- lapse recovery;
- community;
- coach/AI;
- pricing/paywall;
- localization;
- accessibility;
- product-specific nicotine flows.

Результат хранить отдельным dated research note.

## 14. Главный принцип

> **ALIVE должен меняться не потому, что появилась новая технология или конкурентная функция, а потому что появились данные, делающие конкретное изменение более вероятным способом помочь пользователю.**
