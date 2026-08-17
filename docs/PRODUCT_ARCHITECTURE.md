# ALIVE — продуктовая архитектура

## 1. Назначение

Этот документ описывает, как продуктовые механизмы ALIVE связаны между собой на уровне пользовательского пути и product contracts.

Он не заменяет техническую архитектуру.

## 2. Core product system

```text
                 PERSONAL DEPENDENCE MODEL
                         │
          ┌──────────────┼───────────────┐
          │              │               │
     PHYSIOLOGY      BEHAVIOUR       BELIEFS
          │              │               │
     Treatment         Links         Facts/Myths
          │              │               │
          └──────────────┼───────────────┘
                         │
                  MICRO-AWARENESS
                         │
                  INTERVENTION ENGINE
                         │
             ┌───────────┼───────────┐
             │           │           │
        alternative   treatment   conscious-use
          response      action       episode
             │           │           │
             └───────────┼───────────┘
                         │
                       OUTCOME
                         │
                      LEARNING
                         │
           ┌─────────────┼─────────────┐
           │             │             │
         ПУТЬ          ЗАЧЕМ        ВМЕСТЕ
```

Вокруг core:

- Evidence Registry;
- Hypothesis Registry;
- Metrics Engine;
- Referral;
- Channel Orchestration;
- Privacy/Consent.

## 3. Три вложенных цикла

### Moment Loop

`импульс → пауза → распознавание → микроосознанность → решение → действие → outcome`

Цель: помочь непосредственно сейчас при минимальном friction.

### Learning Loop

`контекст → intervention → outcome → обновление personal model → следующий rank`

Цель: ALIVE становится точнее на реальных данных человека.

### Longitudinal Change Loop

`наблюдение → закономерность → гипотеза/убеждение → подготовленный новый ответ → реальная ситуация → новый опыт → ослабление зависимости`

Цель: изменить не только следующий эпизод, но вероятность и субъективную ценность будущего зависимого действия.

## 4. Пользовательские стадии

### Размышляю

Фокус:

- минимальный baseline;
- Факты/Мифы;
- Зачем;
- наблюдение без требования немедленной quit date.

### Исследую

Фокус:

- Links;
- ожидания;
- product-specific patterns;
- personal observations.

### Готовлюсь

Фокус:

- target goal;
- treatment/cessation strategy;
- prepared Link responses;
- environment planning;
- known risks.

### Прекращаю

Главный surface:

> **Хочу закурить / потянулся к вейпу / предлагается кальян**

Минимально короткий Intervention flow.

### Первые дни

Фокус:

- withdrawal/context;
- known Links;
- treatment adherence;
- frequent recovery/support;
- next few hours.

### Стабилизируюсь

Фокус:

- remaining Links;
- beliefs;
- longer nicotine-free intervals;
- decrease in intervention need.

### Закрепляю

Фокус:

- rare triggers;
- social situations;
- identity/Goals;
- prevention of «одна ничего не изменит» scenarios.

### Возврат / lapse

Отдельный Recovery Loop, а не reset-to-zero.

## 5. Cigarette moment contract

Input может быть минимальным:

- impulse/quick log;
- known product;
- optional craving/context.

System resolves:

- known Link;
- micro-awareness candidate;
- prepared response;
- treatment action eligibility;
- alternative intervention.

Outcome:

- target use yes/no;
- minimal helpfulness/craving change;
- optional expectation/actual observation.

## 6. Vape moment contract

Вейп поддерживает два типа событий:

### Interaction

`потянулся/взял устройство`

Это основной behavioural decision point.

### Consumption facts

Raw puffs/group/session/device data.

Progress включает:

- interactions/day;
- puffs/day;
- nicotine-free intervals;
- automatic-interaction reduction.

Если vape — cessation bridge, smoke-free outcome считается отдельно от nicotine-free.

## 7. Hookah moment contract

Кальянный flow должен начинаться на более раннем decision point:

- invitation;
- plan;
- venue/order;
- preparation;
- session.

System может предложить:

- stay/socialize without hookah;
- alternative ritual;
- Goal/Fact/Myth;
- conscious session observation, если пользователь всё же выбирает кальян.

Raw session хранит duration/cost.

## 8. Micro-awareness contract

На один decision moment обычно выбирается **не более одного главного contextual message**, при необходимости дополненного одним коротким Goal.

Selector учитывает:

- context;
- Link;
- product;
- belief;
- recent exposures;
- fatigue;
- journey stage;
- personal outcomes.

Не создавать длинную обязательную последовательность `Fact→Myth→Goal`.

## 9. Зачем contract

Goal/Value может быть:

- самостоятельным reminder;
- частью micro-awareness;
- reinforcement после outcome;
- long-term Path element.

Пользователь контролирует active/inactive и собственные формулировки.

## 10. Intervention contract

Каждый candidate имеет минимум:

- mechanism/category;
- eligibility;
- expected duration;
- context tags;
- product applicability;
- rationale;
- model/version;
- personal prior/outcome state if available.

Engine выбирает минимально достаточный response.

## 11. Conscious-use contract

Если user chooses use:

- no shame;
- no false safety;
- optional expected benefit before;
- actual benefit after;
- raw product event;
- Recovery if relevant.

Это data-generating personal experiment, но не доказанное лечение само по себе.

## 12. Metrics contract

На ключевых surfaces всегда доступны:

- Time Saved;
- Money Saved;
- Health Minutes.

Требования:

- personal baseline;
- model version;
- explainability;
- correction recompute;
- product coverage.

Health Minutes показываются `≈`.

## 13. Путь contract

Путь отвечает на четыре вопроса:

1. сколько целевого употребления удалось избежать;
2. какие Links становятся слабее;
3. какие beliefs изменились;
4. что пользователь уже получил в реальной жизни.

Streak — одна из метрик, не главный смысл Path.

## 14. Together contract

Together получает только approved aggregates.

Никогда автоматически не получает:

- notes;
- private Goal text;
- private Link text;
- treatment details;
- raw episode content.

Friend relationship после referral требует mutual consent.

## 15. Referral contract

Referral eligibility определяется не engagement, а value moment.

Input:

- achieved value moment;
- user not in vulnerable flow;
- prompt fatigue state.

Output:

- optional invite CTA;
- privacy-safe share payload;
- opaque referral link.

Referral никогда не блокирует основное действие.

## 16. Donation contract

Donation CTA secondary и появляется только после value history или explicit user navigation.

Donation status не влияет на core entitlement.

## 17. Cross-channel contract

Любой frontend должен уметь продолжить один и тот же journey state.

Пример:

- утром Link создан на web;
- днём Telegram получает craving message;
- Intervention Engine использует тот же Link;
- вечером Path на web показывает тот же outcome.

Channel не владеет product truth.

## 18. AI contract

AI может предложить semantic interpretation, но downstream action проходит constrained product contracts.

Например:

`free text → AI trigger candidate → validated trigger id → deterministic Intervention Engine`

AI output не должен молча создавать новый health claim или privileged action.

## 19. Product traceability

Каждый новый user-facing mechanism должен иметь связь:

`product problem → hypothesis/evidence → module → user moment → outcome metric → release gate`

Это обязательный фильтр против бессистемного роста feature set.
