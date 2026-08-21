# Response / Handoff — блок C: реальные privacy/security проверки без живых credentials

Дата: 2026-08-20

## Result

Сделано существенно больше, чем "написать тесты на будущее" — там, где это было
физически возможно без живых Supabase/Google-секретов, проверки реально прогнаны в
этой сессии и дали настоящий PASS. Там, где это невозможно без live-credentials (RLS
против самого Supabase, деплой Edge Function, живой login), явно оставлено
непройденным с описанием, что именно сделано вместо этого и в чём разница.

Ветка: `docs/audit-followup-block-c` (поверх `docs/audit-followup-block-a-b`, не
поверх `main` — чтобы правки в одном и том же `VALIDATION.md` не конфликтовали между
PR). PR: не создан этой сессией. Validation: см. по пунктам ниже — часть реально
прогнана, часть нет, разграничено явно.

## RLS isolation (`RISK-V3-001`)

В этой сессии нет Docker daemon (`docker info` → `failed to connect... daemon is
not running`), поэтому `npx supabase start`/`db reset` (реальный Supabase CLI-стек)
не запустить. Вместо этого: локальный PostgreSQL 16 (уже установлен в среде,
`pg_ctlcluster 16 main start`) + минимальный `auth`-шим
(`supabase/tests/local/00_auth_shim.sql`: таблица `auth.users`, функция `auth.uid()`
по контракту `current_setting('request.jwt.claim.sub')`, роли
`anon`/`authenticated`/`service_role`) — максимально близкий к Supabase, но не
идентичный ему подход (нет PostgREST, нет GoTrue, нет реальной верификации JWT).

На этом стенде реально прогнаны **настоящие, неизменённые** миграции репозитория
(`supabase/migrations/*.sql`, все 9 файлов, без ошибок), засеяны два тестовых
пользователя (триггер `handle_new_auth_user` отработал как в проде — `profiles`/
`user_settings` создались автоматически), и по одной приватной строке на каждую из
10 RLS-защищённых таблиц. Как `authenticated` с JWT-claim пользователя A:

- SELECT чужих (user B) private rows по всем 10 таблицам — 0 совпадений;
- UPDATE/DELETE чужих private rows — 0 задетых строк;
- INSERT с чужим `user_id` в `episodes` — отклонён политикой `with check`;
- контроль: собственные строки пользователь A по-прежнему видит (иначе результат
  мог значить "политика слишком строгая", а не "изоляция работает");
- отдельно проверено: без identity (`request.jwt.claim.sub` пуст) — 0 видимых строк,
  RLS не открывается по умолчанию.

Всё **ALL PASS**, воспроизведено дважды (интерактивно и через оформленный `run.sh`
целиком, включая cleanup). Оформлено как постоянный тест:
`supabase/tests/local/{00_auth_shim,01_seed_users,02_seed_private_data,
03_rls_isolation_test}.sql` + `run.sh` + `README.md` (там же — честное описание, что
это доказывает, а что нет). Добавлена CI job `rls-isolation` в
`.github/workflows/frontend-ci.yml` с `postgres` service container — будет
автоматически прогоняться на каждый будущий push/PR, без единого живого секрета.

**VALIDATION.md**: чек-бокс "user A → private rows user B = denied" **не отмечен**
как пройденный — только описан как "сильное, но не окончательное свидетельство".
Живой smoke-test с двумя реальными Google-аккаунтами остаётся отдельным требованием.

## Secret scan (`RISK-V3-002`)

Это не требовало живых credentials вообще — статический анализ уже собранного
production-бандла. Написан `scripts/scan-bundle-for-secrets.mjs`: ищет паттерны
`sb_secret_...`, `service_role` в JWT-claim, `GOCSPX-...` (Google OAuth secret), PEM
private key блоки, AWS access key id, generic `SERVICE_ROLE=`/`CLIENT_SECRET=`
присваивания. Реально прогнан против настоящего `app/dist` (после `npm run build`) —
**0 совпадений, PASS**. Проверен на срабатывание: подложенный тестовый секрет в
копии бандла — пойман, `exit code 1`. Добавлен постоянным шагом в CI
(`frontend-ci.yml`, job `frontend`, после `Build`).

**VALIDATION.md**: чек-бокс **отмечен как пройденный** — это единственный пункт
блока C, который в буквальном смысле прогнан против настоящего артефакта (production
bundle), а не приближения/локальной копии.

## UGC-consent (`RISK-V3-008`)

Структурная проверка (не поведенческий тест против живой БД): в `supabase/migrations/`
нет ни одного trigger/function, автоматически переносящего `user_meanings`/
`user_links` в `meanings_catalog`/`replacements_catalog`. Единственный путь —
явный insert в `ugc_submissions` через `submitMeaning`/`submitLink`
(`app/src/data.ts`), которые в `RedesignApp.tsx` вызываются только по клику на кнопку
«Предложить в общую базу». Отдельная находка, зафиксирована как находка, не как
тихо исправленный баг: в уже удалённом (блок B) `App.tsx` этот вызов был обёрнут в
`window.confirm(...)`, в `RedesignApp.tsx` такого диалога нет. Сама кнопка формально
уже является явным действием по тексту `FR-V3-062/063` — нужно ли добавлять
дополнительное подтверждение, решает владелец, это продуктовый, не технический выбор.

**VALIDATION.md**: чек-бокс не отмечен — структурная проверка кода не то же самое,
что behavioural test против живой БД с реальным пользователем.

## Export/delete (gate #9)

Реализовано как код, не протестировано live (нет credentials):

- `app/src/actions.ts`: `exportMyData(session)` — параллельно читает все user-owned
  таблицы (profiles, user_settings, user_nicotine_products, episodes,
  episode_actions, tobacco_events, user_meanings, user_links, daily_checkins,
  daily_support_state, ugc_submissions), полагается на те же RLS-политики, что
  проверены выше, никакой собственной авторизации не добавляет. Без date-window
  ограничений bootstrap-запроса — экспорт должен быть полным, а не операционным
  срезом.
- `app/src/actions.ts`: `deleteMyAccount(session)` — вызывает новую Edge Function.
- `supabase/functions/delete-account/index.ts` — новая Edge Function, заменяющая
  ранее удалённый (миграция `20260815221000`) публичный `SECURITY DEFINER` RPC,
  который Security Advisor пометил как избыточно открытую поверхность. Паттерн:
  сначала верифицирует личность звонящего через его собственный JWT против
  anon/publishable клиента (никогда не доверяет user id, присланному в теле запроса),
  затем удаляет через отдельный admin-клиент на service-role key, который живёт
  только в окружении самой Edge Function — не во frontend, не в git. `on delete
  cascade` в схеме уже гарантирует каскадное удаление всех user-owned таблиц.
- **Не сделано умышленно**: UI-кнопки для export/delete не добавлены в
  `RedesignApp.tsx`. Это необратимое, security-чувствительное действие — вставлять
  его в 60-килобайтный компонент, который я не писал и не могу полноценно
  проверить визуально в этой сессии, было бы безответственно. Отдельное, меньшее
  изменение для этого — сознательный выбор, не забывчивость.
- Edge Function не типопроверена локально (`deno` недоступен в этой сессии) — код
  написан по документированным Supabase-конвенциям, но нуждается в review перед
  деплоем.

**VALIDATION.md**: чек-бокс не отмечен — реализация есть, "tests PASS" нет.

## Проверки, реально прогнанные в этой сессии перед коммитом

`npm run typecheck`, `npm run build`, `node scripts/scan-bundle-for-secrets.mjs
app/dist` (PASS, 0 находок), `supabase/tests/local/run.sh` целиком end-to-end
(включая cleanup) — все PASS на момент коммита.

## Незавершённые пункты

- Реальный `supabase db reset` через настоящий Supabase CLI (нужен Docker daemon,
  которого здесь нет).
- Живой RLS smoke-test с двумя реальными Google-аккаунтами на реальном Cloudflare
  Pages деплое.
- Деплой и тест `delete-account` Edge Function против живого проекта.
- UI для export/delete — сознательно не сделан, отдельное изменение.
- Продуктовое решение: нужен ли `window.confirm()` перед `submitMeaning`/`submitLink`
  в `RedesignApp.tsx`, как было в удалённом `App.tsx`.

Релиз не объявлен `v3.0 RELEASED` — решение остаётся за владельцем.

## Git workflow

- Branch: `docs/audit-followup-block-c`, от `docs/audit-followup-block-a-b`.
- PR: не создан из этой сессии — по тем же причинам отсутствия push-доступа, что и
  в сессиях 001/002. Синхронизация — через мост к устройству владельца, коммит
  локально, push — за владельцем.
- Validation: `npm run typecheck` / `npm run build` / bundle secret scan /
  `supabase/tests/local/run.sh` — все PASS локально на момент коммита. Полный
  список того, что НЕ прогнано (требует live credentials) — см. разделы выше.
