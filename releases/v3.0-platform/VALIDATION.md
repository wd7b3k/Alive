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
- [ ] Google OAuth end-to-end login PASS.

## Текущие blockers

- [ ] **Cloudflare Pages host restored** — 2026-08-15 `alive-aw2.pages.dev` зафиксирован пользователем как `DNS_PROBE_FINISHED_NXDOMAIN`;
- [ ] **Approved Om asset present in v3 runtime** — Unicode/infinity substitute запрещён, exact canonical asset обязателен;
- [ ] **Visual parity / safe-zone review PASS** по `docs/V3_VISUAL_UX_BASELINE.md`;
- [ ] **360/390–430/768–820/1280/1440+ viewport smoke-test PASS**;
- [ ] primary/destructive actions не конфликтуют, fixed navigation не перекрывает content.

## Требует реального environment / следующего gate

- [ ] Supabase CLI local stack запускается;
- [ ] `supabase db reset` PASS;
- [ ] Cloudflare production/preview deploy PASS после восстановления Pages project;
- [ ] browser-safe Supabase env настроен в preview;
- [ ] Google login PASS;
- [ ] profile auto-create PASS;
- [ ] user A → private rows user B = denied;
- [ ] browser bundle secret scan PASS.

## Release gate

`v3.0` не объявляется выпущенным, пока все требования `REQUIREMENTS.md`, `docs/V3_PARITY_BASELINE.md` и `docs/V3_VISUAL_UX_BASELINE.md` не проверены либо явно не вынесены из scope отдельным утверждённым решением.
