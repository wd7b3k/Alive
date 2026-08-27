# Текущее состояние Habitoff

## Ярлык на телефоне и правило знака 27.08.2026

Ветка `merge/pilot-with-vps`. Решение — `docs/decisions/ADR-0007-home-screen-shortcut.md`.

**Связки окрашены в наблюдение.** Иконки личных Связок и карточек карты контекстов —
`--r-observe`. Расширение закрытого списка ADR-0005 с пяти селекторов до семи, по решению
владельца. Карточки выбора в сценарии тяги остаются бирюзовыми: там человек выбирает, а не
замечает.

**Ярлык на домашнем экране.** Собран набор иконок: `any` (66 % знака), `maskable` (50 %,
внутри безопасного круга), `apple-touch` (квадрат без скругления), фавиконы с утолщённой
обводкой. Все залитые, без прозрачности — скругление принадлежит системе. Прежний
`icon-512` стоял в манифесте и как `any`, и как `maskable`, а годился ни туда ни туда.

Попутно нашлось, что **`viewport-fit=cover` отсутствовал**: вся безопасная зона в
`redesign.css` на iPhone с чёлкой была мёртвым кодом, `env()` возвращал ноль. Добавлены
мета-теги iOS, `theme_color` приведён к `#061013`, добавлен `shortcuts` — долгое нажатие
на ярлык открывает «Хочу курить» через `/?flow=1`.

**Предложение поставить ярлык** показывается один раз сразу после настройки и постоянно
живёт в Профиле. На iPhone честно сказано: первый заход внутри ярлыка попросит войти ещё
раз, потому что у приложения с домашнего экрана своё хранилище, отдельное от Safari.

**Строгое правило применения знака** — `BRANDBOOK.md` §3, проверяется тестом
`app/src/brand-usage.test.ts`. Знак — это файл; имя, стоящее отдельно, ставится знаком, а
не текстом. Нашлись два нарушения: экран ошибки интерфейса и «Личная карта не загрузилась»
ставили `<p class="r-kicker">Habitoff</p>`, где `off` переставал быть жёлтым. Исправлены.

138 тестов, `tsc`, `eslint`, `prettier`, `vite build` — чисто. 11 экранов × 65 ширин — 0 нарушений.


## Прод обновлён 27.08.2026

Выложен релиз `20260827-131035` с ветки `merge/pilot-with-vps` (`92021fe`). Прод больше
не собирается с ветки, которой нет на GitHub: `chore/vps-deploy` запушена и влита сюда же.

Миграции применены на боевой базе: пять файлов `20260827*`, из них переименование контента
затронуло **89 значений** — 63 описания замен, 4 инструкции, по 3 карточки фактов и мифов,
разбор мифов, микроосознанность, границы утверждений, названия методики и модели
эквивалентности.

**Проверено снаружи:** заголовок страницы и `llms.txt` называют продукт Habitoff, слова
ALIVE на витрине нет. CSS на сервере (`index-xTewrqEx.css`) побайтово совпадает с
собранным и проверенным локально: `--r-observe` есть, `--r-amber` нет.

**Не проверено снаружи и требует браузера:** экран входа, мост Яндекса
(`/functions/v1/yandex/start` закрыт `robots.txt`), экраны за входом, раздел «Гипотезы»
на `/health`. Содержимое js-бандла удалённо не проверяется — он отдаётся обрезанным.

**Слияние с веткой сервера.** Утренняя поломка входа через Яндекс — ровно тот конфликт,
о котором предупреждал `ROLLOUT.md` §3.2: была выложена сборка с ребрендингом, но без
моста, и кнопка ушла в `signInWithOAuth('yandex')`, а GoTrue в self-hosted про Яндекс не
знает. В `merge/pilot-with-vps` мост и обмен `token_hash` на месте, порядок
`consumeBridgeToken` → `getSession` → `recordConsent` сохранён.

**Словесный знак перерисован.** В нарисованных руками контурах были дефекты: у `b`
торчал шпор ниже базовой линии, у `t` верх и низ были срезаны по диагонали. Контуры
получены заново из Inter Semi Bold с настоящим шейпингом. Пропорции файла изменились с
152 × 32 на 122 × 32, ширины в CSS пересчитаны так, что видимая высота знака не
изменилась: 44 / 40 / 61 px на телефоне, планшете и десктопе. Карточка для ссылок
`brand-logo-full.png` пересобрана из того же файла.

**Осталось до первых участников:** бэкапы и проверенное восстановление. `ROLLOUT.md` §5.


## Готовность к пилоту 27.08.2026

Ветка `feat/pilot-readiness` от `redesign/habitoff-system`, коммит `4020f25`.
**Запушена 27.08.2026.** Это то, что раскатывается: она включает всё нижеследующее.
Решение — `docs/decisions/ADR-0006-pilot-readiness.md`. Порядок раскатки — `docs/ROLLOUT.md`.

Проверка перед пилотом нашла семь вещей, каждая из которых по отдельности выглядела
мелочью, а вместе они означали, что эксперимент можно провести и не узнать ничего.

| Что было | Что стало |
|---|---|
| прод отдаёт страницу с заголовком «…— ALIVE» | ребрендинг раскатывается этой веткой |
| 153 пользовательские строки каталогов со словом ALIVE | переименованы миграцией; `ALIVE` убран из белого списка латиницы |
| согласия участника не существует | галочка на входе, версия и дата в профиле |
| H-ALIVE-002 не считается никогда | эпизод хранит показанный список, порядок и признак персонализации |
| формул метрик нет нигде | `admin_hypothesis_metrics(days)` и раздел «Гипотезы» на `/health` |
| ползунки пишут 7 / 4 / 3, которых человек не давал | начальное «не отвечено», в базу уходит null |
| из первичной настройки нет выхода, пустые поля молча = 0 | выход «Пока просто посмотреть», пустое поле = «не знаю» |

**Девять метрик из документа гипотез посчитать нечем**, и витрина показывает их строкой
«нечем считать» с объяснением, а не нулём. Список — в `docs/HYPOTHESES_AND_METRICS.md`.
Он показывает, на какие вопросы пилот ответить не сможет, до того, как пилот начнётся.

**Прогон на чистой базе:** 50 миграций на пустом Postgres 16, затем
`supabase/tests/local/run.sh` — RLS isolation ALL PASS. Каталоги после прогона: 19 фактов,
19 мифов, 28 триггеров, 11 потребностей, 74 замены, ноль вхождений ALIVE в читаемом
тексте.

**Блокирующий пункт перед тем, как звать людей — бэкапы.** Не настроены, восстановление
не проверялось. `docs/ROLLOUT.md` §5.

## Цвет наблюдения, вход и вёрстка 27.08.2026

Ветка `redesign/habitoff-system`, коммиты `6d9961a`, `67c5371`, `e87e02e`.
**Запушена 27.08.2026.** Влита в `feat/pilot-readiness`.

**Вход на habitoff.ru работает.** Проверено владельцем 27.08.2026. Экран входа
переделан: кнопки провайдеров со знаками Google и Яндекса, подпись о том, что
произойдёт при нажатии, две колонки от 900 px. Живой вход через Яндекс всё ещё стоит
пройти руками отдельно от Google. Подробности экрана — `docs/SCREENS.md` §14.

**Введён цвет наблюдения.** `--r-observe` `#f2ca69` — тот же цвет, что точка над
разрывом кольца в знаке и слог `off` в написании. Он отмечает пять моментов, где
продукт просит заметить автоматизм, и больше ничего не значит. Список закрыт тестом:
шестой селектор роняет сборку.

Чтобы код читался, цвет освобождён от прежних значений. `--r-amber` удалён.
Употребление никотина стало нейтрально серым (`--r-muted`) — оно и не должно было
выглядеть предупреждением при обещании «просто факт, без оценки». Миф ушёл в
`--r-red` как опровергнутое утверждение. Цель типа «ценность» — в `--r-sand-dim`.
Уровень доказательности B перестал быть бирюзовым: доказательность — порядковая шкала
`--r-ok` → `--r-ok-dim` → серый, а бирюза значит действие.

Решение — `docs/decisions/ADR-0005-observation-colour-and-sign-in.md`.

**Починена вёрстка.** Пять расхождений, найденных поэлементным прогоном:

| Ширина | Что было | Причина |
|---|---|---|
| 320–760 | блок действий 403 px в окне 390, правая колонка за краем | планшетное правило ставило вторичным действиям `grid-column:2`, мобильное меняло только число колонок — явная вторая колонка создавала неявный трек |
| 1001–1100 | «Войти» за краем на 7 px | шапка ужималась только с 1000 |
| любая | `css-invariants.test.ts` был красный | меню в ужатой шапке набрано мимо шкалы (`gap:2px`, `padding:8px 10px`) |
| ≤380 | карточки фактов на 3 px шире экрана | неразрывное слово задавало min-content шире вьюпорта |
| 1001–1160 | заголовки вторичных карточек ломались | жёсткие `1fr 1fr` в узкой правой колонке |

**Признак переполнения, которым пользоваться нельзя:**
`document.documentElement.scrollWidth − clientWidth`. При содержимом 403 px в окне
390 он возвращает **0** — часть переполнения съедается обрезкой у предка. Рабочая
проверка обходит каждый элемент и сравнивает его правую границу с шириной окна.
Прогон перед показом: 7 экранов × 65 ширин 320…1600 — 0 нарушений.

**Известное расхождение, не исправленное намеренно:** цель типа «курс» остаётся
бирюзовой, то есть носит цвет действия. Свести цель, ценность и курс к одному цвету
правильно по смыслу, но это отдельная работа с просмотром экрана Смыслов. Записано в
ADR-0005.

## Инфраструктура и редизайн 26.08.2026

**Прод переехал на собственный VPS**, адрес — `https://habitoff.ru`. Cloudflare Pages
в схеме больше не участвует. Канонические адреса приведены к новому домену:
`app/src/services/seo.ts` (`ORIGIN`), `app/index.html` (canonical, og:url, og:image,
три блока JSON-LD), `app/public/robots.txt` (`Host`, `Sitemap`), `sitemap.xml`, `llms.txt`.

**Вход не работал** после переезда. Починено 27.08.2026. Порядок проверки, если
сломается снова: Supabase Auth Site URL и Additional Redirect URLs → Google Cloud
OAuth origins и redirect URIs → Яндекс OAuth redirect URI → `VITE_APP_ORIGIN` в
окружении сборки. Диагностика по симптому: `redirect_uri_mismatch` — провайдер,
возврат на старый домен — Supabase или переменная.

**Дизайн-система собрана.** `--r-lime` выведен, роли цвета разделены: teal — действие,
песочный — человек и личное, `--r-ok`/`--r-dim` — подтверждённость. (`--r-amber` из
этой группы выведен 27.08 — см. раздел выше.)
23 радиуса сведены к 5 ступеням, 32 размера шрифта — к 10, отступы — к шкале из 8.
381 значение приведено к ступеням. Шкалы держит `css-invariants.test.ts`: четыре новых
теста роняют сборку при первом же значении вне шкалы. `--r-dim` подтянут до `#7d9291` —
на светлой поверхности он давал 4.16 и не проходил AA.

Решение — `docs/decisions/ADR-0004-design-system.md`. Документация —
`docs/DESIGN_SYSTEM.md`, `docs/BRANDBOOK.md`, `docs/SCREENS.md`.

**Главная кнопка** — «Хочу курить\*» со сноской «\* для вэйперов, конечно же, — парить».
Звёздочка `aria-hidden`, кнопка связана со сноской через `aria-describedby`.
Понятие «тяга» не переименовано: 16 мест интерфейса плюс `craving_before` и воронка
H-ALIVE-001.

**Отложено с записанной причиной:** count-up, draw-in графиков, skeleton-shimmer;
нормализация `margin`; дубли запросов `facts_catalog` и `myths_catalog` на первом экране.

## Ребрендинг 26.08.2026

До 26.08.2026 продукт назывался **ALIVE**. Решение и его границы —
`docs/decisions/ADR-0003-rebrand.md`.

- Имя: **Habitoff**. В прозе — одно слово, одна заглавная; `HabitOff` и `habitoff`
  допустимы только как технические идентификаторы.
- Домен `habitoff.ru` оплачен. **Прод адрес пока прежний** — переключение выполняет
  ветка инфраструктуры, эта ветка адреса не трогала.
- **Слаг репозитория остаётся `wd7b3k/Alive`.** Переименование репозитория ломает
  remotes у всех клонов и является отдельным инфраструктурным действием.
- Знак: разомкнутое кольцо с точкой в разрыве, `app/src/assets/brand-mark.svg`.
  Om выведен по прямому запросу владельца — исключение, предусмотренное
  `RELEASE_POLICY.md` §7. Om-гейт в `docs/V3_VISUAL_UX_BASELINE.md` снят,
  Om-чекбокс в `releases/v3.0-platform/VALIDATION.md` закрыт как снятый, а не пройденный.
- Растровый комплект иконок и OG-картинка перевыпущены. PNG-лого на 363 КБ удалён:
  словесный знак теперь SVG на 2,8 КБ и инлайнится в бандл.

**Палитра не менялась, и это решение, а не пропуск.** Предложение вывести `--r-lime`
отозвано: лайм — основной цвет действия, им залиты CTA «Меня тянет» и кнопка «Войти»,
и он же кодирует уровень «хорошо подтверждено» и тип карточки-мифа. Его вывод
обесцветил бы главное действие и переписал эпистемическую разметку побочным эффектом
переименования. Знак использует существующие `--r-teal` и `--r-amber`; новых токенов
не заведено. Вопрос о втором акценте остаётся открытым и требует своего решения.

**Анимационный промт от 23.08 в этой ветке не исполнен — сознательно.**
`css-invariants.test.ts` требует ровно одного объявления `.r-button`, `.r-button.primary`
и `.r-button.ghost`; главная CTA «Меня тянет» — не `.r-button.primary`, а составная
карточка в двух местах `RedesignApp.tsx`, и её анимация потребовала бы правки разметки.
count-up, draw-in и skeleton требуют JavaScript на самом тяжёлом экране при бандле 587 КБ
и 30 запросах к Supabase на первом экране — а этот паттерн переделывает ветка переезда
на VPS. Условие возврата: после того как переезд закроет вес бандла и число запросов.

**Заодно закрыто:** `app/package.json` — `alive-web` → `habitoff-web`, версия
`3.0.0-dev` → `3.1.0` (не совпадала с выпущенным v3.1); устаревшая строка «Google нужен
только для входа» переписана провайдер-независимо, способов входа два.

**`grep -ri alive` по репозиторию не пуст, и это объяснено.** Не тронуты:
`supabase/migrations/**` (там `alive` — имена функций, таблиц, колонок и значения ключей,
на которые ссылаются строки в проде), имена RPC в коде приложения, адреса
`alive.hmnos.ru` и `alive-aw2.pages.dev`, `releases/**`, `docs/ai_sessions/**`,
`ADR-0001` и `ADR-0002` — записи о том, что было сделано под прежним именем.


## Статус

Habitoff — самостоятельный private repository `wd7b3k/Alive`.

Текущая стадия: **Habitoff v3.1 — RELEASED TO PRODUCTION** (24.08.2026, коммит `428af9e`,
хост `https://alive-aw2.pages.dev`). Release unit —
`releases/v3.1-together-facts-meanings/`.

Выпуск свёл две разошедшиеся истории: прод был построен из трёх веток, которые никто не
мержил в `main`, и с 24.08 репозиторий снова описывает то, что реально работает. В
`schema_migrations` 44 записи из 45 файлов; недостающая `20260821140000` и то, что с ней
делать, описаны в `releases/v3.1-together-facts-meanings/MIGRATION.md`.

Что вышло к людям: «Факты», «Смыслы» на `goals_catalog`, «Вместе», закрытый экран
здоровья продукта, выгрузка и удаление аккаунта. Что осталось за границей выпуска:
канонический домен, ротация ключей Supabase, `awareness_content` и политика хранения
аналитики.

Раздел «Факты» добавлен 2026-08-23 поверх слоя доказательности, который уже был в
проде, но никогда не показывался. Правило раздела вынесено в схему, а не в договорённость:
`scope_note_ru` — `not null`, поэтому ни одна карточка не выходит без указания границ
доказательства, а опубликованная карточка уровня A или B без источника отклоняется
триггером. Три популярных утверждения сознательно не публикуются, потому что источника у
них нет: «тяга длится 3–5 минут», «вейп на 95% безопаснее» и любое соотношение
«один кальян = N сигарет».

Stabilization-рефакторинг (бывший PR `#10`, ветка `agent/stabilization-release`) слит в
`main` 2026-08-23. Он не добавляет продуктовых функций и migrations: ErrorBoundary,
разбиение `RedesignApp` на `redesign/`, `hooks/`, `services/`, `domain/`, react-router
вместо ручного `pushState`, prettier/eslint/vitest и SPA-fallback `_redirects` для
Cloudflare Pages. Проверено на самом merge-коммите, а не на исходной ветке — см.
`releases/v3.0-stabilization/VALIDATION.md`.

`wd7b3k/Alive` — единственный source of truth. Код, migrations, product rules и release gates меняются сначала в repo; Dashboard/чат не переопределяют repo.

## Живая инфраструктура

- Frontend: React + TypeScript + Vite.
- Hosting: Cloudflare Pages.
- Текущий production host: `https://alive-aw2.pages.dev`.
- Planned canonical host: `https://alive.hmnos.ru`. На 24.08.2026 домен не делегирован
  у регистратора; выпуск v3.1 сознательно не ждал его и живёт на `pages.dev`.
- Auth: Google → Supabase Auth. Since 2026-08-22 sign-in is no longer a wall on the
  first screen: the interface opens immediately with the published catalog readable
  anonymously, and Google sign-in is raised only when the person does something that
  genuinely needs an account.
- Database: Supabase PostgreSQL + RLS.
- Supabase project: `xkigijaqimzuveyzyzyk`, `eu-west-1`.
- GitHub CI: Node `22.12.0`, `npm ci`, format check, lint, typecheck, 67 тестов, production build, скан бандла на секреты и прогон RLS-изоляции на чистом PostgreSQL.

Google OAuth проверен реальным входом: Auth user и Habitoff profile автоматически создаются, display name/avatar приходят из Google metadata.

## Ключевое решение после первого platform bootstrap

Первый web-shell был технически рабочим, но продуктово значительно беднее legacy v2.7. Это признано regression.

Создан обязательный baseline `docs/V3_PARITY_BASELINE.md`:

**v3.0 не может считаться готовым, если новый пользователь получает менее глубокий продукт, чем v2.7.**

Новая архитектура должна сохранить минимум глубины v2.7 и добавить утверждённые возможности v3.

## Реализовано на `main`

Код прошёл путь `v3.0-platform` → `v3.0-hardening` → `v3.0-redesign` и на 2026-08-15
слит в `main` (tip `86b4608`) линейными коммитами. Разработка сейчас ведётся не в
ветке `v3.0-platform` (она отстаёт от `main`) — см. подробный снимок веток и открытый
вопрос по фактическому PR-статусу в `docs/INFRASTRUCTURE_STATE.md`.

### Product UI

- universal onboarding / personal baseline;
- cigarette / hookah / vape как отдельные raw products;
- product role: `target_dependency` / `cessation_bridge`;
- Сегодня — action screen, current metrics, attention links, recent episodes;
- guided craving flow: product → trigger → need → 3 contextual replacements → outcome;
- quick nicotine fact logging без выдумывания craving score;
- evening check-in;
- Связки — automatic trigger map + private user Links;
- Смыслы — global universal catalog + private CRUD/UGC workflow;
- Путь — 7-day динамика, raw products, personal replacement effectiveness, Freedom Fund, rewards;
- Profile/baseline;
- Эксперимент — methodology, assumptions, limitations, privacy;
- Релизы;
- deletion of erroneous/test episode with recalculation from remaining facts;
- inline explanations / `nothing unexplained` pattern;
- public pre-login browsing of the published catalog (`PublicHome` in `RedesignApp.tsx`);
- «Факты и Мифы» — 6 фактов и 9 мифов с уровнем доказательности, границами применимости
  и проверенными источниками; отдельный раздел плюс контекстный показ в потоке тяги, в
  Связках, на Сегодня и на первом экране до входа.

### Content depth

Remote catalog after product-depth migrations:

- 28 published triggers;
- 74 published replacements;
- 106 trigger→replacement relations (96 until 2026-08-22, when migration
  `20260822130000` added the 10 curated mappings the `tension` and `after_task` triggers
  had been missing);
- 13 universal Meanings;
- 6 фактов и 9 мифов с 18 проверенными источниками (2026-08-23);
- 5 universal identity scripts;
- 13 support messages;
- 7 rewards.

Counts corrected 2026-08-21 after QA against the live deployment found two
byte-identical duplicate catalog entries — the same trigger under `morning`/`wake_up`
and the same replacement under `water`/`water_pause`, each a legacy row from the
initial migration that the later product-depth catalog superseded but never retired.
The previously documented 29/46 counted those duplicates. Migration
`20260821120000_v3_dedupe_legacy_morning_trigger.sql` re-points existing history onto
the canonical codes and drops the orphans; the 96 relations are unaffected (all of
them already pointed at the canonical codes). It was applied to the production project
on 2026-08-21 by the owner.

The replacement count then rose from 45 to 74 for a different reason: applying that
migration surfaced that the production database had diverged from this repository
altogether. 29 replacements existed only in production, three rows had been retitled
there, evidence/curation metadata was present on every production row but absent from
the repo, and 20 columns across `replacements_catalog`, `triggers_catalog` and
`episodes` had been added straight to production. None of it had ever been captured as
a migration, so the "repo is the single source of truth" rule above had quietly stopped
holding.

Per the owner's decision (2026-08-21) production is authoritative, and migrations
`20260821130000_v3_sync_production_schema_drift.sql` (columns) and
`20260821140000_v3_sync_production_catalog_content.sql` (values) bring this repository
back in line with it. Verified by rebuilding a database from these migrations and
comparing it against production field-by-field: aggregate SHA-256 over all 74
replacements' base fields, over their metadata, and over the trigger catalog all match
production exactly. Both migrations are idempotent and are a no-op against production.

Legacy personal biography is intentionally not promoted into global content. Private personal content belongs to the individual user profile.

### Data / privacy

Applied remote migrations:

1. `v3_platform_initial`
2. `v3_platform_security_indexes`
3. `v3_product_depth_schema`
4. `v3_product_depth_catalog_a`
5. `v3_product_depth_catalog_b`
6. `v3_product_depth_mapping`
7. `v3_product_depth_meaning`
8. `v3_support_state_and_account_control`
9. `v3_remove_public_account_delete_rpc`
10. `20260821120000_v3_dedupe_legacy_morning_trigger` — retires the two legacy duplicate
    catalog codes after re-pointing existing history onto the canonical ones;
11. `20260821130000_v3_sync_production_schema_drift` — the 20 columns that had been added
    straight to production;
12. `20260821140000_v3_sync_production_catalog_content` — the catalog values that existed
    only in production. 11 and 12 exist to make a database rebuilt from migrations equal
    production; against production itself they are a verified no-op;
13. `20260822120000_v3_public_catalog_read_for_anon` — anonymous `select` on the eight
    editorial catalogs, `published = true` only, so the product can be explored before
    an account exists;
14. `20260822130000_v3_tension_mappings_and_meaning_titles` — curated replacements for the
    `tension` and `after_task` triggers, and distinct titles for the two `meaning_*`
    replacements that had collided;
15. `20260823120000_v3_normalize_evidence_layer` — `evidence_levels`, `evidence_sources`
    and `replacement_evidence`, backfilled from production's own values. The evidence
    layer existed in production and no screen displayed it;
16. `20260823130000_v3_knowledge_catalog_schema` — `knowledge_catalog`,
    `knowledge_trigger_map`, `knowledge_evidence`; a published card claiming evidence
    level A or B without a citation is rejected by a constraint trigger;
17. `20260823140000_v3_knowledge_catalog_content` — 18 sources, 6 facts, 9 myths.

RLS protects private user-owned entities. Service-role/OAuth secrets are not stored in frontend/repo.

A proposed public `SECURITY DEFINER` self-delete RPC was rejected after Security Advisor
flagged the exposed surface. It was removed by migration before alpha merge. Account
deletion uses an authenticated Edge Function instead —
`supabase/functions/delete-account/index.ts`, deployed to the live project on 2026-08-22
and tested in both directions: without a session it returns `401
{"error":"authentication_required"}` (fails closed), and with a real session on a
throwaway account it actually deletes. No UI button is wired to it yet.

Anonymous read access, added 2026-08-22 so the product opens before sign-in, is
deliberately narrow: `select` only, `published = true` only, on the eight editorial
catalogs only. Every table holding personal data stays `authenticated`-only and
owner-scoped, and `supabase/tests/local/03_rls_isolation_test.sql` now asserts exactly
that for the `anon` role — a future migration that widens the anonymous surface fails
the test instead of leaking quietly.

Current Supabase Security Advisor has one remaining Auth warning: leaked-password protection is disabled. Habitoff currently exposes Google OAuth only, not password sign-in, so the warning does not represent an active password-login surface. Revisit before ever enabling password auth.

## CI state

Latest rich product frontend commit passes:

- locked dependency install — PASS;
- TypeScript typecheck — PASS;
- Vite production build — PASS.

## Still required before v3.0 can be called RELEASED

Updated 2026-08-22. `releases/v3.0-platform/VALIDATION.md` now stands at **36 of 38
checks passed**. What follows is what is genuinely still open, not the historical list.

Release gate items still open (2 of 38):

- Supabase CLI local stack (`npx supabase start`) — never literally run: no environment
  available to this work has a reachable Docker image registry. Docker itself starts;
  the images do not pull;
- `supabase db reset` — the same blocker. The substance behind both items ("a database
  rebuilt from migrations equals production") is proven separately: aggregate SHA-256
  over all 74 replacements' base fields, over their metadata, and over the trigger
  catalog all match production exactly, and the migrations run against a clean Postgres
  in CI on every PR. What is unproven is the CLI tool itself, not the equivalence.

Product work deliberately left outside the v3.0 gate (implemented data layer, no UI):

- user data export UI — `exportMyData()` exists in `app/src/actions.ts` and typechecks,
  but nothing in the interface calls it, so export has never been exercised as a user
  scenario;
- account deletion UI — the Edge Function is deployed and tested in both directions, but
  no button is wired to it; deletion currently requires a direct call;
- full user Link edit/disable controls — create and soft-delete exist (`data.ts`
  `createLink`/`deleteLink`); editing an existing Link and toggling `active` do not;
- background NRT patch UI — DB/RLS support exists, the interface does not.

Infrastructure:

- `alive.hmnos.ru` DNS / custom-domain cutover — production still serves from
  `alive-aw2.pages.dev`;
- optional: add the Cloudflare preview-domain wildcard to Supabase Allowed Redirect URLs
  so signed-in flows can be tested on branch previews, not only on production.

Closed since the previous revision of this list, each with evidence in VALIDATION.md:
runtime smoke-test of the deep UI (owner, live, 2026-08-22), the two-Google-account RLS
isolation test, the UGC explicit-consent behavioural test, account deletion positive and
negative tests, mobile/desktop parity, the mobile safe-zone and brand-inset layout bugs,
the two duplicate catalog entries, the uncurated `tension`/`after_task` triggers, the
colliding replacement titles, the production↔repository divergence, and the browser
bundle secret scan (now a permanent CI step).

`Together` remains v3.1. Admin/Product Intelligence remains v3.2.

## Release discipline

Deploying a v3.0 alpha for real testing does **not** mean the release gate is complete. `v3.0 RELEASED` is reserved until `releases/v3.0-platform/REQUIREMENTS.md` and `VALIDATION.md` pass.
