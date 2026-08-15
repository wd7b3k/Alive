# Response / Handoff — Google OAuth и frontend CI

Дата: 2026-08-15

## Выполнено

- Google OAuth external configuration отмечена как `CONFIGURED / E2E NOT YET VERIFIED`;
- Google OAuth secret не сохранялся в repo;
- Supabase project URL и наличие browser-safe publishable key подтверждены через подключённый Supabase tool;
- создан `.github/workflows/frontend-ci.yml`;
- CI использует Node `22.12.0`;
- первый CI прогон с `npm install` подтвердил `typecheck` и production build;
- сгенерирован и зафиксирован `app/package-lock.json`;
- временная write-permission GitHub Actions использовалась только для bootstrap lock-файла и затем удалена;
- финальный CI использует `permissions: contents: read` и `npm ci`;
- финальный locked-dependency CI: `typecheck` PASS, `build` PASS;
- `docs/CURRENT_STATE.md` и `releases/v3.0-platform/VALIDATION.md` синхронизированы.

## Не проверено

- реальный Google login;
- automatic profile creation;
- browser bundle на реальном preview environment;
- two-user RLS isolation;
- Cloudflare Pages preview;
- DNS `alive.hmnos.ru`.

## Следующий gate

Подключить Cloudflare Pages к `wd7b3k/Alive`, branch `v3.0-platform`, root directory `app`, build command `npm run build`, output `dist`; задать browser-safe Supabase environment variables. После preview выполнить реальный Google login и проверить profile row/RLS.
