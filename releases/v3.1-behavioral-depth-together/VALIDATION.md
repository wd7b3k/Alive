# Validation ALIVE v3.1

Статус: **RC IMPLEMENTED — DRAFT VALIDATION, MERGE BLOCKED BY FINAL GATES**

## Baseline contract

- PASS — production baseline commit: `86b4608da61b34d6db14648a5d5f591ad6e63bcc`.
- PASS — `main.tsx` продолжает запускать `RedesignApp`.
- PASS — `redesign.css` остаётся active base design system.
- PASS — `V31App` и `v31.css` не подключены к active entrypoint.
- PASS — четыре baseline-раздела `Сегодня / Связки / Путь / Смыслы` сохранены.
- PASS — UI contract защищает craving, quick log, evening check-in, delete/correction, user Links/Meanings, OAuth и logout.
- PASS — ни одна v3.0 capability намеренно не удалена.

## Database, evidence и security

- PASS — все шесть v3.1 migrations applied.
- PASS — 75 published Replacements / 18 mechanisms / 19 Myths / 19 Facts.
- PASS — RLS и read-only content catalog grants проверены.
- PASS — `user_myth_state` own-user policies present.
- PASS — Together API возвращает whitelist aggregates и suppresses detailed data below threshold 3.
- PASS — public Together contract использует `SECURITY INVOKER`; privileged aggregation находится в unexposed `private` schema.
- PASS — A/B/C evidence distinction и запрет fabricated personal medical risk задокументированы.
- KNOWN — Supabase Auth leaked-password protection warning; продукт экспонирует только Google OAuth.
- BLOCKED BY COHORT — client-level isolation `user_myth_state` требует второго реального/test account.

## Additive frontend slices

- PASS — product-aware CTA внутри существующего Today.
- PASS — guided progress, отдельная сила тяги, clickable reached steps.
- PASS — downstream invalidation product → trigger → strength → need → replacement → result.
- PASS — mechanism-aware Replacement ranking с diversity-first top-3.
- PASS — contextual Myth с one-per-flow cap и private relevance.
- PASS — secondary Facts/Myths route в approved dark surfaces.
- PASS — secondary Together route с personal-first framing и privacy suppression.
- PASS — optional cigarette start year/exposure metadata backward-compatible.
- PASS — lapse context-disruption next experiment без reset/shame.
- PASS — знания загружаются отдельно и не ломают v3.0 bootstrap при ошибке.

## Corrective owner QA — 2026-08-17

- FAIL FOUND BY OWNER — CTA показывал кальян, когда несколько products имели роль `target_dependency`.
- ROOT CAUSE — Setup назначал `target_dependency` каждому выбранному продукту, а Today/Guided/Quick log использовали первый row как fallback.
- PASS — новый Setup требует один explicit primary product.
- PASS — старые неоднозначные profiles получают нейтральный CTA и product-selection step.
- PASS — Quick log не позволяет сохранить запись до выбора продукта.
- FAIL FOUND BY OWNER — Facts/Myths route был недостаточно discoverable.
- PASS — Facts/Myths добавлены в secondary desktop/mobile header, Today knowledge block и остаются в Profile.
- PASS — contextual Myth в guided flow сохранён.
- FAIL FOUND BY OWNER — preview badge и raw fallback/error values могли быть на английском.
- PASS — preview badge и user-facing fallback/error labels русифицированы.
- PASS — UI contract теперь защищает primary product, Facts/Myths, contextual Myths, Together, start year, lapse и Russian labels.
- PASS — corrective CI runs `#134`, `#135`, `#136` и `#137`.

## Logo owner gate

Изначальный release document ожидал другой historical hash. Затем владелец прямо предоставил и утвердил приложенный PNG словами «используй этот лого». Это обязательный owner identity gate и новый source of truth для данной ветки.

- PASS — exact asset сохранён без resize/crop/recompress/optimization.
- PASS — size 486931 bytes, dimensions 2048×682.
- PASS — SHA-256 `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`.
- PASS — UI contract фиксирует owner-approved hash.
- PASS — public login и standalone methodology rendering.
- PASS BY OWNER — login, authenticated desktop header, authenticated mobile header.

## CI

Frontend validation выполнялась после каждого vertical slice.

Current frontend head: `1326f986f7575f8d79376118444e97839ed12b04`.

GitHub Actions run `#137`:

1. UI contract — PASS.
2. TypeScript typecheck — PASS.
3. Vite production build — PASS.

Runs `#123–#128` также были зелёными для предшествующих slices. Corrective runs `#134`, `#135`, `#136` и `#137` зелёные. Runs `#129` и `#130` обнаружили JSX boundary errors в start-year slice; ошибки исправлены отдельными commits, run `#131` и current run `#132` зелёные.

В `app/package.json` нет отдельного automated test script/test runner. Статус «tests PASS» не заявляется; применимые automated gates — UI contract, typecheck и build.

## Browser smoke

Branch preview: `https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev/`.

- PASS — 390×844 public login.
- PASS — 820×900 standalone `/experiment`.
- PASS — 1440×960 public login.
- PASS — logo proportion and visibility.
- PASS — public preview badge полностью на русском: `Предпросмотр v3.1 · кандидат в релиз`.
- PASS — no visible horizontal overflow на проверенных public surfaces.
- PASS BY OWNER — authenticated desktop/mobile logo and header.

Authenticated browser session не предоставлена текущему automation environment. Поэтому полный post-change functional matrix не объявляется пройденным только по CI или public screenshots.

## Regression matrix

Static/contract coverage:

- PASS — Today hero/CTA entry points remain in canonical component.
- PASS — quick nicotine, evening, delete/correction and recalculation paths remain.
- PASS — Links, Path, Meanings, Profile, Method, Releases and logout remain.
- PASS — mobile bottom navigation remains four-item baseline.
- PASS — tobacco products are not labelled as Replacements.
- PASS — no production/main mutation.

Runtime gates still open:

- PENDING — full guided back/edit/invalidation/save.
- PENDING — cigarette/hookah/vape quick log and correction recalculation.
- PENDING — evening reopen/update/save.
- PENDING — Links CRUD/submit and trigger-to-flow.
- PENDING — Path 7/30/baseline/Fund/effectiveness/raw stats.
- PENDING — Meanings create/toggle/delete/submit and Identity Scripts.
- PENDING — Profile baseline/start-year preservation.
- PENDING — Facts/Myths actions and source links.
- PENDING — Together suppressed/evaluable states.
- PENDING — full authenticated responsive 390/430/768–820/1280/1440+.
- PENDING — final owner review of medically significant copy and complete RC visuals.

## Release / repo

- PASS — branch `agent/v3.1-behavioral-depth-together`.
- PASS — draft PR #5 remains open.
- PASS — Cloudflare branch preview exists.
- PASS — release requirements, changelog, rollback, current state and AI audit trail updated.
- PASS — production/main unchanged.

## Release gate

**Do not merge or deploy v3.1 to production yet.**

Promotion requires closing the pending authenticated regression matrix, second-user isolation when an account/environment exists, medically significant copy review and final owner visual approval. Green CI and branch preview are necessary but not sufficient.
