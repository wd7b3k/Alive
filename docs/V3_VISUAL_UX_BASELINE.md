# Habitoff v3.0 — Visual / UX baseline

> **26.08.2026.** Визуальный baseline теперь описывается дизайн-системой:
> `docs/DESIGN_SYSTEM.md` — токены, шкалы, состояния, доступность;
> `docs/SCREENS.md` — по экранам; `docs/BRANDBOOK.md` — имя, знак, голос.
> Шкалы кегля, отступов и радиусов проверяются `app/src/redesign/css-invariants.test.ts`.
> Правила ниже (safe-area, 44×44, 48px, 16px от края, ширины QA) остаются в силе.


Status: **BLOCKING ACCEPTANCE CRITERION**.

## Reference

Canonical visual-quality reference for v3.0 is the approved Habitoff v2.7 production UI. v3 may change implementation and information architecture, but it must not regress in perceived quality, hierarchy, brand continuity or mobile ergonomics.

The v3.0 product alpha exposed a regression: generic oversized SaaS-like cards, excessive green cast, insufficient spacing around actions on mobile, controls too close to screen/system edges and loss of the approved Om identity. This class of regression blocks formal v3.0 release.

## Brand continuity

- **2026-08-26 (ADR-0003): бренд сменён, Om выведен из проекта по прямому запросу владельца.**
  `RELEASE_POLICY.md` §7 допускает это как явное исключение из immutable-правила.
  Om-ассеты `app/src/assets/om-mark.png` и `app/src/assets/brand-logo-full.png` удалены,
  оба канонических SHA-256 больше не описывают ничего существующего и удалены отсюда.
- Знак бренда теперь вектор: `app/src/assets/brand-mark.svg` (разомкнутое кольцо с точкой
  в разрыве) и `app/src/assets/brand-logo-full.svg` (знак + словесный знак Habitoff).
  Гейт SHA-256 заменён на проверку глазами: знак читается на 16, 32 и 56 px, точка
  в разрыве не сливается с кольцом, разрыв виден. Хэш вектора не фиксируем — SVG
  правится осмысленно, а не заменяется целиком, и хэш ломался бы на каждом пробеле.
- Не подменять знак Unicode-символом, знаком бесконечности или посторонней иконкой.
- Desktop uses the full logo; compact/mobile uses `brand-mark.svg`.
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
