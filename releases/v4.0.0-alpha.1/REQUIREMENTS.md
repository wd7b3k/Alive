# Требования ALIVE 4.0.0-alpha.1

## 1. Пользовательский результат

Пользователь должен за несколько секунд понять:

- что делать, если сейчас хочется курить;
- зачем ему нужна свобода;
- какой следующий ответ предлагает ALIVE;
- почему предложен именно он;
- что изменилось после решения;
- какой накопленный результат уже создан.

## 2. Главный экран

Обязательный primary CTA:

**Хочу закурить**

Home должен отвечать на четыре вопроса:

1. Что делать сейчас?
2. Где я в процессе?
3. Что сегодня важно?
4. Что ALIVE уже понял обо мне?

Не превращать home в dashboard из десятков равнозначных карточек.

## 3. Три постоянные метрики

Показывать:

- **Вернул время**;
- **Сохранил деньги**;
- **≈ Сохранил здоровую жизнь**.

### Health Minutes

- для сигарет использовать только утверждённую versioned heuristic;
- обязательно `≈` и доступное объяснение;
- не выдавать за персональный прогноз;
- не переносить cigarette coefficient на vape/hookah;
- если coverage неполное, явно написать, что именно учитывается.

## 4. Зачем

Пользовательский термин `Смыслы` заменяется на **Зачем**.

Нужно поддержать:

- личные цели;
- ценности;
- направления;
- собственную формулировку;
- важность;
- активность/скрытие;
- редактирование;
- использование в craving flow.

Legacy `user_meanings`/`goal_text` не удалять до безопасной миграции.

## 5. Craving entry

Главный high-load flow начинается с `Хочу закурить`.

Требования:

- один тап с home;
- минимальное число обязательных вопросов;
- первый полезный response быстро;
- внутренний decision model не должен превращаться в длинный wizard;
- пользователь может выйти без shame;
- early exit фиксируется структурированно там, где возможно.

## 6. Сигарета — эталонный vertical slice

Обязательный первый сценарий:

`после еды → тяга → контекст → микроосознанность → действие → outcome → metrics → learning`

Этот slice должен работать end-to-end до расширения.

## 7. Вейп

Не использовать cigarette flow с заменённым label.

Минимальная alpha semantics:

- импульс/автоматическое обращение к устройству;
- контекст;
- возможность отложить/увеличить интервал;
- puff/group capture where relevant;
- distinct copy;
- nicotine-free interval как полезный signal;
- отсутствие cigarette Health Minutes extrapolation.

## 8. Кальян

Минимальная alpha semantics:

- pre-session decision point;
- социальный/ритуальный контекст;
- session как событие;
- duration/cost where available;
- distinct copy;
- отсутствие cigarette Health Minutes extrapolation.

## 9. Микроосознанность

Перед решением ALIVE может показать один релевантный элемент:

- approved Fact;
- approved Myth;
- личное Зачем;
- персональный observation из прошлых outcomes.

Требования:

- максимум одна основная мысль за раз;
- коротко;
- evidence-governed;
- fatigue/repetition logic;
- `Подробнее` доступно, но не блокирует flow;
- impression/usefulness измеряются;
- LLM не генерирует medical copy.

## 10. Intervention Engine v1

Должен использовать:

- product type;
- trigger/context;
- craving strength where available;
- prepared response;
- eligibility;
- user preference;
- personal outcome projection when enough data;
- deterministic fallback.

Пользователь видит краткое объяснение:

> Почему это

Пример:

> После еды тебе чаще помогала короткая прогулка.

Не выдавать generic recommendation за персонализацию.

## 11. Замены/действия

Карточка отвечает:

- что сделать;
- сколько примерно занимает;
- почему подходит сейчас;
- доступно ли в текущем контексте;
- есть ли safety note.

Не ограничивать библиотеку физическими упражнениями.

## 12. Outcome

После действия минимально собирать:

- помогло / частично / нет;
- тяга после, если это не перегружает flow;
- никотин был / не был;
- выбранное действие.

Для conscious-use path, если он включён в alpha:

- что ожидал получить;
- получил / частично / нет.

## 13. Feedback

После сохранения показать смысл результата, а не только `Сохранено`.

Например:

- обновился personal learning;
- выросла одна из трёх метрик;
- Связка получила новый outcome;
- response получил новый personal score.

Не показывать фальшивую точность.

## 14. Analytics

Минимальные события:

- craving flow opened;
- product selected, если требуется;
- context selected/recognized;
- awareness shown;
- awareness feedback;
- intervention shown;
- intervention selected;
- intervention completed;
- outcome saved;
- flow abandoned;
- structured reason;
- quick use отдельно;
- metric projection updated/visible where needed.

Machine event names могут быть английскими внутри code/schema, но admin labels — русские.

## 15. Admin

Dashboard должен уметь ответить:

- сколько пользователей дошло до craving help;
- сколько дошло до первого полезного response;
- где закрыли flow;
- по какой причине;
- какие interventions выбирают;
- какие associated outcomes;
- какой Fact/Myth показан;
- perceived usefulness;
- продуктовый разрез;
- repeat craving use;
- технические ошибки.

Не загружать private free text.

## 16. Testing

Добавить минимальный automated testing layer для новой pure/domain logic.

Предпочтительно Vitest или эквивалент, совместимый с текущим Vite/TS стеком.

Обязательно тестировать:

- freedom metric calculations;
- intervention ranking;
- awareness selection/fatigue;
- analytics mapping;
- product-specific semantics;
- delete/recompute helpers if touched.

Не добавлять тяжёлый testing stack без необходимости.

## 17. Browser QA

Если browser/computer-use/Playwright доступен:

- пройти canonical cigarette slice;
- проверить vape flow;
- проверить hookah flow;
- mobile viewport;
- desktop;
- empty states;
- error/retry;
- delete/correction;
- admin access boundary.

## 18. Локализация

В изменённых пользовательских поверхностях не должно оставаться видимых:

- `NRT`;
- `reset`;
- `replacement`;
- `outcome`;
- `meaning`;
- `streak`;
- иных технических английских labels.

Использовать естественный русский, не кальку.

## 19. UX tone

- взрослый;
- спокойный;
- уверенный;
- без shame;
- без инфантилизации;
- без агрессивной gamification;
- без устрашающей медицинской риторики.

## 20. Visual direction

- calm premium;
- dark-first текущий brand direction;
- один сильный accent;
- понятная typographic hierarchy;
- много воздуха;
- minimum competing cards;
- удобные mobile controls;
- feedback animation только если помогает пониманию.

Не менять brand/logo без отдельного решения.

## 21. Privacy

- private by default;
- `Зачем`/Связки/private notes не попадают в generic analytics;
- admin не получает их через dashboard;
- service keys только server-side;
- никакого public sharing в этом release.

## 22. Non-goals

Не реализовывать:

- local LLM;
- referral;
- Tribute;
- Telegram;
- Together redesign;
- wearables;
- sensors;
- complex adaptive ML;
- subscriptions;
- public profiles.

## 23. Release quality

Обязательны:

- `alive-release-quality` skill, если установлен;
- scoped AGENTS;
- Implementation Plan;
- vertical slice first;
- self-review;
- independent review where possible;
- factual validation report.
