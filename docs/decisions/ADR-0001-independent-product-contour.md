# ADR-0001 — ALIVE как самостоятельный продуктовый контур

- Status: Accepted
- Date: 2026-08-15

## Контекст

ALIVE развивался как отдельный экспериментальный сервис по никотиновой зависимости, при этом основной репозиторий уже содержит HumanOS 2.0 с собственной стратегией, roadmap и governance.

Смешивание ALIVE с core HumanOS привело бы к неявному наследованию гипотез, модулей и архитектурных решений, которые относятся к другому продукту.

## Решение

ALIVE создаётся внутри того же GitHub repository, но как самостоятельный контур:

`projectsv2.0/products/alive/`

Он имеет собственные:

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

ALIVE не является runtime dependency HumanOS 2.0.

HumanOS не является runtime dependency ALIVE.

Общие инженерные принципы репозитория допустимы: git as source of truth, privacy-by-design, release discipline, no secrets, AI audit trail.

Будущая интеграция между продуктами возможна только через отдельный ADR, explicit contracts и consent/data boundary.

## Причины

- сохраняется единый репозиторий владельца;
- исключается архитектурное смешивание;
- ALIVE получает собственный lifecycle;
- новый AI/разработчик видит правильный контекст;
- проще независимо остановить, развить или позже выделить продукт в отдельный repository.

## Последствия

Плюсы:

- ясный ownership;
- меньше context pollution;
- независимая версия 3.x;
- независимые product gates.

Минусы:

- появляется дополнительная документация;
- общие инженерные решения придётся синхронизировать осознанно, а не автоматически.

Минусы принимаются.
