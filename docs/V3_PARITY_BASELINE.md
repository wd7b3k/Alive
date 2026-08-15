# ALIVE v3.0 — product depth / parity baseline

Статус: **BLOCKING ACCEPTANCE CRITERION**.

## Почему этот документ существует

Технический bootstrap v3.0 (React/Supabase/Auth/RLS) сам по себе не является новым продуктовым релизом. ALIVE v3.0 обязан сохранить минимум продуктовой глубины канонического v2.7 и развить её в новой универсальной архитектуре.

Нельзя считать пустой shell, configuration demo или набор объясняющих карточек функциональным преемником v2.7.

## Канонический baseline v2.7

Проверено по канонической production-сборке v2.7 и её database snapshot.

### Основные экраны

- **Сегодня** — главный action screen, текущая опора, progress cards, связки внимания, последние эпизоды;
- **Связки** — карта триггеров/паттернов и конкретных ответов;
- **Путь** — 7-day progress, персональная эффективность замен, карта связок, rewards / фонд свободы;
- **Смысл** — смысловые опоры, identity layer, старые механизмы → новый выбор, направления жизни;
- **Релизы** — продуктовая история.

### Основной behavioural flow

`trigger → need/function → contextual replacement → outcome → craving_after/helpfulness → personal effectiveness learning`

Episode UX включал:

- выбор триггера;
- выбор текущей потребности;
- контекстную замену;
- craving before;
- craving after;
- helpfulness;
- automaticity/context;
- successful broken link или nicotine episode;
- delay before smoking;
- non-shaming slip analysis.

### Дополнительная глубина

- evening check-in;
- удаление тестовых/ошибочных событий с пересчётом статистики;
- recent episodes;
- weak/new links as next work targets;
- personal replacement effectiveness;
- money/time returned;
- freedom fund;
- rewards;
- identity scripts;
- supports for daily/success/slip/meaning states.

### Content baseline v2.7

- 20 triggers;
- 14 historical cigarette functions;
- 35 contextual replacements;
- 76 trigger → replacement mappings;
- 35 trigger → function mappings;
- 51 supports (daily/success/slip/meaning);
- 10 identity scripts;
- 22 motivations / meanings;
- 11 body exercises;
- 7 rewards.

Этот baseline описывает **глубину**, а не требование буквально перенести персональные формулировки одного человека в global catalog.

## Что v3.0 обязано делать лучше

v3.0 должен сохранить указанную глубину и добавить:

1. универсальный multi-user Google identity;
2. PostgreSQL + RLS вместо Google Sheets;
3. cigarette + hookah + vape как разные raw products;
4. versioned ALIVE units с явным объяснением, что это behavioural heuristic;
5. vape-specific continuous-use logic;
6. food/drink replacements с guardrails;
7. NRT как intervention, а не relapse;
8. CRUD персональных Смыслов;
9. CRUD персональных Связок;
10. explicit-consent UGC submission;
11. onboarding/baseline по конкретному участнику;
12. `/experiment` с полной методологией/ограничениями/privacy;
13. principle `nothing unexplained` по всему UI;
14. data export/delete;
15. mobile-first flow без потери rich desktop experience.

## Privacy rule при переносе content depth

Персональные факты автора из legacy content не становятся global defaults для новых пользователей.

Global catalog может наследовать:

- общие механики;
- универсальные формулировки;
- структуры замен;
- safety guidance;
- pattern taxonomy.

Персональная биография, конкретные отношения, семейные факты, личные достижения и другие чувствительные формулировки остаются private user content и появляются только по явному вводу участника.

## Hard gate

`v3.0` нельзя объявлять готовым, если новый пользователь после входа видит более бедный продуктовый контур, чем пользователь v2.7.

Минимальный smoke-test parity:

- main action flow реально сохраняет episode;
- Today содержит полезный current state, а не placeholder;
- Links показывает карту паттернов;
- Path показывает вычисляемый прогресс и эффективность;
- Meanings содержит global + personal content CRUD;
- recent events можно удалить;
- evening check-in сохраняется;
- replacement suggestions идут из богатого контекстного каталога;
- профиль/baseline определяет расчёты;
- все метрики имеют понятные объяснения.
