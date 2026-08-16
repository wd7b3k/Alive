# Validation ALIVE v3.1

Статус: **IN PROGRESS**

## Database

- PASS — `v31_behavioral_content_schema` applied
- PASS — `v31_replacements_seed` applied
- PASS — `v31_myths_seed` applied
- PASS — `v31_facts_seed` applied
- PASS — `v31_together_aggregates` applied
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

## Frontend

- PENDING — GitHub Actions `npm ci`
- PENDING — TypeScript typecheck
- PENDING — Vite production build
- PENDING — guided flow manual smoke-test
- PENDING — clickable back-step/downstream invalidation smoke-test
- PENDING — Facts/Myths source links
- PENDING — Together rendering with suppressed small cohort
- PENDING — profile start-year edit/preservation
- PENDING — mobile 6-item navigation usability

## Logo

- PASS — active entrypoint changed explicitly to `V31App`
- PASS — v3.1 CSS loaded after existing redesign CSS
- PASS — approved bundled `brand-logo-full.png` remains source asset
- PASS — CSS prevents zero/collapsed/invisible brand dimensions
- PENDING — production asset request
- PENDING — unauthenticated login visual smoke-test
- PENDING — authenticated header visual smoke-test
- PENDING — mobile production smoke-test

## Security

- PASS — no service role/token added to frontend/repo
- PASS — Together endpoint has `search_path=''`
- PASS — Together anonymous/public EXECUTE revoked
- PASS — only authenticated EXECUTE granted
- PASS — no user-level identifiers returned by Together contract
- PENDING — two-user client-level RLS test for `user_myth_state`

## Release gate

Do not mark v3.1 RELEASED and do not merge solely on database success. Frontend CI, runtime and logo gates remain mandatory.
