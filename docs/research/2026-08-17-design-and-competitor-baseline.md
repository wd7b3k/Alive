# Базовое исследование дизайна и конкурентов ALIVE

Дата: 2026-08-17

Статус: baseline для серии 4.x

## Вопрос

Какие современные продуктовые и UX-паттерны в digital smoking/nicotine cessation стоит использовать как ориентир для ALIVE, не превращая продукт в копию конкурентов или обычный quit tracker?

## Источники

### Конкуренты

- Smoke Free — https://smokefreeapp.com/
- Kwit — https://kwit.app/en/science
- QuitNow — https://www.quitnow.app/
- EX Program — https://truthinitiative.org/exprogram
- Pivot Breathe — https://pivot.co/mobile-app
- QuitSure — https://quitsure.app/

### Исследования цифровых вмешательств

- Network meta-analysis of digital smoking cessation interventions, Nature Human Behaviour, 2025 — https://www.nature.com/articles/s41562-025-02295-2
- User experience systematic review of smoking cessation apps, 2023 — https://www.sciencedirect.com/science/article/pii/S1386505623000874
- JITAI/digital health direction — https://journals.plos.org/digitalhealth/article?id=10.1371/journal.pdig.0000705
- Contemporary JITAI perspective — https://www.nejm.org/doi/full/10.1056/NEJMp2500683

### Платформенные UX-ориентиры

- Apple onboarding — https://developer.apple.com/design/human-interface-guidelines/onboarding
- Apple feedback — https://developer.apple.com/design/human-interface-guidelines/feedback
- Apple accessibility — https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple inclusion — https://developer.apple.com/design/human-interface-guidelines/inclusion

## Повторяющиеся продуктовые закономерности

### 1. Пользователю нужен быстрый ответ «что делать сейчас»

Сильные продукты не ограничиваются графиком прогресса. Они имеют отдельные инструменты для cravings, сообщений, упражнений или coach interaction.

Вывод ALIVE:

`Хочу закурить` должен быть самым доступным high-load path, а не одним из многочисленных равноправных пунктов меню.

Статус: **внедрить**.

### 2. Прогресс должен быть видимым и конкретным

У конкурентов хорошо работают:

- время без курения;
- деньги;
- health milestones;
- achievements;
- personal progress.

Вывод ALIVE:

постоянные Time/Money/Health Minutes оправданы как слой осязаемой ценности, но не должны сводить Путь к streak.

Статус: **внедрить с собственной методологией**.

### 3. Персональный plan лучше набора случайных советов

Smoke Free, EX и Pivot строят более связанный план/путь, чем простая библиотека контента.

Вывод ALIVE:

Связки, Зачем и prepared responses должны формировать личную модель, а не существовать отдельными каталогами.

Статус: **внедрить**.

### 4. Персонализированная digital support выглядит перспективнее generic support

Современный network meta-analysis поддерживает направление персонализированных digital interventions, хотя heterogeneity остаётся значительной.

Вывод ALIVE:

персонализация должна исходить из context/outcomes и быть измеримой.

Статус: **внедрить как product hypothesis + измерять**.

### 5. Поддержка в нужный момент — перспективное направление

JITAI соответствует центральной идее ALIVE: помощь возникает, когда risk/opportunity действительно актуальны.

Ограничение:

новые sensor/AI implementations имеют неоднородную evidence base; технологичность сама по себе не доказывает outcome.

Вывод ALIVE:

сначала rule-based/outcome-based timely support; sensors/LLM позже.

Статус: **внедрить базовый механизм, advanced JITAI наблюдать/экспериментировать позже**.

### 6. Community полезно, но не должно становиться ядром

QuitNow и EX демонстрируют ценность community/social support.

Вывод ALIVE:

`Вместе` остаётся secondary support layer без leaderboard и без раскрытия private journey.

Статус: **внедрить позже**.

### 7. Геймификация полезна дозированно

Kwit и Smoke Free используют achievements/missions/game elements.

Риск:

слишком сильный streak/badge design создаёт all-or-nothing thinking и смещает outcome к engagement.

Вывод ALIVE:

использовать milestones, experiments и personal wins, но не превращать lapse в проигрыш игры.

Статус: **проверять точечно**.

### 8. Readiness matters

Pivot работает с пользователями не только в состоянии «я сегодня бросаю», но и с разной готовностью.

Вывод ALIVE:

journey должен учитывать `размышляю / исследую / готовлюсь / прекращаю / стабилизируюсь / восстанавливаюсь`.

Статус: **внедрить постепенно**.

### 9. Cross-channel support имеет практическую ценность

EX использует web/app/text/community как одну программу.

Вывод ALIVE:

web, messenger и mobile не должны иметь отдельную business logic.

Статус: **канонический architecture principle**.

## Повторяющиеся UX-потребности из исследований

В систематическом обзоре пользовательского опыта приложений повторяются:

- простота;
- personalization;
- reminders;
- tracking;
- education;
- coping/distraction;
- social support;
- rewards;
- content variety;
- privacy/security.

Вывод ALIVE:

глубокая domain model имеет смысл только если снижает интерфейсную сложность.

## Что ALIVE должен делать иначе

### Не только quit date

Не все пользователи готовы к одномоментному quit date. ALIVE должен приносить пользу ещё в фазе наблюдения и подготовки.

### Не только tracking

Запись события сама по себе не является intervention.

### Не только content

Факт или Миф должен появляться контекстно и менять decision loop.

### Не только coach/chat

Conversational UI не является персонализацией без personal data/outcomes.

### Не только streak

Путь должен показывать изменение Связок, craving, beliefs и рабочих responses.

### Не универсальный nicotine flow

Cigarette/vape/hookah требуют разных behavioral semantics.

## Рекомендации для 4.0.0-alpha.1

### Внедрить

- primary CTA `Хочу закурить`;
- быстрый craving path;
- контекстный Fact/Myth/Зачем;
- постоянные три метрики;
- outcome feedback;
- понятное `Почему это`;
- value-first empty states;
- русский интерфейс;
- product-specific semantics;
- admin funnel;
- structured exit reasons.

### Проверить экспериментом

- Fact + personal Зачем в одном micro-awareness moment;
- ranking на personal outcome;
- насколько часто показывать Health Minutes без fatigue;
- expectation→actual в conscious smoking episode;
- value-moment referral позже.

### Наблюдать

- AI coach;
- sensor-triggered JITAI;
- wearables;
- CO hardware;
- advanced community mechanisms;
- automated motivational interviewing.

### Не использовать сейчас

- aggressive paywall;
- shame;
- leaderboard;
- streak-loss pressure;
- generic AI-generated medical advice;
- hardware prerequisite.

## Что обновлять далее

Этот baseline не является вечным.

Quarterly review должен проверять:

- изменился ли onboarding лидеров;
- новые craving flows;
- AI/coach;
- treatment support;
- product-specific nicotine support;
- pricing;
- accessibility;
- новые efficacy studies;
- новые entrants.

Значимые изменения фиксируются новым dated research note, а не молча переписывают этот baseline.
