# Changelog ALIVE v3.1

## Release candidate — 2026-08-16

### Added

- Product-aware Today CTA for cigarette, vape and hookah targets.
- Guided craving strength step, visible progress and clickable reached steps.
- Strict downstream invalidation when earlier guided answers change.
- Context/history/intensity-aware Replacement ranking with mechanism diversity.
- Contextual Myth reminder with private relevance state.
- Secondary Facts/Myths route with evidence levels and source links.
- Privacy-safe Together route with personal-first framing and cohort suppression.
- Optional cigarette start year, approximate duration and reference pack-years.
- Lapse context-disruption next experiment, including driving safety copy.
- Owner-approved bundled ALIVE logo.

### Preserved

- `RedesignApp` root and `redesign.css` design system.
- Four main navigation sections.
- All guarded v3.0 baseline capabilities.
- Raw tobacco/event semantics and existing Supabase contracts.
- Production/main state.

### Validation

- UI contract: PASS.
- TypeScript typecheck: PASS.
- Vite production build: PASS.
- Public branch-preview responsive smoke: PASS at 390, 820 and 1440 widths.
- Owner login/authenticated desktop/mobile logo/header gate: PASS.
- Automated test suite: not configured in `app/package.json`.
- Full authenticated regression matrix: pending.
- Final owner RC visual approval: pending.

### Commits

- `15d6a49` — owner-approved logo.
- `9c28b18` — product-aware CTA.
- `669a1aa` — guided progression and invalidation.
- `5c89d94` — Replacement Engine ranking/diversity.
- `04ea268` — contextual Myths.
- `d1b3eca` — Facts/Myths knowledge route.
- `49a7b65` — privacy-safe Together.
- `c7af299`, `03ef5bd`, `376ea34` — start-year slice and JSX fixes.
- `c598667` — lapse context disruption.

### Release state

Draft PR #5 remains unmerged. Branch preview is not production. Promotion requires the remaining gates in `VALIDATION.md`.
