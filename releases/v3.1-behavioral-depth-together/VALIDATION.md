# Validation ALIVE v3.1

Статус: **IN PROGRESS — CODE/DB GATES PASS, RUNTIME VISUAL GATES REMAIN**

## Database

- PASS — `v31_behavioral_content_schema` applied
- PASS — `v31_replacements_seed` applied
- PASS — `v31_myths_seed` applied
- PASS — `v31_facts_seed` applied
- PASS — `v31_together_aggregates` applied
- PASS — `v31_together_security_hardening` applied
- PASS — published catalog counts after migration: 75 Replacements / 19 Myths / 19 Facts
- PASS — 18 distinct replacement mechanisms present
- PASS — RLS enabled for `myths_catalog`, `facts_catalog`, `user_myth_state`
- PASS — content catalogs are read-only to ordinary authenticated clients
- PASS — `user_myth_state` own-user policies present
- PASS — authenticated Together smoke-test returned expected aggregate keys
- PASS — Together smoke-test rejected expected private-key patterns (`user_id`, `display_name`, `private_note`, `goal_text`)
- PASS — small cohort threshold = 3 for detailed baseline/mechanism aggregates

## Evidence

- PASS — nicotine cessation research document created
- PASS — separate Myths/outcome expectancies research created
- PASS — WHO/Cochrane/primary literature anchors documented
- PASS — A/B/C evidence distinction defined
- PASS — explicit rule against fabricated personal medical risk
- PASS — methodology synchronized with v3.1 evidence semantics
- PASS — hypotheses/metrics synchronized with Myths/Facts/Together/Replacement Engine v2

## Frontend CI

GitHub Actions run `31965095507`, job `95208940810`:

- PASS — locked dependency install
- PASS — TypeScript typecheck
- PASS — Vite production build

The job completed successfully on the v3.1 branch after the new shell, Facts/Myths/Together UI and Together security hardening were present.

## Cloudflare deployment

- PASS — Cloudflare Pages branch preview build/deploy reported successful by the official Cloudflare GitHub integration
- PASS — branch preview URL generated
- LIMITATION — current tool environment cannot directly establish a browser session to the Cloudflare preview hostname, so visual/runtime interaction has not been independently inspected from this session

## Frontend manual/runtime

- PENDING — guided flow interactive smoke-test in a real browser
- PENDING — clickable back-step/downstream invalidation interactive smoke-test
- PENDING — Facts/Myths source-link interaction
- PENDING — Together rendering with current one-person cohort and suppressed small-cohort state
- PENDING — profile start-year edit/preservation in authenticated browser
- PENDING — mobile 6-item navigation usability

Static/code-level checks already cover:

- PASS — six explicit guided steps exist
- PASS — product/trigger/need changes invalidate downstream replacement selection in code
- PASS — Replacement Engine v2 selects distinct mechanisms when possible
- PASS — product-aware Russian CTA exists
- PASS — contextual Myth selection respects private relevance and repetition penalty
- PASS — Facts page exposes source links

## Logo

- PASS — active entrypoint changed explicitly to `V31App`
- PASS — v3.1 CSS loaded after existing redesign CSS
- PASS — approved bundled `brand-logo-full.png` remains source asset
- PASS — CSS prevents zero/collapsed/invisible brand dimensions
- PASS — Cloudflare preview build contains the new v3.1 frontend commit chain
- PENDING — independent visual confirmation of unauthenticated login logo in deployed preview
- PENDING — independent visual confirmation of authenticated header logo in deployed preview
- PENDING — mobile visual smoke-test

Logo task therefore remains open until a real browser rendering is confirmed. Build success alone is not considered sufficient.

## Security

- PASS — no service role/token added to frontend/repo
- PASS — public Together contract is now `SECURITY INVOKER`
- PASS — privileged cross-user aggregation moved to unexposed `private` schema
- PASS — privileged internal function has `search_path=''`
- PASS — Together anonymous/public EXECUTE revoked
- PASS — only authenticated users can call public Together contract
- PASS — no user-level identifiers returned by Together contract
- PASS — Supabase Security Advisor no longer reports the Together SECURITY DEFINER warning
- KNOWN — Supabase Auth leaked-password protection warning remains; current product exposes Google OAuth only and no password login
- BLOCKED BY COHORT — two-user client-level RLS test for `user_myth_state`: current live project has only one profile, so no second real account exists to perform a non-fabricated cross-user client test

## Release / repo

- PASS — separate branch `agent/v3.1-behavioral-depth-together`
- PASS — draft PR #5 open
- PASS — release requirements documented
- PASS — rollback documented
- PASS — roadmap updated with v3.2 Admin + multi-client application layer
- PASS — data model updated
- PENDING — CURRENT_STATE final sync after all remaining runtime gates
- PENDING — final AI response/handoff document

## Release gate

Do **not** mark v3.1 RELEASED and do not merge solely because CI and database migrations pass.

Remaining hard gates:

1. real browser smoke-test of the branch preview;
2. visual confirmation of approved logo on login and authenticated shell;
3. mobile usability check;
4. second-user isolation test when a genuine second account exists or a dedicated safe test environment is created;
5. owner review of medically significant user-facing copy before final release promotion.
