# Validation

Дата: 2026-08-18, дополнено 2026-08-23 после слияния в `main`.

## Прогон на слитом дереве (2026-08-23)

Всё ниже из раздела «Automated» было прогнано 2026-08-18 на ветке
`agent/stabilization-release`, отведённой от `86b4608`. С тех пор `main` ушёл далеко
вперёд, поэтому результаты той ветки сами по себе ничего не говорят о том, что
получилось после слияния. Прогон повторён на фактическом merge-коммите:

- `npm run format:check`: PASS;
- `npm run lint`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS, 3 файла / **26** тестов (было 15 — добавлены проверки анонимной
  границы, см. ниже);
- `npm run build`: PASS, с тем же предупреждением о JS chunk > 500 kB;
- `node scripts/scan-bundle-for-secrets.mjs app/dist`: PASS (шаг из `main`, которого
  не было в ветке рефакторинга);
- `supabase/tests/local/run.sh` на чистом локальном PostgreSQL: ALL PASS, включая
  анонимный блок (каталоги читаются, 0 строк из 11 приватных таблиц).

### Тест анонимной границы усилен

`app/src/rls-migrations.test.ts` из ветки рефакторинга проверял отсутствие
`grant ... to anon` только для четырёх таблиц. После того как `main` **легитимно**
добавил `to anon`-гранты на восемь редакционных каталогов, эта проверка стала
нагруженной: в тех же файлах миграций теперь есть строки `to anon`, и следующая
миграция могла бы расширить поверхность незаметно. Список расширен до всех 11 таблиц
с личными данными — тех же, что проверяет анонимный блок в
`supabase/tests/local/03_rls_isolation_test.sql`. Добавлена вторая проверка: каждая
анонимная select-политика обязана фильтровать `published = true`, чтобы черновики
редакции не были видны без аккаунта.

Обе новые проверки проверены на срабатывание, а не только на прохождение: временно
добавленный `grant select on public.episodes to anon` роняет первую, временная
политика без фильтра `published` — вторую.

### Визуальная проверка после разбиения `RedesignApp`

Рефакторинг вынес из `RedesignApp.tsx` хелперы, оболочку и bootstrap сессии, поэтому
рендер проверен заново, а не принят на веру. Playwright, реальная production-сборка
слитого дерева, экраны без входа (`/`, `/experiment`, `/releases`) на всех 5 baseline-
ширинах, с подставленным каталогом, чтобы `PublicHome` рендерился целиком (28
триггеров, 3 секции), а не в состоянии загрузки.

Найдены и исправлены **два реальных дефекта**, ни один из которых не был внесён
рефакторингом — оба существовали в `main`:

1. `.r-header` при ширине ≤760px имел горизонтальный padding 14px, то есть бренд-кнопка
   отстояла от края на 14px при baseline-минимуме 16px. Предыдущий проход измерял
   отступ только на `/experiment` и `/releases`, которые используют `.r-reading` и
   `Brand compact`, — шапку основного приложения он не покрывал, поэтому дефект и
   дожил до этого прогона. Исправлено на 16px; затрагивает `PublicHome` и все экраны
   за логином;
2. `/releases` при 360px давал горизонтальное переполнение 7px. Причина конкретная:
   `.r-release` — сетка `90px 1fr`, а заголовок «Универсальная платформа» набран 26px,
   где одно слово «Универсальная» рендерится в 230px при доступной колонке 174px.
   Слово неразрывное, поэтому колонка распирала строку. Исправлено не уменьшением
   шрифта до нечитаемого, а раскладкой в одну колонку при ≤430px.

После правок: 0 horizontal overflow, 0 touch-target < 44px, бренд ≥16px от края на
всех 18 сочетаниях ширина × маршрут, 0 page errors.

## Automated (прогон 2026-08-18 на ветке)

## Automated

- `npm run format:check`: PASS;
- `npm run lint`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS, 3 files / 15 tests;
- `npm run build`: PASS, с предупреждением о JS chunk > 500 kB.
- GitHub Actions `ALIVE frontend CI` run `#325`: PASS.

## Local production smoke

- root render: PASS;
- direct routes `/links`, `/path`, `/meanings`, `/experiment`, `/profile`: PASS;
- browser console errors: 0;
- authenticated flows: не запускались локально, потому что production preview собирался без Supabase env.

## Cloudflare preview smoke

- deployment commit `b53a303`: PASS;
- root login screen и Google login control: PASS;
- public direct route `/experiment`: PASS;
- direct routes `/links`, `/path`, `/meanings`, `/profile`: PASS, URL сохраняется и unauthenticated user получает login screen;
- browser console errors: 0.

## Manual owner validation

- открыть Cloudflare preview root и прямые routes `/links`, `/path`, `/meanings`, `/experiment`, `/profile`;
- проверить Google OAuth redirect;
- пройти onboarding существующего тестового пользователя;
- создать и удалить тестовый эпизод, Связку и Смысл;
- проверить mobile navigation и desktop header;
- искусственно проверить error boundary в dev/test environment при необходимости.

## Not covered

- полный local Supabase reset через Supabase CLI — Docker поднимается, но реестры
  образов закрыты сетевым allowlist; см. `releases/v3.0-platform/VALIDATION.md`;
- bundle code splitting — предупреждение о chunk > 500 kB остаётся открытым;
- экраны за логином после разбиения `RedesignApp` инструментально не осмотрены: у AI
  нет живой сессии. Автоматика (typecheck, lint, 26 тестов, сборка) их покрывает
  структурно, но не визуально — это остаётся за владельцем на preview.

Двухпользовательский RLS isolation test закрыт отдельно: локальный прогон против
настоящих миграций плюс живой тест владельца двумя Google-аккаунтами 2026-08-22, см.
`releases/v3.0-platform/VALIDATION.md`.
