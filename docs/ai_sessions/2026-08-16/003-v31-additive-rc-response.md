# ALIVE v3.1 additive RC integration — response

Дата: 2026-08-16

## Выполнено

Контекст, Brandbook, release rules, baseline inventory, regression audit, validation, v3.0 merged baseline и active frontend прочитаны до изменений.

Owner-provided logo сохранён exact bytes в `app/src/assets/brand-logo-full.png` без обработки. SHA-256: `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`. `RedesignApp` использует bundled asset; owner подтвердил login и authenticated desktop/mobile headers.

v3.1 реинтегрирован вертикальными additive slices внутри `RedesignApp`/`redesign.css`:

- product-aware CTA;
- guided progress, strength step, clickable reached steps and downstream invalidation;
- diverse mechanism-aware Replacement ranking;
- contextual Myths;
- Facts/Myths route;
- privacy-safe Together route;
- optional cigarette start year/exposure metadata;
- lapse context-disruption next experiment.

Новый shell не создавался. `main.tsx` не переключался, `v31.css` не активирован, baseline v3.0 не удалялся.

## Validation

Current frontend head: `c5986676a5eae166fa3ca0a274b5d984c05aa83b`.

GitHub Actions run #132:

- UI contract — PASS;
- typecheck — PASS;
- build — PASS.

Отдельный automated test script отсутствует. Public branch preview проверен при 390×844, 820×900 и 1440×960. Owner logo/header visual gate пройден.

## Handoff

Branch: `agent/v3.1-behavioral-depth-together`.

Draft PR: #5.

Preview: `https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev/`.

Production/main не изменены; PR не merge.

Остаются: полный authenticated post-change regression, Together suppression states, second-user isolation, owner medical-copy review и финальный owner visual approval всего RC. Поэтому статус остаётся RELEASE CANDIDATE / DRAFT VALIDATION, не RELEASED.
