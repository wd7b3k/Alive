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

- [ ] **Approved Om asset present in v3 runtime** — Unicode/infinity substitute запрещён, exact owner-supplied canonical asset обязателен;
- [ ] **Visual parity / safe-zone review PASS** по `docs/V3_VISUAL_UX_BASELINE.md`;
- [ ] **360/390–430/768–820/1280/1440+ viewport smoke-test PASS**;
- [ ] primary/destructive actions не конфликтуют, fixed navigation не перекрывает content.

Примечание: единичный `DNS_PROBE_FINISHED_NXDOMAIN`, наблюдавшийся на мобильном устройстве 2026-08-15, не подтвердился как outage Cloudflare: production host и hash-preview deployments фактически доступны. Этот эпизод не считается Pages blocker.

## Требует следующего gate

- [ ] Supabase CLI local stack запускается;
- [ ] `supabase db reset` PASS;
- [ ] user A → private rows user B = denied;
- [ ] browser bundle secret scan PASS;
- [ ] export/delete basic tests PASS;
- [ ] final mobile/desktop product parity smoke-test PASS.

## Release gate

`v3.0` не объявляется выпущенным, пока все требования `REQUIREMENTS.md`, `docs/V3_PARITY_BASELINE.md` и `docs/V3_VISUAL_UX_BASELINE.md` не проверены либо явно не вынесены из scope отдельным утверждённым решением.
