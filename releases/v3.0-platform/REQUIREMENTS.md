# ALIVE v3.0 Platform — требования и gates

Статус: `IN DEVELOPMENT`.

## Связанные гипотезы

- `H-ALIVE-001` — core behavioural loop;
- `H-ALIVE-002` — персонализация;
- `H-ALIVE-003` — Связки;
- `H-ALIVE-004` — Смыслы;
- `H-ALIVE-005` — UX comprehensibility;
- `H-ALIVE-007` — multi-product normalization;
- `H-ALIVE-008` — vape-specific model;
- `H-ALIVE-009` — NRT/food replacements;
- `H-ALIVE-010` — privacy trust.

`H-ALIVE-006 Together` не входит в v3.0.

## Functional requirements

### Foundation

- `FR-V3-001` REPO является единственным source of truth проекта.
- `FR-V3-002` Frontend воспроизводимо собирается из `app/`.
- `FR-V3-003` Схема PostgreSQL воспроизводится versioned migrations из `supabase/migrations/`.
- `FR-V3-004` Секреты отсутствуют в git и browser bundle; frontend использует только browser-safe publishable configuration.

### Identity / privacy

- `FR-V3-010` Вход через Google / Supabase Auth без собственного пароля ALIVE.
- `FR-V3-011` При первом входе автоматически создаётся внутренний профиль.
- `FR-V3-012` Display name/avatar берутся из identity metadata без hardcode людей.
- `FR-V3-013` Все private user-owned tables защищены RLS по `auth.uid()`.
- `FR-V3-014` Participant не может читать, создавать, изменять или удалять private rows другого participant.

### Onboarding / baseline

- `FR-V3-020` Новый пользователь выбирает целевые nicotine products.
- `FR-V3-021` Для каждого продукта задаётся `target_dependency` или `cessation_bridge`.
- `FR-V3-022` Baseline и cost defaults редактируются после onboarding.
- `FR-V3-023` Default hookah cost = 2500 RUB, но actual event cost редактируется.
- `FR-V3-024` Disposable quick reference = 5000 puffs / 1500 RUB, оба значения редактируются и маркируются как ориентир.

### Core behaviour loop

- `FR-V3-030` Craving flow: product → trigger → craving → need → 3 replacements → action → outcome.
- `FR-V3-031` Flow mobile-first и минимизирует действия в момент тяги.
- `FR-V3-032` Episode можно завершить как successful response, nicotine used или abandoned без shame language.
- `FR-V3-033` Craving before/after и helpfulness сохраняются как отдельные facts.

### Tobacco raw facts / units

- `FR-V3-040` Cigarette, hookah и vape сохраняются как разные raw events.
- `FR-V3-041` Raw vape puffs сохраняются независимо от derived ALIVE units.
- `FR-V3-042` `ALIVE Equivalence v1`: cigarette=1 unit, hookah session=10 units, vape puff=0.1 unit.
- `FR-V3-043` ALIVE units в UI всегда объясняются как behavioural heuristic, не medical harm/nicotine equivalence.
- `FR-V3-044` Изменение equivalence model не переписывает raw history.

### Replacements

- `FR-V3-050` Replacement Engine выдаёт максимум 3 релевантных candidate actions.
- `FR-V3-051` Ranking учитывает product/trigger/need/time и накопленный outcome, когда он доступен.
- `FR-V3-052` Food/drink replacements имеют eligibility/guardrails и не предлагаются бесконтрольно.
- `FR-V3-053` NRT spray/gum/patch являются intervention, а не relapse; ALIVE не назначает дозировки.
- `FR-V3-054` Vape имеет отдельные environment/interval replacement patterns.

### Personal content / UGC

- `FR-V3-060` Пользователь имеет CRUD собственных Смыслов.
- `FR-V3-061` Пользователь имеет CRUD собственных Связок.
- `FR-V3-062` Private Смысл/Связка не публикуется автоматически.
- `FR-V3-063` `Предложить в общую базу` создаёт отдельный UGC snapshot.

### Explainability / methodology

- `FR-V3-070` Правило `nothing unexplained` проверяется для каждого экрана.
- `FR-V3-071` Неочевидная сущность имеет short explanation + deeper help.
- `FR-V3-072` Страница `/experiment` объясняет гипотезу, ограничения, privacy, facts/hypotheses/heuristics.
- `FR-V3-073` ALIVE не делает медицинских обещаний.

### Data control

- `FR-V3-080` Ошибочный event можно удалить/исправить без порчи raw/derived integrity.
- `FR-V3-081` Пользователь может экспортировать свои данные.
- `FR-V3-082` Пользователь может инициировать удаление профиля и данных.

## Основные риски

- `RISK-V3-001` RLS misconfiguration → утечка sensitive данных другого пользователя. **Blocker.**
- `RISK-V3-002` Service/admin secret попал во frontend/git. **Blocker.**
- `RISK-V3-003` Google OAuth redirect/origin настроены неверно и login нестабилен.
- `RISK-V3-004` ALIVE units ошибочно воспринимаются как медицинская эквивалентность.
- `RISK-V3-005` Craving flow слишком длинный и не используется в реальной тяге.
- `RISK-V3-006` Food replacement превращается в автоматическое заедание.
- `RISK-V3-007` Vape model не соответствует непрерывному использованию электронки.
- `RISK-V3-008` Пользовательские UGC данные случайно публикуются без явного consent. **Blocker.**
- `RISK-V3-009` Dashboard/manual schema начинает расходиться с migrations в git.
- `RISK-V3-010` Слишком раннее инфраструктурное усложнение тормозит pilot.

## v3.0 release gate

Релиз нельзя считать готовым, пока:

1. app build/typecheck PASS;
2. полный local DB reset из migrations PASS;
3. Google login PASS минимум для двух пользователей;
4. automated RLS isolation test PASS;
5. onboarding/core flow PASS на mobile и desktop;
6. raw cigarette/hookah/vape events PASS;
7. `nothing unexplained` UX review PASS;
8. UGC explicit-consent test PASS;
9. export/delete basic tests PASS;
10. docs/current-state/release validation синхронизированы с кодом.
