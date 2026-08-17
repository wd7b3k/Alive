# Validation — ALIVE 4.0.0-alpha.1

Любой пункт получает только один статус:

- `PASS`;
- `FAIL`;
- `НЕ ПРОВЕРЕНО`.

Нельзя считать checklist выполненным по косвенным признакам.

## Фактический checkpoint — 2026-08-17

| Gate | Статус | Факт |
|---|---|---|
| Direct GitHub branch / draft PR | PASS | `agent/v4.0.0-alpha.1`, draft PR #8, base `agent/r1-data-evidence-admin` |
| Implementation plan до runtime-кода | PASS | План был единственным release-diff перед domain/runtime implementation |
| Scope / non-goals | PASS | Local LLM, Tribute, referral, Telegram, Together redesign, wearables, ML, paywall и unrelated refactor не добавлены |
| Canonical cigarette implementation | PASS | Реализован компактный flow: CTA → контекст → approved content/Зачем → deterministic action → outcome → metrics → learning-compatible raw writes → admin events |
| `npm ci --no-audit --no-fund` | PASS | Выполнено во временном validation-зеркале точного head branch |
| `npm run typecheck` | PASS | Exit code 0 |
| `npm test` | PASS | 11/11 Node domain tests, включая idempotent retry semantics |
| `npm run build` | PASS | Production build завершён; остаётся warning о chunk >500 kB |
| Adversarial self-review | PASS | Помимо runtime fixes проверены и исправлены admin privilege escalation, cross-user action link, hard-delete projection risk, legacy path и CI supply-chain/teardown semantics |
| GitHub Actions | PASS | Strict-gate head `2ca5f83c2c4d8947282d44d8c7ab370eb75e10df`: frontend run #295 и database run #35 завершены `success`; DB conclusion подтверждён разбором полного job log |
| SQL/RLS static review | PASS | Atomic/idempotent exposure RPC и least-privilege boundary проверены Supabase best-practices workflow и отдельным reviewer; новых P1/P2 нет |
| Ephemeral DB: migration replay | PASS | `ALIVE database CI` run #35: pinned Supabase CLI `2.111.0`, fresh stack и отдельный `supabase db reset --local` применили всю migration chain с нуля, включая security hardening |
| Ephemeral DB: pgTAP / RLS | PASS | Run #35: 5 файлов, 61/61 assertions — isolation, authenticated/anonymous boundaries, RPC grants, sequential/concurrent `flow_id`, soft-delete/recompute, blocked hard delete, non-escalating admin boundary, cross-user action denial и legacy-present migration |
| Ephemeral DB: lint / teardown | PASS | Run #35 фактически исполнил `supabase db lint --level error --fail-on error`; log: `No schema errors found`; `supabase stop --no-backup` завершён до уничтожения runner |
| Live / paid Supabase branch | PASS | Не создавались и не изменялись; validation не использует remote link, secrets, artifacts или постоянные volumes |
| Hosted Security / Performance Advisors | НЕ ПРОВЕРЕНО | Ephemeral schema lint не подменяет hosted Supabase Advisors после будущего controlled deployment |
| Canonical authenticated E2E | НЕ ПРОВЕРЕНО | Preview доступен, но browser session не имеет authenticated test user; вход через Google не выполнялся |
| Public preview smoke | PASS | Cloudflare branch preview открыт реальным browser tooling на 1440×900 и 390×844: загрузка, CTA, info route и отсутствие horizontal overflow подтверждены |
| Browser desktop/mobile | НЕ ПРОВЕРЕНО | Public shell проверен, но canonical authenticated flow и admin route не пройдены |
| Performance / accessibility preview | НЕ ПРОВЕРЕНО | Preview доступен, но требуемый Chrome DevTools MCP для trace/Core Web Vitals в окружении отсутствует |
| Vape / hookah runtime expansion | НЕ ПРОВЕРЕНО | Намеренно не начато до фактического canonical E2E PASS |
| Independent reviewer | PASS | Ранний DB/CI review закрыл 2 P1, 3 P2 и 1 P3. Последующая независимая проверка выявила false-green lint semantics в run #32; дефект и gate исправлены, strict run #35 проверен по полному логу |

Residual risks DB gate: composite FK требует preflight исторических remote rows перед deployment; legacy test не воспроизводит полный pre-R1 snapshot; `ubuntu-latest` mutable; PostgREST/Auth transport не покрыт pgTAP.

False-green correction: runs #24/#32 не считаются strict-lint evidence. Причина — default `--fail-on none`; постоянное правило fail semantics зафиксировано в `docs/CODEX_QUALITY_PROTOCOL.md` и AI session 008.

Этот checkpoint не является acceptance release. Checklist ниже остаётся полным acceptance contract; непроверенные строки нельзя выводить из программного PASS.

## 1. Base / R1 readiness

- [ ] Strategy Foundation понятна и не конфликтует с release.
- [x] R1 schema воспроизводится в ephemeral CI без платной branch.
- [x] R1 migrations последовательны при fresh replay.
- [x] RLS boundary, privilege non-escalation и action/episode ownership подтверждены pgTAP.
- [x] Legacy data compatibility и clean-schema fallback подтверждены replay.

## 2. Scope

- [ ] Реализован только alpha.1 scope.
- [ ] Нет local LLM.
- [ ] Нет Tribute.
- [ ] Нет referral.
- [ ] Нет Telegram.
- [ ] Нет unrelated cleanup/refactor.

## 3. Canonical cigarette slice

Реально пройти:

1. authenticated user;
2. home;
3. `Хочу закурить`;
4. сигарета;
5. `после еды`;
6. micro-awareness;
7. intervention;
8. outcome;
9. metrics update;
10. learning effect;
11. admin analytics event.

Проверки:

- [ ] flow начинается быстро;
- [ ] первый полезный response не требует длинной анкеты;
- [ ] approved content отображается корректно;
- [ ] intervention explanation правдива;
- [ ] outcome сохраняется;
- [ ] raw data корректны;
- [ ] derived data обновляются;
- [ ] analytics отражают именно craving flow;
- [ ] quick log не загрязняет craving metric.

## 4. Вейп

- [ ] пользовательский flow не является cigarette copy;
- [ ] учитывается обращение/затяжки/интервал по принятой alpha semantics;
- [ ] тексты корректны;
- [ ] cigarette Health Minutes не применяются;
- [ ] analytics product_type корректен.

## 5. Кальян

- [ ] есть pre-session semantics;
- [ ] session не разбивается на фиктивные cigarette events;
- [ ] социальный/ритуальный контекст поддерживается;
- [ ] cigarette Health Minutes не применяются;
- [ ] analytics product_type корректен.

## 6. Зачем

- [ ] UI использует `Зачем`, не `Смыслы` на новой поверхности;
- [ ] создание;
- [ ] редактирование;
- [ ] скрытие/активация;
- [ ] legacy data не потеряны;
- [ ] личный текст не попадает в generic analytics;
- [ ] contextual use в craving flow работает.

## 7. Метрики

### Time

- [ ] baseline calculation корректен;
- [ ] correction/delete пересчитывает значение;
- [ ] unit formatting русское и понятное.

### Money

- [ ] используется personal product cost where available;
- [ ] correction/delete пересчитывает значение;
- [ ] нет двойного счёта.

### Health Minutes

- [ ] используется `≈`;
- [ ] methodology доступна;
- [ ] cigarette only, если нет другого approved model;
- [ ] vape/hookah не пересчитываются через ALIVE units;
- [ ] пользователь не получает формулировку персонального медицинского прогноза.

## 8. Micro-awareness

- [ ] user copy из approved Evidence content;
- [ ] source/limitations доступны;
- [ ] один основной тезис за раз;
- [ ] repetition/fatigue работает;
- [ ] impression event;
- [ ] usefulness/relevance feedback where required;
- [ ] нет LLM-generated medical claim.

## 9. Intervention Engine

- [ ] deterministic fallback;
- [ ] context/product eligibility;
- [ ] personal outcome влияет только при достаточных данных;
- [ ] explanation соответствует реальной причине ranking;
- [ ] отключённая/неподходящая Замена не показывается;
- [ ] no random silent selection.

## 10. Analytics funnel

- [ ] flow opened;
- [ ] first useful response;
- [ ] awareness shown;
- [ ] intervention shown;
- [ ] selected;
- [ ] completed;
- [ ] outcome saved;
- [ ] abandoned step;
- [ ] structured reason;
- [ ] repeat use;
- [ ] quick log separately;
- [ ] no sensitive free text.

## 11. Admin

- [ ] participant cannot open admin data;
- [ ] admin can open dashboard after controlled role bootstrap;
- [ ] funnel labels русские;
- [ ] reason codes переводятся в понятный русский;
- [ ] no private goals/links/notes loaded;
- [ ] no vanity metric presented as evidence of cessation benefit.

## 12. Database / RLS

Если schema меняется:

- [x] ephemeral fresh migrations PASS;
- [x] owner read/write/soft-delete/recompute paths PASS в покрытом vertical slice; physical episode delete для client role запрещён;
- [x] cross-user read denied;
- [x] cross-user write denied;
- [x] unauthenticated denied;
- [ ] hosted security advisor reviewed;
- [ ] hosted performance advisor reviewed;
- [x] schema lint и индексы проверены;
- [x] rollback/forward-fix documented.

## 13. Automated tests

- [ ] test framework минимален и обоснован;
- [ ] metric calculations;
- [ ] ranking;
- [ ] awareness selection/fatigue;
- [ ] analytics event mapping;
- [ ] product-specific logic;
- [ ] tests реально падают при нарушении ожидаемого поведения.

## 14. Frontend checks

Из `app/`:

- [ ] `npm ci`;
- [ ] `npm run typecheck`;
- [ ] tests;
- [ ] `npm run build`.

## 15. Browser QA

Если tool доступен:

- [ ] desktop canonical slice;
- [ ] mobile canonical slice;
- [ ] vape;
- [ ] hookah;
- [ ] loading;
- [ ] empty;
- [ ] error/retry;
- [ ] delete/correction;
- [ ] auth;
- [ ] admin boundary.

Если tool не доступен — всё соответствующее `НЕ ПРОВЕРЕНО`.

## 16. Performance

После preview, если web-perf/Chrome tooling доступен:

- [ ] LCP/FCP/CLS/interaction reviewed;
- [ ] craving CTA не сдвигается после load;
- [ ] bundle regression reviewed;
- [ ] slow secondary request не блокирует first useful response;
- [ ] accessibility snapshot reviewed.

## 17. Russian UX review

- [ ] нет `NRT`;
- [ ] нет `reset`;
- [ ] нет `replacement`;
- [ ] нет `outcome`;
- [ ] нет `meaning`;
- [ ] нет `streak` как visible machine term;
- [ ] CTA конкретные;
- [ ] нет кальки;
- [ ] нет shame;
- [ ] нет неподтверждённых medical claims.

## 18. Visual review

- [ ] один primary action;
- [ ] clear hierarchy;
- [ ] mobile controls usable;
- [ ] no excessive card soup;
- [ ] no colour-only meaning;
- [ ] brand/logo не изменены без решения;
- [ ] dark theme coherent.

## 19. Self-review

- [ ] Codex сделал adversarial review собственного diff;
- [ ] найденные проблемы исправлены;
- [ ] список changed files объяснён;
- [ ] unrelated diff отсутствует.

## 20. Independent review

- [ ] second-agent review PASS;

Если second-agent workflow отсутствует — `НЕ ПРОВЕРЕНО`, не скрывать.

## 21. Documentation

- [ ] release README;
- [ ] requirements;
- [ ] implementation plan заполнен;
- [ ] validation обновлён фактическими статусами;
- [ ] rollback;
- [ ] CURRENT_STATE;
- [ ] decision/evolution при необходимости;
- [ ] AI prompt/response audit.

## Acceptance

Alpha.1 может быть передан владельцу как **reviewable preview** только после PASS canonical cigarette slice, typecheck/build/tests и отсутствия известных critical privacy/data regressions.

Он не становится accepted release автоматически после открытия PR.
