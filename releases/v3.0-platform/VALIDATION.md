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

## Требует реального environment / следующего gate

- [ ] Supabase CLI local stack запускается;
- [ ] `supabase db reset` PASS;
- [ ] Cloudflare preview deploy PASS;
- [ ] browser-safe Supabase env настроен в preview;
- [ ] Google login PASS;
- [ ] profile auto-create PASS;
- [ ] user A → private rows user B = denied;
- [ ] browser bundle secret scan PASS.

## Release gate

`v3.0` не объявляется выпущенным, пока все требования `REQUIREMENTS.md` не проверены либо явно не вынесены из scope отдельным утверждённым решением.
