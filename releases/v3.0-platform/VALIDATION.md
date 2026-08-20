# ALIVE v3.0 — Validation

Статус: `PARTIAL / NOT YET RELEASE-READY`.

## Repository/platform checks

- [x] `wd7b3k/Alive` является отдельным canonical repository;
- [x] REPO закреплён как единственный source of truth;
- [x] v3.0 FR/RISK scope pre-registered;
- [x] frontend не содержит service-role/OAuth secrets;
- [x] `.env.example` содержит только browser-safe placeholders;
- [x] `app/package-lock.json` зафиксирован в repo;
- [x] GitHub Actions использует `npm ci` с Node `22.12.0`;
- [x] GitHub frontend CI `typecheck` PASS;
- [x] GitHub frontend CI production `build` PASS;
- [x] initial SQL schema хранится versioned migration;
- [x] private tables имеют RLS policies;
- [x] identity/profile не hardcode конкретных участников;
- [x] `/experiment` объясняет экспериментальный статус и privacy;
- [x] ALIVE units явно названы behavioural heuristic;
- [x] remote Supabase migrations применены из canonical SQL;
- [x] Supabase Database Security Advisor: 0 warnings после hardening;
- [x] Google OAuth client и Google provider настроены владельцем;
- [x] Google OAuth end-to-end login PASS на Cloudflare Pages;
- [x] `public.profiles` auto-create PASS после Google login;
- [x] Cloudflare Pages production host `https://alive-aw2.pages.dev` открыт и обслуживает production;
- [x] Cloudflare branch preview deployments для `v3.0-hardening` создаются автоматически и доступны по hash-hosts.

## Текущие blockers

- [ ] **Approved Om asset present in v3 runtime** — Unicode/infinity substitute запрещён, exact owner-supplied canonical asset обязателен.
      Проверено инструментально 2026-08-20: SHA-256 фактического
      `app/src/assets/brand-logo-full.png` (идентичен `app/public/brand-logo-full.png`) —
      `110738ee37aef8b4486b777b3e2d3f5004a5f254582b464f0f265495997f8ce3`. Он не совпадает
      ни с одним из двух канонических хэшей в `docs/V3_VISUAL_UX_BASELINE.md`
      (`95eca2d5...b769da` для Om-марки, `11c8624d...191d2` для полного лого). Блокер
      остаётся открытым не по формальности, а по факту несовпадения — **AI не подменяет
      ассет и не переписывает канонический хэш самостоятельно**; нужно решение владельца
      (какой файл на самом деле утверждён) и обновление либо хэша в baseline, либо ассета.
- [ ] **Visual parity / safe-zone review PASS** по `docs/V3_VISUAL_UX_BASELINE.md`;
- [ ] **360/390–430/768–820/1280/1440+ viewport smoke-test PASS**;
- [ ] primary/destructive actions не конфликтуют, fixed navigation не перекрывает content.

Примечание: единичный `DNS_PROBE_FINISHED_NXDOMAIN`, наблюдавшийся на мобильном устройстве 2026-08-15, не подтвердился как outage Cloudflare: production host и hash-preview deployments фактически доступны. Этот эпизод не считается Pages blocker.

## Требует следующего gate

- [ ] Supabase CLI local stack запускается (`npx supabase start`/`db reset` буквально
      не прогонялись — в этой сессии нет доступного Docker daemon для CLI-стека Supabase.
      Вместо этого 2026-08-20 миграции прогнаны на чистом локальном PostgreSQL 16
      напрямую через `supabase/tests/local/run.sh` — функционально эквивалентный, но
      не идентичный путь; см. `supabase/tests/local/README.md`. Оставлено непройденным
      буквально, чтобы не выдавать один инструмент за другой);
- [ ] `supabase db reset` PASS (см. предыдущий пункт — то же самое ограничение);
- [ ] user A → private rows user B = denied.
      **Сильное, но не окончательное свидетельство получено 2026-08-20**:
      `supabase/tests/local/run.sh` реально прогнан против настоящих versioned
      migrations на одноразовой локальной Postgres-БД (auth-шим, максимально близкий к
      Supabase-контракту) — SELECT/UPDATE/DELETE чужих private rows по всем 10
      RLS-защищённым таблицам = 0 совпадений, попытка INSERT с чужим `user_id`
      отклонена `with check`, собственные данные пользователю по-прежнему видны
      (контроль от false positive). Это подтверждает корректность RLS-политик в самих
      migrations, но **не заменяет** требуемый живой smoke-test с двумя реальными
      Google-аккаунтами на реальном Cloudflare Pages деплое — чек-бокс сознательно
      оставлен непройденным до этого теста;
- [x] browser bundle secret scan PASS — реально прогнано 2026-08-20 против настоящего
      production-бандла (`npm run build` в `app/`, затем
      `node scripts/scan-bundle-for-secrets.mjs app/dist`): 0 совпадений паттернов
      service-role/OAuth-secret/PEM-ключей. Скрипт также проверен на срабатывание
      (внедрённый тестовый секрет в копии бандла — пойман, exit code 1). Теперь это
      постоянный шаг CI (`frontend-ci.yml`, job `frontend`), а не разовая ручная
      проверка — закрывает расхождение "заявлено в CURRENT_STATE.md как факт, но не
      подтверждено тестом" из аудита 001. Ограничение: это паттерн-based статическая
      проверка, не гарантия против любой формы утечки — см. комментарии в самом скрипте;
- [ ] UGC explicit-consent test PASS — private Смысл/Связка не появляется в общем
      каталоге без явного действия «Предложить в общую базу» (`FR-V3-062/063`,
      `RISK-V3-008`, помечен как **Blocker** в `REQUIREMENTS.md`). До 2026-08-20 этот
      пункт вообще отсутствовал в VALIDATION.md, несмотря на Blocker-статус в
      REQUIREMENTS.md — добавлен как явный пробел, не как пройденная проверка.
      **Структурная проверка 2026-08-20**: в migrations нет ни одного trigger/function,
      автоматически публикующего `user_meanings`/`user_links` в `meanings_catalog`/
      `replacements_catalog`; единственный путь в общий каталог — явный insert в
      `ugc_submissions` через `submitMeaning`/`submitLink` (`app/src/data.ts`), которые
      вызываются только по клику на явно подписанную кнопку «Предложить в общую базу»
      в `RedesignApp.tsx`. **Отдельная находка**: старый (уже удалённый) `App.tsx`
      оборачивал этот вызов в `window.confirm(...)`, у `RedesignApp.tsx` такого
      подтверждающего диалога нет — сама кнопка формально уже является явным действием
      по тексту `FR-V3-062/063`, но нужно продуктовое решение владельца, требуется ли
      дополнительное подтверждение;
- [ ] export/delete basic tests PASS.
      **Реализовано, но не протестировано live 2026-08-20**: `exportMyData()` и
      `deleteMyAccount()` добавлены в `app/src/actions.ts` (typecheck/build PASS);
      `supabase/functions/delete-account/index.ts` — новая Edge Function, заменяющая
      ранее удалённый небезопасный публичный RPC (см. её собственный header-комментарий).
      Не задеплоена и не вызвана против живого проекта — нет credentials в этой сессии.
      UI-кнопки для export/delete сознательно не добавлены в этом проходе — это
      security-чувствительное, необратимое действие, заслуживающее отдельного,
      осмотрительного изменения, а не попутной вставки в 60К-строчный компонент;
- [ ] final mobile/desktop product parity smoke-test PASS.

## Release gate

`v3.0` не объявляется выпущенным, пока все требования `REQUIREMENTS.md`, `docs/V3_PARITY_BASELINE.md` и `docs/V3_VISUAL_UX_BASELINE.md` не проверены либо явно не вынесены из scope отдельным утверждённым решением.
