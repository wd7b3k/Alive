# ALIVE v3.1 — Behavioral Depth + Together

Статус: **RELEASE CANDIDATE / DRAFT PR / VALIDATION IN PROGRESS**

Цель релиза — углубить поведенческий движок ALIVE без регрессии утверждённого v3.0 UI и вернуть privacy-safe контур `Вместе`.

## Реализовано

- product-aware craving CTA;
- guided flow с явным progress, отдельной силой тяги, возвратом по достигнутым шагам и downstream invalidation;
- mechanism-aware Replacement Engine с персональной историей и разнообразием top-3;
- contextual Myths и private relevance;
- source-linked Facts/Myths knowledge route;
- optional cigarette start year и справочный pack-years;
- lapse flow без обнуления с context-disruption next experiment;
- privacy-safe `Вместе` без leaderboard и private user data;
- owner-approved bundled logo;
- сохранённый `RedesignApp`/`redesign.css` baseline без активного параллельного shell.

## Не входит

- Admin / Product Intelligence;
- рефакторинг business logic под несколько client adapters;
- Telegram/native mobile client;
- leaderboard;
- медицинские назначения;
- индивидуальные medical risk predictions.

## Evidence

- `docs/research/NICOTINE_CESSATION_EVIDENCE_2026.md`
- `docs/research/SMOKING_MYTHS_AND_EXPECTANCIES_2026.md`

## Preview

`https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev/`

Это branch preview, не production.

## Release gate

Technical frontend gate пройден: UI contract, typecheck и build зелёные. Public responsive preview и owner logo/header visual gate пройдены.

Релиз не считается завершённым и PR не переводится из draft, пока не закрыты authenticated regression matrix, second-user isolation, medically significant copy review и финальный owner visual approval. Production/main не менять до отдельного решения владельца.
