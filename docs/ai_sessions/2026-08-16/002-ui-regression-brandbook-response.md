# Response

## Root cause confirmed

Git comparison from production baseline `86b4608` to the v3.1 branch showed that the approved `RedesignApp.tsx` was not incrementally extended. Instead a parallel `V31App.tsx` and `v31.css` were added and `main.tsx` was switched to the new root application shell

This caused both visual divergence and functional regressions despite successful TypeScript/build checks

## Immediate remediation completed

- restored active root rendering to `RedesignApp`
- removed `v31.css` from the active stylesheet chain
- retained a visible preview badge on branch previews
- kept v3.1 database, evidence, Myths, Facts, Together and security work in place for later safe integration

## Brand contract completed

Created `docs/BRANDBOOK.md` with canonical rules for:

- brand identity
- dark palette and exact v3.0 tokens
- typography
- spacing and radii
- Today hero hierarchy
- CTA semantics
- cards/surfaces
- Facts/Myths/Together styling
- Russian copy rules
- no points in UI headings
- mobile behavior
- motion
- logo
- navigation
- medical/evidence UI
- forbidden anti-patterns
- additive release rule
- visual/function regression gates
- future Web/Telegram/mobile identity consistency

## AI guardrails updated

`AGENTS.md` now:

- requires `docs/BRANDBOOK.md` before frontend/UI/client work
- treats v3.0 shell as a stable product contract
- forbids a new root shell or `main.tsx` switch without explicit owner approval
- forbids parallel base design systems
- requires functional and visual regression validation
- treats visual/product regression as FAIL even when typecheck/build pass

## Release state corrected

Created `releases/v3.1-behavioral-depth-together/UI_REGRESSION_AUDIT.md`

Updated `VALIDATION.md` to mark v3.1 frontend integration BLOCKED and list all v3.0 functionality that must remain intact

Updated draft PR #5 description to reflect the regression and reintegration requirement

## Next implementation rule

v3.1 UI features must be re-integrated directly into the approved v3.0 UI in small batches:

1. zero-layout-risk copy/data changes
2. craving modal refinements
3. Facts and Together routes using existing dark components
4. navigation review

No further parallel root shell development is allowed without owner approval
