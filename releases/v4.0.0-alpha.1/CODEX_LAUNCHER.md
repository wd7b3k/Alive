# Launcher для Codex — ALIVE 4.0.0-alpha.1

Этот файл используется как **первый prompt**, который получает Codex для реализации `4.0.0-alpha.1`.

Он намеренно короткий. Полная спецификация release живёт в `CODEX_PROMPT.md` и остальных канонических документах repository.

---

Работай с private repository `wd7b3k/Alive`.

Нужно реализовать первый пользовательский release новой серии:

**ALIVE `4.0.0-alpha.1`**

Ожидаемая base branch:

`agent/r1-data-evidence-admin`

Целевая рабочая ветка:

`agent/v4.0.0-alpha.1`

## ШАГ 0 — обязательный environment preflight

**Не читай release specification и не пытайся ничего реализовывать, пока не доказал, что repository реально доступен локально.**

Сначала выполни в shell:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git status --short --branch
test -f README.md
test -f AGENTS.md
test -d app
test -d docs
test -d releases
```

Убедись, что:

1. текущая рабочая директория находится внутри локального git checkout;
2. repository — именно `wd7b3k/Alive`;
3. доступны `.git`, `README.md`, `AGENTS.md`, `app/`, `docs/`, `releases/`;
4. `git status` работает;
5. можно выполнять локальные команды build/tests;
6. понятны текущая branch и expected base.

### Если локального checkout нет

**НЕМЕДЛЕННО ОСТАНОВИ ЗАДАЧУ.**

Ответ должен быть ровно по смыслу:

```text
BLOCKED: LOCAL_REPOSITORY_UNAVAILABLE

В текущем Codex Environment отсутствует локальный checkout wd7b3k/Alive.
Для этого release нужен repository environment с локальным git checkout.
GitHub Connector не используется как замена рабочей копии.
Код, schema и release-файлы не изменялись.
```

После такого blocker:

- не пытайся реконструировать repository через GitHub Connector;
- не реализуй release удалёнными GitHub API writes;
- не создавай «частичную версию» в `work/`, `outputs/` или другом временном каталоге;
- не обещай выполнить build/tests позднее;
- не продолжай задачу до корректного repository environment.

GitHub Connector можно использовать **только после успешного local preflight** как вспомогательный инструмент для PR, CI, remote metadata и review.

## После успешного preflight

Запиши в начало `releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md` фактический Environment Check:

```text
repository:
local root:
remote origin:
current branch:
expected base:
target branch:
working tree state:
Node/npm available:
browser QA capability:
Supabase capability, если требуется:
skills available:
```

Затем прочитай:

1. `README.md`
2. root `AGENTS.md`
3. применимые scoped `AGENTS.md`
4. `docs/CURRENT_STATE.md`
5. `docs/PROJECT_EVOLUTION.md`
6. `docs/PRODUCT_STRATEGY.md`
7. `docs/TECHNICAL_STRATEGY.md`
8. `docs/DEVELOPMENT_RULES.md`
9. `docs/CODEX_QUALITY_PROTOCOL.md`
10. `docs/CODEX_SKILL_ROUTING.md`
11. `docs/AGENT_CONTINUITY.md`
12. `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`
13. `docs/METHODOLOGY.md`
14. `docs/PRODUCT_PRINCIPLES.md`
15. `docs/DATA_MODEL.md`
16. `docs/ARCHITECTURE.md`
17. `docs/PRIVACY_AND_DATA.md`
18. `docs/HYPOTHESES_AND_METRICS.md`
19. `docs/ROADMAP.md`
20. `releases/v4.0.0-alpha.1/README.md`
21. `releases/v4.0.0-alpha.1/REQUIREMENTS.md`
22. `releases/v4.0.0-alpha.1/VALIDATION.md`
23. `releases/v4.0.0-alpha.1/ROLLBACK.md`
24. и полностью `releases/v4.0.0-alpha.1/CODEX_PROMPT.md`

После этого **не начинай с кода**.

Сначала полностью заполни:

`releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md`

и проверь свой план против Product Strategy, Requirements, Data Model, Privacy, Design Requirements и CURRENT_STATE.

## Skills

Если Skills доступны, используй `skills/alive-release-quality/SKILL.md` и подключай только релевантные специализированные skills согласно `docs/CODEX_SKILL_ROUTING.md`.

Особенно:

- Supabase/Postgres best practices — schema/RLS/SQL;
- browser/Playwright/Computer Use — реальный UX QA;
- GitHub/CI workflows — PR/checks/review;
- performance workflow — после preview и только на измеряемой проблеме;
- Cloudflare/Wrangler — только если действительно меняется Cloudflare runtime.

Отсутствие необязательного skill фиксируется как limitation. Отсутствие local repository checkout — blocker.

## Главный implementation principle

**Не пытайся сразу построить весь 4.0.**

Сначала полностью реализуй и фактически проверь mandatory vertical slice:

> **сигарета после еды → «Хочу закурить» → контекст → короткая микроосознанность из approved Факта/Мифа/Зачем → релевантное действие → outcome → время/деньги/≈здоровая жизнь → personal learning → корректная admin analytics**

До его end-to-end PASS не расширяй scope.

После PASS действуй строго по `CODEX_PROMPT.md` и `REQUIREMENTS.md`.

## Нельзя добавлять в этот release

- local LLM;
- внешнюю AI-зависимость core flow;
- Tribute;
- referral;
- Telegram;
- wearables/sensors;
- complex ML;
- paywall/subscription;
- public profiles/leaderboard;
- unrelated refactoring.

## Финальный стандарт

Никакую непроведённую проверку не называй PASS.

После реализации:

1. выполни programmatic validation;
2. проведи browser QA desktop/mobile, если capability доступна;
3. проведи adversarial self-review diff;
4. при доступности multi-agent review передай diff отдельному reviewer-agent;
5. исправь подтверждённые замечания;
6. обнови release docs, `CURRENT_STATE.md`, project evolution/decision docs при необходимости и AI audit trail;
7. создай draft PR;
8. не merge самостоятельно.

Финальный handoff:

- Environment
- Реализовано
- Что теперь может пользователь
- Проверено: PASS / FAIL / НЕ ПРОВЕРЕНО по каждому gate
- Не сделано
- Известные ограничения
- Changed files и зачем
- Branch / PR / commit
- Следующий минимальный шаг

**Цель — не самый большой 4.0, а первый 4.0, которому можно доверять.**
