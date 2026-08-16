# Validation ALIVE v3.1

Статус: **BLOCKED — UI REGRESSION FOUND, APPROVED v3.0 SHELL RESTORED FOR REINTEGRATION**

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
- PASS — hypotheses/metrics synchronized with Myths/Facts/Together/Replacement Engine concepts

## Frontend regression finding

Owner browser review found a blocking visual and functional regression in the first v3.1 frontend integration

Root cause:

- production v3.0 rendered `RedesignApp`
- v3.1 added a parallel `V31App`
- `main.tsx` was switched to `V31App`
- existing Today/UI behavior was therefore partially replaced instead of extended
- parallel `v31.css` introduced visual patterns that did not preserve the approved dark ALIVE language

This is a **FAIL** even though TypeScript and Vite build succeeded

See `UI_REGRESSION_AUDIT.md`

## Immediate remediation

- PASS — active `main.tsx` restored to production-approved `RedesignApp`
- PASS — parallel `v31.css` removed from active stylesheet chain
- PASS — DB/research/security work retained
- PASS — canonical `docs/BRANDBOOK.md` added
- PASS — `AGENTS.md` now requires Brandbook review before frontend work
- PASS — new root shell / global visual replacement moved behind explicit owner decision gate
- PASS — preview badge retained so branch preview cannot be confused with production

## Frontend integration status

The following v3.1 user-facing features must now be re-integrated incrementally into the approved v3.0 UI and are **not considered complete** merely because a previous implementation existed in inactive `V31App`

- PENDING — product-aware CTA integrated directly into approved Today
- PENDING — heading punctuation cleanup without layout rewrite
- PENDING — mechanism-aware Replacement ranking wired into existing flow
- PENDING — expanded Replacement presentation inside existing dark modal
- PENDING — brighter but brand-consistent progress indicator
- PENDING — clickable completed flow steps
- PENDING — contextual Myth reminder
- PENDING — Facts route using approved dark surfaces
- PENDING — Together route using approved dark surfaces
- PENDING — smoking start-year field integrated into existing onboarding/profile
- PENDING — lapse context-disruption copy integrated into existing flow
- PENDING — approved logo root-cause fix confirmed without replacing visual shell

## Existing v3.0 functionality regression gate

Before v3.1 can proceed, browser validation must confirm that the following existing behavior remains intact:

- main Today hero and visual hierarchy
- craving entry
- quick nicotine entry
- evening check-in
- pulse metrics
- baseline comparison
- Freedom Fund / existing economics metrics where present
- attention/trigger entry
- episode history
- delete/correction behavior
- Links
- Path
- Meanings
- Method
- Profile
- existing mobile navigation behavior

A v3.1 feature is not accepted if it removes or hides an existing v3.0 function

## CI

Previous frontend implementations passed locked install, TypeScript and Vite production build

These results remain useful as technical checks but no longer count as sufficient frontend validation

The restored-base branch must pass CI again after each incremental integration batch

## Cloudflare preview and OAuth

- PASS — stable Cloudflare branch preview exists
- PASS — OAuth preview redirect root cause identified
- PASS — owner configured the branch-preview origin in Supabase redirect allowlist
- PASS — authenticated preview now remains on the branch-preview hostname

## Logo

Logo remains an open acceptance item

Rules:

- approved asset must not be replaced
- fix must be applied inside the approved v3.0 shell
- build success is insufficient
- login and authenticated header require browser confirmation
- desktop and mobile require confirmation

## Security

- PASS — no service role/token added to frontend/repo
- PASS — public Together contract is `SECURITY INVOKER`
- PASS — privileged cross-user aggregation moved to unexposed `private` schema
- PASS — privileged internal function has `search_path=''`
- PASS — Together anonymous/public EXECUTE revoked
- PASS — only authenticated users can call public Together contract
- PASS — no user-level identifiers returned by Together contract
- PASS — Supabase Security Advisor no longer reports the Together SECURITY DEFINER warning
- KNOWN — Supabase Auth leaked-password protection warning remains; current product exposes Google OAuth only and no password login
- BLOCKED BY COHORT — two-user client-level RLS test for `user_myth_state` requires a genuine second account or dedicated safe test environment

## Brand and visual gate

The canonical visual baseline is:

- production commit `86b4608da61b34d6db14648a5d5f591ad6e63bcc`
- `app/src/RedesignApp.tsx`
- `app/src/redesign.css`
- `docs/BRANDBOOK.md`

v3.1 must look like the same product with more capability, not a redesign

## Release / repo

- PASS — separate branch `agent/v3.1-behavioral-depth-together`
- PASS — draft PR #5 remains open
- PASS — release requirements documented
- PASS — rollback documented
- PASS — UI regression audit documented
- PASS — roadmap retains v3.2 Admin + multi-client application layer
- PASS — brandbook and new AI guardrails committed

## Release gate

**Do not merge v3.1 in its current state**

Required before promotion:

1. re-integrate v3.1 UI changes into the existing v3.0 shell rather than parallel `V31App`
2. preserve every listed v3.0 function
3. owner visual review of desktop Today and craving flow
4. owner/mobile visual review
5. logo confirmation on login and authenticated header
6. Facts/Myths/Together visual review under the Brandbook
7. second-user isolation test when a genuine second account exists or a dedicated safe environment is available
8. owner review of medically significant user-facing copy
