# ALIVE v3.1 — Behavioral Depth + Together

Статус: **DRAFT / VALIDATION IN PROGRESS**

Цель релиза — углубить поведенческий движок ALIVE без регрессии утверждённого v3.0 UI и вернуть ранее запланированный контур `Вместе`.

## Что меняется

- evidence-first библиотека методов прекращения курения;
- отдельная research-линия smoking myths / outcome expectancies;
- расширенный каталог Замен и механизм-aware ranking;
- короткие техники grounding/breathing/attention из HumanOS, адаптированные как state support;
- более ясный guided craving flow;
- `Факты` и `Мифы`;
- smoking start year / pack-years только как evidence matching metadata;
- lapse flow без обнуления;
- privacy-safe `Вместе`;
- hardening утверждённого логотипа.

## Не входит

- Admin / Product Intelligence;
- рефакторинг business logic под несколько client adapters;
- Telegram/native mobile client;
- leaderboard;
- медицинские назначения;
- индивидуальные medical risk predictions.

Следующий архитектурный этап зафиксирован в `docs/ROADMAP.md`: Admin + Product Intelligence + единый versioned application/API layer для Web, Telegram, mobile и будущих клиентов поверх одной канонической базы.

## Evidence

- `docs/research/NICOTINE_CESSATION_EVIDENCE_2026.md`
- `docs/research/SMOKING_MYTHS_AND_EXPECTANCIES_2026.md`

## Release gate

Релиз не считается завершённым, пока `VALIDATION.md` не закрыт и runtime/production проверки не подтверждены.
