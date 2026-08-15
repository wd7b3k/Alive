# ALIVE v3.0 — Validation

Статус: `PARTIAL / NOT YET RELEASE-READY`.

## Repository/platform checks

- [x] `wd7b3k/Alive` является отдельным canonical repository;
- [x] REPO закреплён как единственный source of truth;
- [x] v3.0 FR/RISK scope pre-registered;
- [x] frontend не содержит service-role/OAuth secrets;
- [x] `.env.example` содержит только browser-safe placeholders;
- [x] initial SQL schema хранится versioned migration;
- [x] private tables имеют RLS policies;
- [x] identity/profile не hardcode конкретных участников;
- [x] `/experiment` объясняет экспериментальный статус и privacy;
- [x] ALIVE units явно названы behavioural heuristic;
- [x] remote Supabase migrations применены из canonical SQL;
- [x] Supabase Database Security Advisor: 0 warnings после hardening.

## Требует реального environment / следующего gate

- [ ] `npm install` PASS;
- [ ] `npm run typecheck` PASS;
- [ ] `npm run build` PASS;
- [ ] Supabase CLI local stack запускается;
- [ ] `supabase db reset` PASS;
- [ ] Google login PASS;
- [ ] profile auto-create PASS;
- [ ] user A → private rows user B = denied;
- [ ] browser bundle secret scan PASS;
- [ ] Cloudflare preview deploy PASS.

## Release gate

`v3.0` не объявляется выпущенным, пока все требования `REQUIREMENTS.md` не проверены либо явно не вынесены из scope отдельным утверждённым решением.
