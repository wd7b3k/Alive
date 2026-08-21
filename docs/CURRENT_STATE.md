# Текущее состояние ALIVE

## Статус

ALIVE — самостоятельный private repository `wd7b3k/Alive`.

Текущая стадия: **ALIVE v3.0 — PRODUCT ALPHA / IN DEVELOPMENT**.

`wd7b3k/Alive` — единственный source of truth. Код, migrations, product rules и release gates меняются сначала в repo; Dashboard/чат не переопределяют repo.

## Живая инфраструктура

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Текущий production host: `https://alive-aw2.pages.dev`.
- Planned canonical host: `https://alive.hmnos.ru`.
- Auth: Google → Supabase Auth.
- Database: Supabase PostgreSQL + RLS.
- Supabase project: `xkigijaqimzuveyzyzyk`, `eu-west-1`.
- GitHub CI: Node `22.12.0`, `npm ci`, `typecheck`, production build.

Google OAuth проверен реальным входом: Auth user и ALIVE profile автоматически создаются, display name/avatar приходят из Google metadata.

## Ключевое решение после первого platform bootstrap

Первый web-shell был технически рабочим, но продуктово значительно беднее legacy v2.7. Это признано regression.

Создан обязательный baseline `docs/V3_PARITY_BASELINE.md`:

**v3.0 не может считаться готовым, если новый пользователь получает менее глубокий продукт, чем v2.7.**

Новая архитектура должна сохранить минимум глубины v2.7 и добавить утверждённые возможности v3.

## Реализовано на `main`

Код прошёл путь `v3.0-platform` → `v3.0-hardening` → `v3.0-redesign` и на 2026-08-15
слит в `main` (tip `86b4608`) линейными коммитами. Разработка сейчас ведётся не в
ветке `v3.0-platform` (она отстаёт от `main`) — см. подробный снимок веток и открытый
вопрос по фактическому PR-статусу в `docs/INFRASTRUCTURE_STATE.md`.

### Product UI

- universal onboarding / personal baseline;
- cigarette / hookah / vape как отдельные raw products;
- product role: `target_dependency` / `cessation_bridge`;
- Сегодня — action screen, current metrics, attention links, recent episodes;
- guided craving flow: product → trigger → need → 3 contextual replacements → outcome;
- quick nicotine fact logging без выдумывания craving score;
- evening check-in;
- Связки — automatic trigger map + private user Links;
- Смыслы — global universal catalog + private CRUD/UGC workflow;
- Путь — 7-day динамика, raw products, personal replacement effectiveness, Freedom Fund, rewards;
- Profile/baseline;
- Эксперимент — methodology, assumptions, limitations, privacy;
- Релизы;
- deletion of erroneous/test episode with recalculation from remaining facts;
- inline explanations / `nothing unexplained` pattern.

### Content depth

Remote catalog after product-depth migrations:

- 28 published triggers;
- 74 published replacements;
- 96 trigger→replacement relations;
- 13 universal Meanings;
- 5 universal identity scripts;
- 13 support messages;
- 7 rewards.

Counts corrected 2026-08-21 after QA against the live deployment found two
byte-identical duplicate catalog entries — the same trigger under `morning`/`wake_up`
and the same replacement under `water`/`water_pause`, each a legacy row from the
initial migration that the later product-depth catalog superseded but never retired.
The previously documented 29/46 counted those duplicates. Migration
`20260821120000_v3_dedupe_legacy_morning_trigger.sql` re-points existing history onto
the canonical codes and drops the orphans; the 96 relations are unaffected (all of
them already pointed at the canonical codes). It was applied to the production project
on 2026-08-21 by the owner.

The replacement count then rose from 45 to 74 for a different reason: applying that
migration surfaced that the production database had diverged from this repository
altogether. 29 replacements existed only in production, three rows had been retitled
there, evidence/curation metadata was present on every production row but absent from
the repo, and 20 columns across `replacements_catalog`, `triggers_catalog` and
`episodes` had been added straight to production. None of it had ever been captured as
a migration, so the "repo is the single source of truth" rule above had quietly stopped
holding.

Per the owner's decision (2026-08-21) production is authoritative, and migrations
`20260821130000_v3_sync_production_schema_drift.sql` (columns) and
`20260821140000_v3_sync_production_catalog_content.sql` (values) bring this repository
back in line with it. Verified by rebuilding a database from these migrations and
comparing it against production field-by-field: aggregate SHA-256 over all 74
replacements' base fields, over their metadata, and over the trigger catalog all match
production exactly. Both migrations are idempotent and are a no-op against production.

Legacy personal biography is intentionally not promoted into global content. Private personal content belongs to the individual user profile.

### Data / privacy

Applied remote migrations:

1. `v3_platform_initial`
2. `v3_platform_security_indexes`
3. `v3_product_depth_schema`
4. `v3_product_depth_catalog_a`
5. `v3_product_depth_catalog_b`
6. `v3_product_depth_mapping`
7. `v3_product_depth_meaning`
8. `v3_support_state_and_account_control`
9. `v3_remove_public_account_delete_rpc`

RLS protects private user-owned entities. Service-role/OAuth secrets are not stored in frontend/repo.

A proposed public `SECURITY DEFINER` self-delete RPC was rejected after Security Advisor flagged the exposed surface. It was removed by migration before alpha merge. Account deletion will use an authenticated Edge Function instead.

Current Supabase Security Advisor has one remaining Auth warning: leaked-password protection is disabled. ALIVE currently exposes Google OAuth only, not password sign-in, so the warning does not represent an active password-login surface. Revisit before ever enabling password auth.

## CI state

Latest rich product frontend commit passes:

- locked dependency install — PASS;
- TypeScript typecheck — PASS;
- Vite production build — PASS.

## Still required before v3.0 can be called RELEASED

- real runtime smoke-test of new deep UI (partial progress 2026-08-20: pre-login
  screens only — `/`, `/experiment`, `/releases` — smoke-tested locally at all 5
  required viewport widths against a real build of the current commit; a mobile
  safe-zone bug found and fixed — see `releases/v3.0-platform/VALIDATION.md`; the
  screens behind Google login remain untested);
- full user Link edit/disable controls (create/delete/UGC already implemented);
- background NRT patch UI (DB/RLS support exists);
- user data export UI (data-layer function `exportMyData()` implemented 2026-08-20 in
  `app/src/actions.ts`, typecheck/build PASS; no UI button wired up yet — deliberately
  left for a separate, reviewable change);
- authenticated Edge Function for full account deletion (code written 2026-08-20 —
  `supabase/functions/delete-account/index.ts` — not deployed, not tested against a
  live project, no UI wired up; see `releases/v3.0-platform/VALIDATION.md` for detail);
- two-user RLS isolation test (strong local evidence added 2026-08-20 via
  `supabase/tests/local/run.sh` against real migrations on disposable Postgres — not a
  substitute for the live two-Google-account smoke test; see VALIDATION.md);
- local full DB reset from migrations;
- mobile/desktop parity review;
- `alive.hmnos.ru` DNS/custom-domain cutover;
- validation/docs sync.

`Together` remains v3.1. Admin/Product Intelligence remains v3.2.

## Release discipline

Deploying a v3.0 alpha for real testing does **not** mean the release gate is complete. `v3.0 RELEASED` is reserved until `releases/v3.0-platform/REQUIREMENTS.md` and `VALIDATION.md` pass.
