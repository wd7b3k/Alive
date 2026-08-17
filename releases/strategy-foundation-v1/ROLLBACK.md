# Strategy Foundation v1 — Rollback

## Runtime rollback

Not applicable. This release unit contains no runtime, database, infrastructure or deployment changes.

## Documentation rollback

If the strategy is rejected after merge:

1. revert the merge commit for the strategy foundation PR;
2. restore the previous canonical documentation set;
3. do not partially keep conflicting strategy fragments unless explicitly reviewed;
4. update `CURRENT_STATE.md` to describe the restored source of truth.

## Partial rollback warning

Do not revert only `PRODUCT_STRATEGY.md` while keeping the new `METHODOLOGY`, `ROADMAP`, `MODULES`, `DATA_MODEL`, `AGENTS.md` or technical strategy. The purpose of this release is to make those documents consistent as one foundation.

Preferred rollback unit: the complete PR.
