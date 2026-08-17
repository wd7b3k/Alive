# Гипотезы и метрики ALIVE

Все product-effect gates provisional до накопления реальных данных. Нельзя трактовать feasibility/pilot signal как доказательство клинической эффективности.

## North Star

**Sustained Freedom Rate** — доля активированных пользователей, достигших устойчивой свободы от целевого продукта.

Отдельно:

- `smoke_free`;
- `nicotine_free`.

## H-ALIVE-001 — Микропауза

**Гипотеза:** короткая пауза между импульсом и автоматическим действием увеличивает долю осознанных решений и снижает долю immediate target actions.

Метрики:

- impulse→decision latency;
- share of impulses without immediate target action;
- target use after pause;
- user-perceived usefulness.

## H-ALIVE-002 — Связки + prepared response

**Гипотеза:** распознавание повторяющейся Связки и заранее подготовленный `Когда X → делаю Y` response повышают вероятность alternative response в следующем похожем эпизоде.

Метрики:

- Link recognition rate;
- prepared-response coverage;
- successful response recognized Link vs unknown context;
- Link target-action probability over time;
- weakened Links.

## H-ALIVE-003 — Микроосознанность

**Гипотеза:** короткий контекстный Fact/Myth/personal insight непосредственно в момент выбора уменьшает автоматизм сильнее, чем одна только библиотека знаний.

Метрики:

- use after micro-awareness vs comparable baseline;
- craving/decision outcome;
- dismiss/ignore rate;
- message fatigue;
- qualitative comprehension.

## H-ALIVE-004 — Факт + Зачем

**Гипотеза:** сочетание объективной цены зависимого действия с personally relevant Goal/Value увеличивает вероятность alternative response по сравнению с каждым компонентом отдельно.

Экспериментально сравнивать:

- Fact only;
- Goal only;
- Fact + Goal;
- neutral/control.

## H-ALIVE-005 — Outcome-aware Intervention Ranking

**Гипотеза:** персональное ранжирование на основании structured outcomes превосходит статический universal catalog.

Метрики:

- helpfulness;
- craving delta;
- target use after intervention;
- completion;
- personalized top candidate vs catalog baseline.

## H-ALIVE-006 — Expectation vs Outcome

**Гипотеза:** фиксация ожидаемого и фактического эффекта осознанного эпизода употребления постепенно снижает переоценённую subjective value связанных сценариев.

Метрики:

- expectation/actual delta;
- belief strength change;
- target-use probability in linked contexts;
- user burden/dropout.

## H-ALIVE-007 — Recovery

**Гипотеза:** non-shaming structured recovery после lapse снижает вероятность возврата к прежней интенсивности употребления.

Метрики:

- next-use latency after lapse;
- return-to-plan rate;
- 24h/72h usage after lapse;
- re-engagement;
- qualitative shame signal.

## H-ALIVE-008 — Product-specific cigarette model

**Гипотеза:** discrete episode flow позволяет достаточно точно вмешиваться в момент выбора сигареты без чрезмерного input burden.

Метрики:

- real craving-flow usage;
- flow completion;
- immediate response latency;
- cigarette events linked to impulse episodes;
- abstinence/reduction signals.

## H-ALIVE-009 — Vape interaction model

**Гипотеза:** для вейпа device-interaction + interval model полезнее простой модели «одна затяжка/один smoking episode».

Метрики:

- device interactions/day;
- puffs/day;
- nicotine-free interval expansion;
- automatic-interaction share;
- targeted intervention completion;
- cigarette substitution/dual-use context.

## H-ALIVE-010 — Hookah pre-session intervention

**Гипотеза:** intervention на стадии invitation/plan/order эффективнее вмешательства только после начала кальянной сессии.

Метрики:

- planned sessions;
- prevented sessions;
- session decision stage;
- duration/cost avoided;
- linked social context.

## H-ALIVE-011 — Три метрики свободы

**Гипотеза:** постоянные Time Saved / Money Saved / Health Minutes делают пользу отдельных решений более осязаемой и усиливают motivation/reinforcement без увеличения shame.

Метрики:

- metric comprehension;
- metric view→next meaningful action;
- user-reported motivational value;
- misunderstanding rate for Health Minutes;
- no medical-equivalence misunderstanding.

Health Minutes считается heuristic metric; качество медицинского outcome по ней не выводится.

## H-ALIVE-012 — Зачем

**Гипотеза:** personal Goals/Values полезны как contextual motivational layer и long-term identity support.

Метрики:

- contextual use;
- user-created Goals/Values;
- helpfulness;
- target action after Goal reminder;
- user-reported relevance.

## H-ALIVE-013 — Together

**Гипотеза:** privacy-safe group activity и optional friend relationship повышают return/recovery без соревнования и shame.

Метрики:

- reactivation after group exposure;
- Together view→meaningful action;
- optional friend retention;
- negative comparison feedback;
- privacy incidents = 0.

## H-ALIVE-014 — Omnichannel

**Гипотеза:** messenger/mobile access увеличивает использование ALIVE непосредственно в реальных impulse moments по сравнению с web-only product.

Метрики:

- impulse sessions by channel;
- response latency;
- channel continuation;
- cross-channel state consistency;
- outcome by channel after context adjustment.

## H-ALIVE-015 — Referral after value realization

**Гипотеза:** мягкий invite CTA после подтверждённого позитивного value moment создаёт organic acquisition без ухудшения cessation experience.

Secondary growth metrics:

- value moments eligible;
- invite rate;
- share rate;
- invite→visit;
- invite→activation;
- activated referrals per successful active user;
- referred-user retention.

Safety metrics:

- craving-flow interruption = 0;
- lapse-context referral prompts = 0;
- negative user feedback.

## H-ALIVE-016 — Donation support

**Гипотеза:** после устойчиво полученной пользы часть пользователей добровольно поддерживает разработку без paywall и без ухудшения доверия.

Эта гипотеза проверяется только после отдельного integration gate.

Метрики:

- support page visits;
- donation conversion;
- repeat support;
- no cessation feature entitlement;
- trust feedback.

## H-ALIVE-017 — Local LLM semantic layer

Запускается только после core product evidence gate.

**Гипотеза:** local open-weight LLM повышает качество semantic classification, summary и content matching при приемлемых latency/cost/privacy без ухудшения deterministic safety.

Метрики:

- trigger/context classification quality;
- structured output validity;
- medical hallucination rate;
- Russian quality benchmark;
- latency;
- throughput;
- infrastructure cost;
- deterministic fallback success.

## H-ALIVE-018 — UX comprehensibility

**Гипотеза:** новый пользователь способен понять ALIVE без устной инструкции автора.

Метрики:

- onboarding completion;
- first real impulse-flow completion;
- tooltip/help usage;
- user-reported confusion;
- incorrect entries/deletions;
- misunderstanding of Fact/Myth/Health Minutes/ALIVE units.

Gate: систематическая необходимость устного обучения означает незавершённый UX.

## H-ALIVE-019 — Privacy trust

**Гипотеза:** ясный private-by-default UX повышает готовность фиксировать реальные данные.

Hard metric:

- privacy incidents = 0.

Дополнительно:

- export/delete success;
- Together whitelist compliance;
- UGC consent correctness.

## Главные leading indicators до долгосрочных cohorts

- usage vs personal baseline;
- impulse sessions;
- impulse→no-use share;
- craving delta;
- recovery rate;
- weakened Links;
- prepared responses;
- nicotine-free intervals;
- intervention effectiveness;
- belief change;
- treatment adherence, если применимо;
- return after lapse;
- Time/Money/Health Minutes comprehension.

## Pilot evidence gates

### Gate A — Feasibility

Небольшая добровольная cohort, минимум 14 дней реального использования после стабильного release.

Это проверяет:

- понятность;
- использование в настоящих impulse moments;
- качество data capture;
- отсутствие safety/privacy failures;
- появление personal learning signal.

### Gate B — Product mechanism

После достаточного числа реальных episodes проверить, улучшаются ли:

- impulse outcomes;
- Link-specific outcomes;
- ranking quality;
- recovery;
- reduction vs baseline.

### Gate C — Longer cessation outcomes

Только после достаточной cohort/time horizon оценивать устойчивую abstinence/reduction и сравнивать версии продукта.

## Decision outcomes

- `GO` — механика используется и создаёт полезный measurable signal;
- `ITERATE` — потребность подтверждается, но UX/model мешает;
- `PIVOT` — core mechanism не соответствует реальному поведению;
- `STOP` — после устранения очевидных проблем продукт не создаёт полезности или создаёт неприемлемые safety/privacy risks.
