# Strategy Foundation v1 — Validation

## Scope validation

Expected diff is documentation-only.

Must contain no changes under:

- `app/`;
- `supabase/migrations/`;
- runtime deployment config;
- production secrets/config values.

## Consistency checks

Before owner acceptance verify:

- `PRODUCT_STRATEGY.md` is the product source of truth;
- `TECHNICAL_STRATEGY.md` explicitly derives from product strategy;
- `METHODOLOGY.md` separates evidence, heuristics and hypotheses;
- `PRODUCT_PRINCIPLES.md` does not require long craving flows;
- `MODULES.md` makes Replacement a subset of Intervention;
- `DATA_MODEL.md` supports product-specific events, evidence, goals, referral and versioned metrics;
- `ROADMAP.md` places local LLM after product evidence gate;
- `PROJECT_CHARTER.md` allows future voluntary donations but not paywall/data monetization;
- `AGENTS.md` forces future AI/Codex to read the new strategy before code;
- `RELEASE_POLICY.md` supports documentation-only foundation units;
- Health Minutes are consistently described as approximate/versioned heuristic;
- ALIVE units are never described as medical harm equivalence;
- referral is never allowed to interrupt strong craving/lapse/crisis/treatment decisions.

## Runtime validation

No runtime validation/build is required to prove code correctness because this release changes no runtime files.

However, the final Git diff must be checked to ensure scope remained documentation-only.

## Acceptance

Owner review required before merge.

Merge does not deploy or change production behaviour.
