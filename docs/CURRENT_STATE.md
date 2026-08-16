# Текущее состояние ALIVE

## Статус

ALIVE — самостоятельный private repository `wd7b3k/Alive`.

Канонический production line остаётся **ALIVE v3.0 — PRODUCT ALPHA / IN DEVELOPMENT** на commit `86b4608da61b34d6db14648a5d5f591ad6e63bcc`.

В отдельной ветке `agent/v3.1-behavioral-depth-together` собран **ALIVE v3.1 — Behavioral Depth + Together / RELEASE CANDIDATE VALIDATION**.

Draft PR: `#5`. PR не merge, `main` и production не изменены.

`wd7b3k/Alive` — единственный source of truth. Код, migrations, product rules и release gates меняются сначала в repo; Dashboard/чат не переопределяют repo.

## Живая инфраструктура

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Production host: `https://alive-aw2.pages.dev`.
- Branch preview: `https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev/`.
- Planned canonical host: `https://alive.hmnos.ru`.
- Auth: Google → Supabase Auth.
- Database: Supabase PostgreSQL + RLS.
- Supabase project: `xkigijaqimzuveyzyzyk`, `eu-west-1`.
- GitHub CI: Node `22.12.0`, locked install, UI contract, typecheck, production build.

## Канонический frontend baseline

Утверждённый v3.0 shell сохранён:

- `app/src/main.tsx` запускает `RedesignApp`;
- `app/src/redesign.css` остаётся основной дизайн-системой;
- `V31App` и `v31.css` не входят в active entrypoint;
- четыре главных раздела `Сегодня / Связки / Путь / Смыслы` сохранены;
- существующие guided flow, quick nicotine log, evening check-in, corrections, profile, methodology, releases, OAuth и logout сохранены машинным UI contract;
- новый frontend добавлен в существующий shell, без нового root app и без redesign.

## Реализовано в v3.1

### Evidence, catalogs и privacy

- versioned `myths_catalog` и `facts_catalog`;
- 75 опубликованных Замен, 18 mechanisms;
- private `user_myth_state` с RLS;
- privacy-safe `get_together_summary(days)` с suppression threshold 3;
- отдельные evidence reviews и A/B/C classification;
- запрет превращать population evidence в личный медицинский прогноз.

### Additive frontend slices

- product-aware CTA по `target_dependency`;
- guided flow с ярким `Шаг N из M`, отдельной силой тяги, кликабельными достигнутыми шагами и downstream invalidation;
- Replacement Engine с product/context/need/intensity/history ranking и top-3 разных mechanisms;
- не более одного contextual Myth на короткий flow, private relevance actions;
- вторичный `/facts` route с Facts/Myths, evidence level и source links;
- вторичный `/together` route с личным baseline прежде group aggregates и privacy suppression;
- optional cigarette `start_year`, approximate duration и pack-years без личного medical prediction;
- lapse/context-disruption next experiment без shame/reset и с отдельной driving safety формулировкой.

### Logo

Владелец прямо утвердил приложенный PNG как канонический asset для этой интеграции. Exact bytes сохранены без resize/crop/recompress/optimization:

- path: `app/src/assets/brand-logo-full.png`;
- size: 486931 bytes;
- dimensions: 2048×682;
- SHA-256: `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`.

Этот owner gate заменил ранее зафиксированное ожидание другого hash. UI contract обновлён осознанно, а не ослаблен. Владелец подтвердил login, desktop authenticated header и mobile authenticated header.

## Validation

Текущий frontend head до документационного handoff: `c5986676a5eae166fa3ca0a274b5d984c05aa83b`.

GitHub Actions run `#132`:

- UI contract — PASS;
- TypeScript typecheck — PASS;
- Vite production build — PASS.

В `package.json` нет отдельного automated test script/test runner; несуществующий test suite не объявляется пройденным.

Public branch-preview smoke:

- 390×844 login — PASS;
- 820×900 standalone methodology — PASS;
- 1440×960 login — PASS;
- logo loads with correct proportions; visible horizontal overflow не обнаружен.

Owner visual smoke для login и authenticated desktop/mobile logo/header — PASS.

## Открытые release gates

v3.1 ещё не RELEASED и PR остаётся draft до:

- полного authenticated post-change regression прохода Today/guided/quick log/correction/evening/Links/Path/Meanings/Profile/Facts/Together;
- проверки guided back-step/downstream invalidation и save на реальных данных;
- проверки Together suppressed/evaluable состояний;
- полного responsive прохода 390/430/768–820/1280/1440+ для authenticated surfaces;
- второго реального/test account для client-level isolation проверки `user_myth_state`;
- owner review медицински значимого copy;
- финального owner visual approval всего RC.

Успешные migration, CI и branch preview сами по себе не разрешают merge или production deployment.

## Следующий этап после v3.1

Roadmap v3.2 сохраняет два отдельных контура: Admin + Product Intelligence и versioned application/API layer для Web/Telegram/native mobile/future clients. Этот redesign архитектуры не выполняется скрыто внутри v3.1.
