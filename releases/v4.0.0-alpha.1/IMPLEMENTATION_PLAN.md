# Implementation Plan — ALIVE 4.0.0-alpha.1

Статус: **preflight завершён; план зафиксирован до первого изменения runtime-кода**.

Последнее обновление: 2026-08-17.

## Environment preflight

- repository: wd7b3k/Alive
- execution mode: Direct GitHub Mode
- base branch: agent/r1-data-evidence-admin
- target branch: agent/v4.0.0-alpha.1
- repository read access: PASS
- repository write access: PASS
- target state before work: уникальных изменений относительно base не было; target отставала на процессные документы Direct GitHub Mode
- CI capability: GitHub Actions frontend workflow доступен; до alpha.1 он проверяет typecheck и production build, test step будет добавлен вместе с pure logic
- browser capability: in-app browser доступен
- preview capability: НЕ ПРОВЕРЕНО; URL preview ещё не создан
- Supabase capability: connector доступен; project xkigijaqimzuveyzyzyk ACTIVE_HEALTHY
- Supabase readiness: FAIL для R1 — remote содержит migrations только до v3.1, R1 tables отсутствуют
- Supabase development branch: не создана; подтверждённая стоимость 0.01344 USD/час требует owner cost gate
- local checkout / local Node: отсутствуют и не требуются в Direct GitHub Mode
- relevant skills: alive-release-quality, GitHub, Supabase; browser подключается после preview; web-perf только после измеряемого preview; Cloudflare skills не нужны, пока runtime/config Cloudflare не меняется
- known limitation: до отдельной development DB canonical persistence/RLS/admin E2E нельзя честно назвать PASS; live schema не изменяется

## Я понял ALIVE так

ALIVE — персональная система освобождения от никотиновой зависимости, а не quit-counter и не каталог общих советов.

Каноническая цепочка: **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**.

Цель alpha.1 — впервые связать эту цепочку в одном реальном пользовательском моменте. North Star остаётся Sustained Freedom Rate; engagement и число открытий не считаются доказательством пользы.

Release нужен сейчас, потому что R1 уже описывает Evidence Registry, contextual content, deterministic learning и admin observability, но активный frontend всё ещё показывает старую модель «ситуация → потребность → три Замены» и не использует эти контракты end-to-end.

Ограничения: privacy by default, evidence first, никакого LLM в core, никакой медицинской эквивалентности продуктов, quick log отдельно от помощи при тяге, rollback через branch/commits и неприменение schema к live без database gate.

## Пользовательская проблема

В момент после еды пользователь видит длинный wizard и общий список действий. Он не получает короткого approved напоминания, не понимает реальную причину рекомендации, не видит немедленный результат в трёх метриках и не получает объяснимого personal learning.

## Гипотеза

Если после одного выбора контекста ALIVE покажет одну короткую approved микроосознанность, затем объяснимо ранжированное действие и после outcome покажет конкретный результат и обновлённое обучение, пользователь быстрее перейдёт от автоматизма к осознанному выбору без shame и без зависимости core flow от AI.

## Exact scope

### Checkpoint A — R1 readiness

1. Проверить repo migrations, фактический remote schema и RLS/advisors.
2. Не применять R1 к live project.
3. Для E2E использовать отдельную Supabase development branch только после cost confirmation.
4. До development DB разрешены code/CI проверки, но DB и browser E2E остаются НЕ ПРОВЕРЕНО.

### Checkpoint B — contracts и tests

1. Добавить testable pure modules для freedom metrics, awareness selection/fatigue, deterministic intervention ranking, analytics mapping и product semantics.
2. Добавить минимальный Node test runner без тяжёлого test stack.
3. Подключить tests в GitHub Actions.

### Checkpoint C — mandatory cigarette slice

Реализовать только:

сигарета после еды → Хочу закурить → выбор/распознавание контекста after_meal → одна approved микроосознанность → одно объяснимое действие → outcome → feedback по времени/деньгам/≈здоровой жизни → обновлённая learning projection → structured admin analytics.

До фактического PASS этого пути не расширять runtime scope на vape/hookah.

### Checkpoint D — expansion после PASS C

Только после E2E PASS canonical slice:

- vape: обращение к устройству, интервал/затяжки, distinct copy, без cigarette Health Minutes;
- hookah: pre-session decision, social/ritual context, session duration/cost, без cigarette Health Minutes;
- полная поверхность Зачем: create/edit/hide/activate и contextual use;
- дополнительные awareness contexts и outcome states из REQUIREMENTS.

### Checkpoint E — admin/analytics

Admin должен различать first useful response, awareness, intervention, outcome, abandonment, quick use и product slice. Загружаются только structured fields; private free text не читается.

### Checkpoint F — QA/self-review

CI, development DB/RLS/advisors, preview browser desktop/mobile, loading/empty/error/retry/delete, performance при наличии preview, adversarial diff review, independent review.

## Non-goals

- local или внешний LLM как core dependency;
- Tribute, referral, Telegram;
- Together redesign;
- wearables/sensors;
- complex ML;
- paywall/subscription;
- public profiles/leaderboard;
- изменение brand/logo;
- unrelated refactor;
- новые медицинские claims или изменение Health Minutes coefficient;
- применение R1/alpha schema к live без отдельного gate.

## Mandatory vertical slice: data transitions

1. Home показывает CTA Хочу закурить и три metrics.
2. Открытие пишет craving_flow_opened без private text.
3. Product cigarette выбирается явно или из единственного target product.
4. Контекст after_meal пишет context_selected.
5. Selector выбирает один published awareness_content по product/context/moment и исключает недавно показанное; при отсутствии approved content может использовать только активное личное Зачем, не выдавая это за medical claim.
6. Показ создаёт content_impressions и structured awareness_shown; feedback обновляет useful и пишет awareness_feedback.
7. Intervention Engine фильтрует product/eligibility/settings, учитывает intervention_context_rules, prepared response, user preference и user_replacement_stats только при достаточном числе outcomes.
8. UI показывает Почему это: factual personal explanation только при реальных observations; иначе честное context-based explanation.
9. Выбор пишет intervention_selected; episode сохраняется с episode_kind=craving; action — отдельно в episode_actions; tobacco_event создаётся только при nicotine_used.
10. Outcome writes не включают notes, goal body или Link text в analytics.
11. DB trigger/rebuild обновляет user_trigger_stats и user_replacement_stats.
12. Feedback показывает episode delta и пересчитанные cumulative metrics.
13. Admin видит structured funnel и не читает private Goals/Links/notes.
14. QuickUse сохраняется с episode_kind=quick_use и не создаёт craving/intervention events.

## Product invariants

- primary CTA ровно Хочу закурить;
- user/admin UI на естественном русском;
- новая поверхность использует Зачем, не Смыслы;
- три metrics постоянно доступны;
- Health Minutes model v1: только prevented cigarettes × approved 20-minute population heuristic; всегда знак ≈, caveat и coverage;
- cigarette ritual time v1 использует documented 11-minute default только там, где personal duration отсутствует, и явно маркирует default;
- vape/hookah никогда не проходят через cigarette Health Minutes;
- quick log не считается craving help;
- НЗТ — action/treatment support, не smoking lapse;
- private goal/link/note text не попадает в analytics metadata;
- medical copy только из published awareness_content с approved evidence claim;
- deterministic fallback стабилен и наблюдаем;
- без personal outcomes нет формулировки «тебе помогает»;
- correction/delete пересчитывает metrics из raw data и DB learning projection;
- participant не читает чужие private data или admin aggregates;
- один основной тезис awareness и один primary CTA на шаг;
- network failure не создаёт выдуманный контент или fake success.

## Затрагиваемые модули

- app/src/data.ts: typed R1 reads/writes и explicit episode kind.
- app/src/release4-domain.ts: pure metrics/ranking/awareness/analytics/product semantics.
- app/src/release4-domain.test.ts: domain tests.
- app/src/RedesignApp.tsx: canonical flow, CTA, metrics, Зачем terminology, feedback states.
- app/src/metrics.ts: reuse existing raw/baseline helpers без параллельной ALIVE-units medical model.
- app/src/AdminDashboard.tsx и app/src/admin-data.ts: structured alpha funnel.
- app/src/redesign.css: scoped alpha UI states.
- app/package.json, package-lock.json при необходимости, frontend-ci.yml: test command/gate.
- release/docs/audit files: plan, validation, current state, handoff.

## Затрагиваемая схема/API

Новая migration на Checkpoint C пока не планируется: используются существующие R1 contracts из base.

Read:
- profiles, user_settings, user_nicotine_products;
- triggers_catalog, replacements_catalog, trigger_replacement_map;
- intervention_context_rules, user_replacement_preferences;
- awareness_content, awareness_content_contexts, content_impressions;
- user_goals плюс legacy user_meanings/goal_text;
- user_trigger_stats, user_replacement_stats;
- episodes, episode_actions, tobacco_events.

Write:
- episodes;
- episode_actions;
- tobacco_events только для состоявшегося употребления;
- content_impressions;
- analytics_events со structured allowlist;
- user_goals для новой поверхности Зачем.

Если R1 contract окажется недостаточным, сначала обновляется этот plan и применяется Supabase/Postgres review до SQL.

## Existing-data compatibility

- user_meanings не удаляются; R1 migration копирует их в user_goals idempotently и сохраняет source_meaning_id.
- goal_text остаётся fallback Зачем до явного пользовательского редактирования.
- existing episodes/actions/tobacco_events остаются raw source of truth.
- episode_kind unknown сохраняется для legacy compatibility; новые guided/quick writes задают kind явно.
- legacy Facts/Myths state не удаляется; alpha awareness читает только approved awareness_content.
- baseline/defaults остаются в user_nicotine_products; raw history не переписывается при model updates.
- удаление episode soft-delete сохраняется; metrics вычисляются без deleted rows, DB learning rebuild уже описан R1 migration.

## Analytics contract

Allowlist event names:

- craving_flow_opened: surface, product_type если известен.
- product_selected: product_type.
- context_selected: product_type, trigger_code.
- first_useful_response: product_type, trigger_code, content_code или без code для personal_goal; без goal text.
- awareness_shown: product_type, trigger_code, content_code.
- awareness_feedback: content_code, numeric_value 1/0.
- intervention_shown: product_type, trigger_code, replacement_code.
- intervention_selected: product_type, trigger_code, replacement_code.
- intervention_completed: episode_id, replacement_code.
- outcome_saved: episode_id, product_type, trigger_code, replacement_code, outcome.
- flow_abandoned: structured reason_code и stage.
- freedom_metrics_visible: только model_version/coverage, без private data.
- use_episode_logged: quick use only; не входит в craving funnel.

Запрещённые analytics payload: private_note, custom goal title/body, Link title/situation/impulse, free-text reason, UGC content.

## Evidence/content contract

Используется только published awareness_content, связанный с evidence_claims status=проверено через существующий R1 contract.

Canonical after_meal имеет approved mapping fact_move_through_craving; safe catalog fallback выбирается только из published content для cigarette.

Health Minutes использует approved claim cigarette_life_minutes_2025 и model id cigarette-health-minutes-v1-2025-uk. UI показывает caveat: средняя популяционная оценка, не персональный прогноз.

Новые medical claims и коэффициенты не создаются.

## Freedom metric model для alpha.1

Метрики считаются из подтверждённых successful_response и personal baseline с верхней границей доступного counterfactual, чтобы не считать больше предотвращённых событий, чем допускает baseline.

- Time: confirmed prevented cigarette × personal ritual_minutes; если нет, documented default 11; hookah/vape включаются только при наличии собственного duration model.
- Money: prevented product unit × personal cost model; без цены value не выдумывается.
- Health Minutes: confirmed prevented cigarette × 20; vape/hookah coverage=not_covered.
- Correction/delete: pure calculation заново строится из non-deleted raw episodes/events.
- UI раскрывает coverage и model version; ALIVE units не участвуют.

## Testing strategy

Node built-in test runner с TypeScript type stripping на Node 22.12, без новой тяжёлой dependency.

Обязательные tests:
- time/money/health calculations и missing baseline/cost;
- cigarette-only Health Minutes coverage и caveat;
- correction/delete recompute;
- context/product eligibility;
- sufficient-data threshold и truthful intervention explanation;
- deterministic fallback;
- awareness context match, fatigue и personal-goal fallback;
- analytics allowlist/metadata privacy;
- cigarette/vape/hookah semantics;
- quick_use не маппится в craving events.

Remote validation:
- npm ci;
- npm run typecheck;
- npm test;
- npm run build;
- GitHub Actions на PR.

DB validation после development branch:
- sequential R1 migrations;
- owner CRUD;
- cross-user/anon denial;
- trigger/rebuild;
- analytics privacy;
- security/performance advisors.

Browser после preview:
- canonical desktop/mobile;
- loading/empty/error/retry;
- delete/correction;
- admin boundary.

## Skills/tools routing

- alive-release-quality: активен; задаёт vertical slice/checkpoints/handoff.
- GitHub connector: read/write, commits, diff, CI, draft PR.
- GitHub yeet: local-only prerequisites неприменимы; используется connector-equivalent по Direct GitHub Mode.
- Supabase skill: активен; changelog/docs сверены, project/migrations/tables/advisors inspected.
- Supabase Postgres best practices: подключить только при новой migration/schema review.
- browser: подключить после preview.
- web-perf: только после preview и измеряемой проблемы.
- Cloudflare/Wrangler: не использовать без runtime/config change.

## Checkpoints и stop conditions

### A — R1 readiness

Repo contract: PASS. Remote development DB: FAIL/ожидает cost gate.

### B — contracts/tests

PASS: plan committed before runtime; pure domain contracts implemented; typecheck, 10/10 tests and production build passed in the validation mirror.

### C — canonical cigarette slice

Runtime implementation and programmatic checks: PASS. Development DB persistence, learning rebuild, admin rows and authenticated desktop/mobile browser path: НЕ ПРОВЕРЕНО. Не расширять scope до их фактического PASS.

### D — vape/hookah semantics

Заблокирован до PASS C.

### E — admin/analytics

Canonical admin slice входит в C; широкий product expansion после C.

### F — QA/self-review

Adversarial self-review: PASS после трёх исправлений. Independent review: в работе. Preview/browser/performance: НЕ ПРОВЕРЕНО.

## Validation commands

GitHub Actions, working-directory app:

npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build

CI workflow должен запускаться на pull_request при изменениях app/** или workflow.

## Rollback / forward-fix

- До merge: закрыть draft PR или не merge target branch.
- Runtime: revert соответствующий small commit; R1 base contracts не удалять.
- Feature behavior: deterministic fallback позволяет отключить awareness/personal ranking без LLM.
- DB: live project не изменяется; development branch можно удалить после validation.
- R1 migrations additive; rollback live требует отдельного review, предпочтителен forward-fix.
- User data: никаких destructive transforms; legacy data сохраняются.
- При partial write UI показывает ошибку и не объявляет outcome saved; cleanup/forward-fix должен быть наблюдаем.

## Unknown assumptions / open gates

- Owner ещё не подтвердил Supabase development branch cost 0.01344 USD/час.
- Preview provider/URL и environment variables target branch пока неизвестны.
- GitHub connector не даёт compare/commit endpoints из-за integration permissions; snapshot diff выполняется по repository file SHA, PR diff — после открытия PR.
- Точная доступность authenticated test users для browser QA неизвестна.
- Текущий remote project не является безопасным местом для R1 validation.
- Expansion scope остаётся заблокированным до canonical PASS.

## Проверка плана против канонических документов

- Product Strategy: сохраняет цепочку Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода.
- Requirements: primary CTA, три metrics, approved awareness, deterministic engine, analytics/admin, Russian UI и product-specific stop gate отражены.
- Data Model: raw facts отдельно от rebuildable learning; versioned metric coverage; legacy compatibility сохранена.
- Privacy: generic analytics structured-only; private Goals/Links/notes исключены.
- Design Requirements: high-load flow сокращён, один primary action, progressive disclosure, mobile/desktop QA.
- CURRENT_STATE: строится поверх R1 contracts; remote R1 gap явно зафиксирован.
- Validation: все required gates перечислены и не объявлены PASS заранее.
