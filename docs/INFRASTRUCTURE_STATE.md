# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

## GitHub

- Canonical repository: `wd7b3k/Alive`
- Visibility: `private`
- Default branch: `main`
- Active development branch: `v3.0-hardening`
- Canonical standalone merge: `d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`
- Historical source before extraction: `wd7b3k/humanos/projectsv2.0/products/alive/`
- HumanOS cleanup merge: `78f2f74ef223d1da20c6c65203e5806263ec85e3`
- Current HumanOS `main` no longer contains the ALIVE product subtree; only pointer/audit history remains.
- Rule: дальнейшая ALIVE-разработка ведётся только в `wd7b3k/Alive`.

## Supabase

- Project ref: `xkigijaqimzuveyzyzyk`
- Project URL: `https://xkigijaqimzuveyzyzyk.supabase.co`
- Region: `eu-west-1`
- Status при последней проверке: `ACTIVE_HEALTHY`
- Runtime role: Auth + PostgreSQL + RLS
- Browser-safe publishable key существует и активен; его значение не является секретом, но не фиксируется как immutable source of truth, поскольку ключ может ротироваться.
- Service-role/database/OAuth secrets: **не сохраняются в git**.

### Remote migrations applied

1. `v3_platform_initial`
2. `v3_platform_security_indexes`

Канонические SQL-файлы: `supabase/migrations/`.

### Security state

После применения hardening migration Supabase Database Security Advisor: `0 warnings`.

Performance Advisor на пустой БД показывает только `unused_index`; это ожидаемо до появления workload и не является основанием удалять индексы до реальных query metrics.

## Google OAuth

Status: `E2E PARTIAL PASS / REDIRECT HOST CURRENTLY BROKEN`.

2026-08-15 первый реальный Google OAuth flow дошёл до Supabase успешно:

- Google consent — PASS;
- `auth.users` row — PASS;
- `public.profiles` auto-create — PASS;
- display name из Google metadata — PASS;
- финальный redirect ранее требовал Pages production host в Supabase Auth URL Configuration.

Supabase callback:

`https://xkigijaqimzuveyzyzyk.supabase.co/auth/v1/callback`

Последний настроенный Cloudflare Pages production host:

`https://alive-aw2.pages.dev`

До восстановления/замены Pages host не менять OAuth URL на случайное временное значение. После восстановления production URL Supabase Auth URL Configuration должна содержать production Site URL и соответствующий Redirect URL `/**`.

После подключения custom domain production Site URL должен быть переведён на `https://alive.hmnos.ru`.

Google OAuth Client Secret никогда не сохранять в repo, frontend или обычных логах.

## Cloudflare

Status: `OUTAGE / DNS NXDOMAIN — BLOCKER`.

2026-08-15 пользователь подтвердил в реальном мобильном браузере:

- `https://alive-aw2.pages.dev` → `DNS_PROBE_FINISHED_NXDOMAIN`;
- ранее работавший preview `https://bb8ad957.alive-aw2.pages.dev/` редиректил на production host, поэтому при недоступном parent Pages hostname он также непригоден для тестирования.

Это инфраструктурный drift относительно предыдущего состояния `PAGES DEPLOYED`. Git commit сам по себе не может восстановить отсутствующий `pages.dev` hostname; необходимо проверить Cloudflare Pages project/control-plane state.

Ожидаемый Pages project/host до custom domain:

- project name: `alive-aw2`;
- production host: `https://alive-aw2.pages.dev`;
- source repository: `wd7b3k/Alive`;
- frontend root directory: `app`;
- install/build: `npm ci && npm run build`;
- output directory: `dist`;
- Node: `>=22.12.0`.

Если project был удалён/переименован, безопасный порядок восстановления:

1. восстановить или создать Pages project из `wd7b3k/Alive`;
2. использовать временно `main` для стабильной точки либо явно выбранную тестовую ветку для preview;
3. настроить browser-safe Supabase env vars;
4. получить новый стабильный Pages hostname;
5. только после этого синхронизировать Supabase Site URL / Redirect URLs;
6. затем подключить `alive.hmnos.ru` как canonical production host;
7. обновить этот документ фактическим remote state.

Planned canonical host:

`https://alive.hmnos.ru`

## Drift rule

Если Dashboard/remote state расходится с repo:

1. не считать ручное изменение новой нормой;
2. определить, является ли remote change ошибкой или желаемым изменением;
3. желаемое изменение сначала оформить в repo;
4. затем синхронизировать remote;
5. обновить этот документ.
