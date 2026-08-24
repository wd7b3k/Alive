# ALIVE — состояние внешней инфраструктуры

Этот документ фиксирует безопасное версионируемое отражение внешнего состояния. Секреты и private credentials здесь запрещены.

## GitHub

- Canonical repository: `wd7b3k/Alive`
- Visibility: `private`
- Default branch: `main`
- Активная разработка v3.0 (platform → hardening → redesign) фактически уже находится
  на `main` (tip `86b4608`, "ALIVE v3.0: deep interface redesign", 2026-08-15).
  `v3.0-platform` / `v3.0-hardening` / `v3.0-redesign` — исторические ветки, каждая
  отстаёт от `main`, никакого активного development сейчас на них не ведётся.
- **Открытый вопрос по PR #4** (не проверяемо только из содержимого git — нет доступа
  к GitHub API/PR-статусу из этой сессии): ранее здесь числился "Active PR: `#4` ...
  draft до визуального smoke-test". Коммиты на `main` линейны, без merge-commit —
  значит либо PR #4 был смержен fast-forward и его нужно закрыть/отметить смерженным,
  либо push в `main` произошёл в обход PR-процесса, описанного в `AGENTS.md`
  ("Git workflow"). Владельцу нужно явно зафиксировать, какой из двух вариантов верен,
  и обновить этот пункт по факту.
- Canonical standalone merge: `d1bcec0ae7f8feb2fee0cfe64c28bde44ef585cb`
- Historical source before extraction: `wd7b3k/humanos/projectsv2.0/products/alive/`
- HumanOS cleanup merge: `78f2f74ef223d1da20c6c65203e5806263ec85e3`
- Current HumanOS `main` no longer contains the ALIVE product subtree; only pointer/audit history remains.
- Rule: дальнейшая ALIVE-разработка ведётся только в `wd7b3k/Alive`; HumanOS не используется как источник текущего кода, дизайна или ассетов.

### Ветки repository — снимок аудита (2026-08-20)

Помимо `main`, в remote есть ещё 11 веток. Ниже — их состояние относительно `main`
на момент снимка (`git rev-list --count`, дата последнего коммита). Таблицу нужно
обновлять при следующем аудите, а не считать статичной.

| Ветка | Впереди `main` | Позади `main` | Последний коммит | Статус |
|---|---|---|---|---|
| `agent/owner-vision-delivery-protocol` | 225 | 0 | 2026-08-18 | несмержена, не в roadmap |
| `agent/v4.0.0-alpha.1-hotfix.1` | 225 | 0 | 2026-08-18 | несмержена; содержит release unit `v4.0.0-alpha.1-hotfix.1` — версия впереди факта, см. ниже |
| `agent/v4.0.0-alpha.1` | 222 | 0 | 2026-08-18 | несмержена; содержит release unit `v4.0.0-alpha.1` |
| `agent/r1-data-evidence-admin` | 100 | 0 | 2026-08-17 | несмержена; содержит release unit `r1-data-evidence-admin` (v3.2-scope) |
| `agent/v3.1-behavioral-depth-together` | 67 | 0 | 2026-08-17 | несмержена (v3.1-scope) |
| `agent/product-strategy-foundation` | 22 | 0 | 2026-08-17 | несмержена |
| `agent/stabilization-release` | 2 | 0 | 2026-08-18 | несмержена |
| `migration/standalone-repo` | 1 | 4 | 2026-08-15 | устаревшая, позади `main` |
| `v3.0-hardening` | 14 | 2 | 2026-08-15 | историческая, слита в `main` через redesign |
| `v3.0-platform` | 30 | 3 | 2026-08-15 | историческая, слита в `main` |
| `v3.0-redesign` | 8 | 1 | 2026-08-15 | историческая, слита в `main` |
| `docs/ai-session-2026-08-20-strategy-audit` | 1 | 0 | 2026-08-20 | audit-trail ветка этого аудита |

**Значимая находка (не решение — вопрос владельцу):** на `agent/v4.0.0-alpha.1` и
`agent/v4.0.0-alpha.1-hotfix.1` уже присвоена версия `v4.0.0-alpha`, хотя `v3.0` ещё
не объявлен `RELEASED` — это расходится с `docs/RELEASE_POLICY.md` §3/§10 и
`docs/ROADMAP.md` ("переходы идут по evidence gates"). На `agent/r1-data-evidence-admin`
уже начат v3.2-scope (admin/intelligence) до прохождения v3.0/v3.1 гейта. Этот документ
не abandon'ит, не мержит и не переименовывает эти ветки — решение о их судьбе
(archive / частично забрать в v3.1–v3.2 планирование / формализовать ADR) остаётся за
владельцем.

## Supabase

- Project ref: `xkigijaqimzuveyzyzyk`
- Project URL: `https://xkigijaqimzuveyzyzyk.supabase.co`
- Region: `eu-west-1`
- Status при последней проверке: `ACTIVE_HEALTHY`
- Runtime role: Auth + PostgreSQL + RLS
- Browser-safe publishable key существует и активен; его значение не является секретом, но не фиксируется как immutable source of truth, поскольку ключ может ротироваться.
- Service-role/database/OAuth secrets: **не сохраняются в git**.

### Remote migrations applied

Канонические SQL-файлы находятся в `supabase/migrations/`; remote schema разворачивается только versioned migrations из repo.

### Security state

После применения hardening migrations Supabase Database Security Advisor: `0 warnings`.

Performance Advisor на пустой/малой БД может показывать `unused_index`; это не является основанием удалять индексы до реальных query metrics.

## Google OAuth

Status: `E2E PASS`.

2026-08-15 реальный Google OAuth flow подтверждён:

- Google consent — PASS;
- `auth.users` row — PASS;
- `public.profiles` auto-create — PASS;
- display name из Google metadata — PASS;
- возврат в Cloudflare Pages frontend — PASS после настройки Supabase Auth URL Configuration.

Supabase callback:

`https://xkigijaqimzuveyzyzyk.supabase.co/auth/v1/callback`

До подключения custom domain production Auth configuration использует Pages host:

- Site URL: `https://alive-aw2.pages.dev`
- Redirect URL: `https://alive-aw2.pages.dev/**`
- local development redirect при необходимости: `http://localhost:5173/**`

После подключения custom domain production Site URL должен быть переведён на `https://alive.hmnos.ru`.

Google OAuth Client Secret никогда не сохранять в repo, frontend или обычных логах.

## Cloudflare Pages

Status: `PRODUCTION HEALTHY / REDESIGN PREVIEW HEALTHY`.

Dashboard project label: `alive`.

Production host:

`https://alive-aw2.pages.dev`

Production source: `main`.

Активный preview редизайна:

- branch: `v3.0-redesign`;
- branch alias: `https://v3-0-redesign.alive-aw2.pages.dev`;
- atomic preview текущего состояния: `https://e52c8d13.alive-aw2.pages.dev`;
- Cloudflare Pages check: PASS;
- GitHub frontend typecheck/build: PASS.

2026-08-15 единичный `DNS_PROBE_FINISHED_NXDOMAIN` на мобильном устройстве не подтвердился как outage: production host и preview deployments фактически доступны. Не считать это инфраструктурным blocker без повторяемого подтверждения.

Canonical host: `https://alive.hmnos.ru`.

Состояние на 2026-08-25 — подготовлено, ждёт делегирования:

| Что | Состояние |
|---|---|
| Зона `hmnos.ru` в Cloudflare | создана, статус `initializing` |
| Назначенные NS | `ben.ns.cloudflare.com`, `cloe.ns.cloudflare.com` |
| NS у регистратора | **не переключены** — это единственный оставшийся шаг, и он у владельца |
| Custom domain на Pages-проекте `alive` | `alive.hmnos.ru` добавлен, статус `initializing`, сертификат Google |
| DNS-запись | `CNAME alive.hmnos.ru → alive-aw2.pages.dev`, proxied |
| Supabase Auth Site URL | всё ещё `https://alive-aw2.pages.dev` |

Порядок оставшихся действий обязателен: сначала NS у регистратора, потом дождаться
статуса `active` и выдачи сертификата, и только потом менять Site URL и Redirect URLs в
Supabase. Смена Site URL раньше рабочего домена ломает вход всем.

Отступление от Drift rule ниже зафиксировано осознанно: зона, custom domain и DNS-запись
были созданы в Cloudflare раньше, чем описаны здесь, потому что имена NS-серверов
назначаются при создании зоны и узнать их заранее нельзя. Документ обновлён сразу после.

## Drift rule

Если Dashboard/remote state расходится с repo:

1. не считать ручное изменение новой нормой;
2. определить, является ли remote change ошибкой или желаемым изменением;
3. желаемое изменение сначала оформить в repo;
4. затем синхронизировать remote;
5. обновить этот документ.
