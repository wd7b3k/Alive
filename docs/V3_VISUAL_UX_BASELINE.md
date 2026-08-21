# ALIVE v3.0 — Visual / UX baseline

Status: **BLOCKING ACCEPTANCE CRITERION**.

## Reference

Canonical visual-quality reference for v3.0 is the approved ALIVE v2.7 production UI. v3 may change implementation and information architecture, but it must not regress in perceived quality, hierarchy, brand continuity or mobile ergonomics.

The v3.0 product alpha exposed a regression: generic oversized SaaS-like cards, excessive green cast, insufficient spacing around actions on mobile, controls too close to screen/system edges and loss of the approved Om identity. This class of regression blocks formal v3.0 release.

## Brand continuity

- Approved Om logo is immutable unless the owner explicitly requests a brand change.
- Do not regenerate, redraw, approximate or replace the Om with a Unicode symbol, infinity sign or unrelated icon.
- **2026-08-21 owner decision**: none of the previously documented canonical hashes below matched any asset ever present in the runtime (the shipped `brand-logo-full.png` was a corrupted file, SHA-256 `110738ee37aef8b4486b777b3e2d3f5004a5f254582b464f0f265495997f8ce3`, undecodable). Per direct owner command, the brand lockup was replaced with the owner's own supplied reference artwork (Om symbol + "ALIVE" wordmark, traditional-forms/modern-art fusion), not an AI-generated redraw. Canonical hashes below updated accordingly; this is an explicit brand-identity decision by the owner, not an AI-initiated substitution.
- Canonical Om-only mark SHA-256: `b479fafb36ad49adf6d6895746885d95f41d33128c3c846d00011905546547e1` (`app/src/assets/om-mark.png`, 1024×1024, cropped from the owner-supplied artwork).
- Canonical full ALIVE logo SHA-256: `37b33ba0664db913ee054f0b2f46a1171583225276ff968fe03a2a75ab6966c9` (`app/src/assets/brand-logo-full.png` / `app/public/brand-logo-full.png`, 2031×699, owner-supplied artwork).
- Desktop may use the full logo or Om + wordmark; compact/mobile uses the Om mark.
- Hero/watermark usage must be subtle and subordinate to content.

## Visual language

Target: calm premium, dark, dense enough to feel like a real personal instrument rather than a marketing landing page.

- neutral graphite / near-black foundation rather than a green-tinted surface everywhere;
- teal/lime are accents, not the background identity of every component;
- restrained shadows and thin borders;
- smaller, more deliberate radii than generic 24–30 px cards everywhere;
- typography hierarchy remains strong, but analytical/product screens do not use oversized landing-page headlines;
- information density on desktop should be comparable to or better than v2.7;
- whitespace separates meaning and actions, not merely enlarges cards.

## Mobile safe zones — hard rule

Mobile is the primary real-time craving surface.

Every interactive screen must respect:

- `env(safe-area-inset-top/right/bottom/left)`;
- minimum 16 px visual inset from viewport edges in addition to relevant safe-area inset;
- minimum 48 px touch height for primary/secondary actions and navigation targets;
- minimum 44×44 px touch target for icon-only controls;
- minimum 12 px gap between independent actions;
- minimum 16 px gap between primary and destructive actions;
- destructive actions must never sit immediately adjacent to the primary continuation action;
- bottom-fixed navigation/actions require bottom padding `safe-area + 12–16 px`;
- page content must include enough bottom padding that the fixed bottom nav never covers the last actionable element.

## Modal / craving flow ergonomics

- modal uses `100dvh`, not legacy `100vh`, where dynamic browser chrome matters;
- long flows scroll inside a bounded content area;
- modal action/footer zone has its own breathing room and safe-area bottom inset;
- closing control must be at least 44×44 px;
- on mobile, primary actions stack vertically where necessary and fill available width;
- action footer may be sticky only with an opaque/blurred backing surface so content never visually collides with controls;
- no action cluster may touch the viewport/browser edge.

## Navigation

Desktop:
- brand remains visible and recognisable;
- navigation is compact and instrument-like;
- profile/avatar is visually secondary.

Mobile:
- bottom navigation is allowed, but must be safe-area aware;
- labels remain readable without horizontal clipping;
- critical craving action stays more visually important than navigation chrome.

## Screen-level acceptance

Before v3.0 release visually inspect at minimum:

- Google login;
- onboarding;
- Today;
- guided craving flow at every step;
- quick nicotine log;
- Links;
- Path;
- Meanings;
- Experiment;
- Releases;
- Profile / baseline;
- evening check-in;
- empty states;
- destructive confirmation flows.

Test widths:

- 360 px;
- 390–430 px;
- 768–820 px;
- 1280 px;
- 1440+ px.

## Release gate

`v3.0` is not release-ready while any of these are true:

- approved Om is absent or substituted;
- a primary/destructive action lacks a safe zone;
- fixed navigation overlaps content/actions;
- touch targets are undersized;
- mobile modal controls collide with browser/system areas;
- visual hierarchy is materially worse than v2.7;
- desktop experience looks like an enlarged mobile layout instead of a rich analytical product.
