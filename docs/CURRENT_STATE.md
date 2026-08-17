# Текущее состояние ALIVE

## Статус

ALIVE — самостоятельный private repository `wd7b3k/Alive`.

`wd7b3k/Alive` — единственный source of truth.

Текущий runtime baseline на `main`: **ALIVE v3.0 product alpha / in development**.

Отдельно существует draft PR v3.1 с behavioral-depth/Together/Facts/Myths work. Он не считается принятым production state до merge/owner gate.

## Текущий стратегический release unit

Ветка:

`agent/product-strategy-foundation`

Цель:

- полностью пересобрать продуктовую стратегию;
- добавить техническую стратегию;
- синхронизировать Methodology/Principles/Modules/Data/Hypotheses/Roadmap;
- зафиксировать Evidence Standard;
- зафиксировать Product Architecture;
- не изменять runtime code, schema или deployment.

Этот release unit намеренно является **documentation-only foundation**.

После его принятия будущие runtime releases должны выводиться из новой стратегии, а не из старой узкой модели `need → replacements`.

## Канонический product thesis после strategy foundation

> **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**

Ключевые active product mechanisms:

- product-specific impulse models;
- Связки + prepared responses;
- микроосознанность;
- Факты;
- Мифы/Перепрошивка;
- Зачем;
- Intervention Engine;
- Treatment Support;
- conscious-use expectation/outcome;
- Recovery;
- Outcome Learning;
- Путь;
- Вместе;
- Time/Money/Health Minutes;
- referral after value realization.

## Product-specific direction

### Cigarette

Discrete impulse/decision flow.

### Vape

Device interaction + puffs + nicotine-free interval model.

### Hookah

Pre-session decision + session-level raw event.

Medical harm equivalence между продуктами не выводится из ALIVE units.

## Метрики свободы

Три постоянные user-facing metrics:

- Time Saved;
- Money Saved;
- Health Minutes.

Health Minutes — versioned population-level motivational heuristic, не персональный медицинский прогноз.

## Финансирование

Основная помощь не строится вокруг paywall.

Планируется будущая добровольная поддержка разработки через Tribute после отдельного owner/privacy/security gate.

До этого runtime payment integration отсутствует.

## AI direction

Local/open-weight LLM **не входит в текущий implementation scope**.

Он появляется только после product evidence gate.

До этого:

- core decision logic deterministic/explainable;
- learning строится на structured outcomes;
- product работает без LLM.

После evidence gate AI вводится model-agnostic semantic layer с deterministic fallback.

## Живая инфраструктура main

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Production/alpha host: `https://alive-aw2.pages.dev`.
- Planned canonical host: `https://alive.hmnos.ru`.
- Auth: Google → Supabase Auth.
- Database: Supabase PostgreSQL + RLS.
- GitHub CI: dependency install, typecheck, production build.

## Runtime work in strategy branch

**Нет.**

Запрещено в этом release unit:

- UI changes;
- migrations;
- production deployment;
- LLM infrastructure;
- Tribute integration;
- referral runtime implementation.

## Следующий этап после owner acceptance

Не начинать бессистемную сборку всех описанных функций сразу.

Следовать новой `ROADMAP.md`:

1. Canonical Domain Alignment;
2. Product-specific Episodes;
3. Metrics Engine;
4. Evidence + Micro-awareness;
5. Intervention Engine;
6. Outcome Learning;
7. Journey/Recovery/Together;
8. Referral;
9. Multi-channel;
10. Product Evidence Gate;
11. только затем Local LLM;
12. Donation Support — отдельным поздним gate.

Каждый этап — отдельный release unit с validation/rollback и AI audit trail.
