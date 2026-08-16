# UI regression audit ALIVE v3.1

Дата: 2026-08-16

Статус: **ARCHITECTURAL REGRESSION REMEDIATED — ADDITIVE REINTEGRATION COMPLETE — OWNER RC REVIEW PENDING**

## Исходная regression

Первая v3.1 frontend integration создала параллельный `V31App.tsx`, переключила `main.tsx` на новый root shell и подключила `v31.css`. Это заменяло часть утверждённого v3.0 опыта вместо additive extension и было признано blocking regression независимо от зелёного build.

## Remediation baseline

Канонический visual reference:

- production commit `86b4608da61b34d6db14648a5d5f591ad6e63bcc`;
- `app/src/RedesignApp.tsx`;
- `app/src/redesign.css`;
- `docs/BRANDBOOK.md`.

В active branch:

- `main.tsx` запускает `RedesignApp`;
- `v31.css` не импортируется;
- новый root shell не создан и не активирован;
- четыре main navigation surfaces сохранены;
- Facts и Together добавлены как secondary routes/entry points;
- mobile bottom navigation не расширена;
- существующие Today, modal и `r-*` patterns переиспользованы.

Исторические inactive материалы не удалены, поскольку владелец запретил удалять baseline/audit content; они не являются active implementation.

## Additive diff

От owner-approved logo baseline commit `15d6a49543a12c8dfd99db3b0e72bd26175a7fec` до frontend head `c5986676a5eae166fa3ca0a274b5d984c05aa83b`:

- 10 commits ahead;
- `app/src/RedesignApp.tsx`: +279 / -25;
- `app/src/data.ts`: +10 / -1;
- `app/src/redesign.css`: +11 / -8;
- `app/src/v31-data.ts`: +40 / -23;
- no baseline feature file deletion;
- no `main.tsx` root switch;
- no active `v31.css` import.

Изменения состоят из product-aware CTA, guided refinement, ranking adapter, contextual Myths, Facts, Together, start-year metadata и lapse copy. Это расширение существующего приложения, не redesign.

## Baseline inventory result

Сохраняется:

- Header, Today hierarchy и четыре main sections;
- quick nicotine log, evening check-in, pulse, baseline/Freedom Fund, attention map, history;
- delete/correction with recalculation;
- Links, Path, Meanings, Profile, Method, Releases;
- OAuth/logout and desktop/mobile navigation;
- existing event/data semantics.

Изменяется:

- CTA wording;
- guided progress/step navigation;
- Replacement ranking/presentation;
- cigarette profile metadata;
- lapse copy.

Добавляется:

- contextual Myth;
- Facts/Myths secondary route;
- Together secondary route;
- optional start year/exposure display.

Удаляется: **ничего**.

## Technical and visual evidence

- PASS — UI contract.
- PASS — TypeScript typecheck.
- PASS — Vite production build.
- PASS — public preview at 390×844, 820×900 and 1440×960.
- PASS BY OWNER — login and authenticated desktop/mobile logo/header.
- PASS — bundled owner-approved logo visible with correct proportions.
- PASS — checked public surfaces preserve dark ALIVE visual language.

## Remaining visual/runtime gate

Current automation could not inspect authenticated post-change Today/guided/Facts/Together/Profile because the owner chose not to authenticate in the shared browser. This does not invalidate the owner-confirmed logo/header gate, but it means the complete authenticated regression matrix remains pending.

PR #5 therefore stays draft. No merge/production promotion until full owner RC visual review and the pending functional matrix are closed.


## Corrective regression — 2026-08-17

Owner screenshot revealed that technical presence was incorrectly treated as user-facing completion.

Findings:

- product-aware CTA was not deterministic: all selected products had `target_dependency`, then the first database row won;
- Facts/Myths existed behind Profile but were not discoverable from the main experience;
- preview status remained in English and described an obsolete rollback phase;
- raw metadata or backend error strings could leak English into the Russian UI.

Remediation:

- explicit single primary product in Setup;
- neutral CTA and no preselection for ambiguous legacy profiles;
- no arbitrary product in Quick log;
- visible Facts/Myths shortcuts on desktop/mobile and a Today knowledge surface;
- Russian preview/fallback/error labels;
- v3.1 release-history entry;
- expanded UI contract.

Technical evidence: commits `d550d4a` and `6e13dff`; CI runs `#134` and `#135` PASS.

This finding confirms the release rule: route existence and green build are not sufficient. The complete authenticated experience still requires owner review before merge.
