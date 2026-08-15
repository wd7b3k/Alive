# ADR-0001 — ALIVE как самостоятельный продуктовый контур

- Status: **Superseded by ADR-0002**
- Date: 2026-08-15

## Контекст

ALIVE развивался как отдельный экспериментальный сервис по никотиновой зависимости, при этом основной репозиторий уже содержит HumanOS 2.0 с собственной стратегией, roadmap и governance.

Смешивание ALIVE с core HumanOS привело бы к неявному наследованию гипотез, модулей и архитектурных решений, которые относятся к другому продукту.

## Решение на момент ADR-0001

ALIVE был создан внутри того же GitHub repository как самостоятельный контур:

`projectsv2.0/products/alive/`

Он получил собственные:

- README/AGENTS;
- charter;
- product strategy;
- methodology;
- privacy rules;
- architecture/module/data docs;
- hypotheses/roadmap;
- releases;
- AI audit trail.

## Связь с HumanOS

ALIVE не являлся runtime dependency HumanOS 2.0.

HumanOS не являлся runtime dependency ALIVE.

Будущая интеграция между продуктами возможна только через отдельный ADR, explicit contracts и consent/data boundary.

## Почему решение superseded

После начала v3.0 владелец решил устранить и репозиторную связанность: ALIVE физически выделен в `wd7b3k/Alive`. Новое каноническое решение описано в `ADR-0002-standalone-github-repository.md`.
