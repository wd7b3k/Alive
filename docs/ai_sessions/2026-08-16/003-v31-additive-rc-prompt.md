Ты продолжаешь разработку проекта ALIVE.

Репозиторий:
wd7b3k/Alive

Рабочая ветка:
agent/v3.1-behavioral-depth-together

Текущий PR:
#5 — ALIVE v3.1: behavioral depth, Myths, Facts and Together

ЦЕЛЬ ЭТОЙ СЕССИИ

Сегодня довести ALIVE v3.1 до нормального, полностью работающего RELEASE CANDIDATE на базе утверждённого v3.0 — без нового редизайна, без потери старого функционала и без создания параллельного приложения.

Не останавливайся после первого небольшого изменения. Работай последовательно вертикальными срезами до полного RC, если не встретишь объективный blocker, требующий решения владельца.

PRODUCTION НЕ МЕРЖИТЬ.
PR #5 оставить draft до финального визуального подтверждения владельца.

==================================================
0. СНАЧАЛА ВОССТАНОВИ КОНТЕКСТ
==================================================

До изменения кода обязательно прочитай полностью и в этом порядке:

1. README.md
2. AGENTS.md
3. docs/CURRENT_STATE.md
4. docs/PROJECT_CHARTER.md
5. docs/PRODUCT_STRATEGY.md
6. docs/METHODOLOGY.md
7. docs/PRODUCT_PRINCIPLES.md
8. docs/BRANDBOOK.md
9. docs/RELEASE_ENGINEERING_RULES.md
10. docs/PRIVACY_AND_DATA.md
11. docs/DATA_MODEL.md
12. docs/HYPOTHESES_AND_METRICS.md
13. docs/ROADMAP.md
14. последний релевантный docs/ai_sessions/**/**-response.md
15. всю документацию releases/v3.1-behavioral-depth-together/
16. особенно:
    - BASELINE_INVENTORY.md
    - UI_REGRESSION_AUDIT.md
    - VALIDATION.md
    - REQUIREMENTS / CHANGELOG / ROLLBACK, если присутствуют
17. последний merged PR/commit, в котором утверждён v3.0 frontend
18. diff v3.0 → текущая ветка для всех frontend-файлов

Затем изучи реальный текущий код:
- app/src/RedesignApp.tsx
- app/src/redesign.css
- app/src/data.ts
- app/src/metrics.ts
- app/src/actions.ts
- app/src/main.tsx
- app/src/ui-icons.tsx
- app/scripts/check-ui-contract.mjs

Перед изменениями составь для себя baseline inventory:

СОХРАНЯЕТСЯ:
весь работающий функционал v3.0.

ИЗМЕНЯЕТСЯ:
только элементы, прямо необходимые v3.1.

ДОБАВЛЯЕТСЯ:
новые функции v3.1.

УДАЛЯЕТСЯ:
НИЧЕГО.

Если считаешь, что что-то старое необходимо удалить или заменить — это owner gate. Не делай этого самостоятельно.

==================================================
1. ЖЁСТКИЙ UI CONTRACT
==================================================

Утверждённый ALIVE v3.0 является baseline.

Обязательные правила:

- app/src/RedesignApp.tsx остаётся root application.
- app/src/redesign.css остаётся основной дизайн-системой.
- app/src/main.tsx продолжает запускать RedesignApp.
- НЕ создавать V31App, V32App, NewApp, NextShell и т.п.
- НЕ подключать v31.css или вторую глобальную design system.
- НЕ переписывать Header, Today, навигацию или приложение целиком.
- НЕ менять глобальный visual language.
- НЕ превращать v3.1 в новый SaaS-template.
- Новый функционал добавляется внутрь существующего ALIVE.
- Использовать существующие r-* patterns и компоненты.
- Если нужен новый компонент — он должен выглядеть как естественная часть текущего RedesignApp.
- Номер версии не является разрешением переписать предыдущую версию.

Критерий:
v3.1 должен ощущаться как «тот же ALIVE, который теперь умеет больше».

==================================================
2. BLOCKER 0 — НЕМЕДЛЕННО ИСПРАВИТЬ ЛОГОТИП
==================================================

ЭТО ПЕРВАЯ ЗАДАЧА. НЕ ПЕРЕХОДИ К ОСТАЛЬНОМУ UI, ПОКА ОНА НЕ ЗАКРЫТА.

Текущий файл:

app/src/assets/brand-logo-full.png

повреждён / не соответствует каноническому owner-approved логотипу.
Именно поэтому в header сейчас отображается крошечный испорченный знак.

НУЖНО ВОССТАНОВИТЬ ТОЧНЫЙ КАНОНИЧЕСКИЙ БИНАРНИК.

Канонический asset:

logo-alive-om.png

Обязательный SHA-256:

11c8624d6ecf84c6a6bb554ca72a7455a0e5c1923ed324fb58c8eeabc42191d2

Это утверждённый горизонтальный логотип ALIVE/Om из канонических v2.6/v2.7/v2.8.

НЕЛЬЗЯ:

- рисовать его заново;
- генерировать новый;
- трассировать;
- делать похожий SVG;
- заменять Ом на ∞;
- собирать новый wordmark;
- модифицировать изображение;
- менять ожидаемый SHA в check-ui-contract.mjs ради зелёного CI;
- лечить проблему только CSS-размером.

Сначала попытайся найти точный canonical binary:

1. в git history / reflog / старых commits / dangling blobs;
2. в старых release artifacts;
3. в локальном workspace;
4. в legacy ALIVE release packages;
5. в canonical v2.6/v2.7/v2.8 Index.html, где логотип был встроен data URI;
6. в доступных backup/rollback artifacts.

Если находишь embedded data URI — программно декодируй его в PNG и ОБЯЗАТЕЛЬНО проверь SHA-256.

Только файл с hash:

11c8624d6ecf84c6a6bb554ca72a7455a0e5c1923ed324fb58c8eeabc42191d2

считается правильным.

После восстановления:
- положи exact bytes в app/src/assets/brand-logo-full.png
  либо используй более правильное имя файла, но без изменения bytes;
- не создавай лишних копий без необходимости;
- убедись, что RedesignApp использует именно этот bundled asset;
- запусти UI contract;
- визуально проверь:
  1. login;
  2. desktop authenticated header;
  3. mobile authenticated header;
  4. standalone / methodology page;
- логотип должен иметь нормальный размер и пропорции, без растяжения;
- визуально сравни с утверждённой прежней версией.

Если exact canonical bytes объективно отсутствуют во всех доступных источниках:
НЕ ИЗОБРЕТАЙ ЛОГОТИП.
Останови только этот blocker и чётко напиши владельцу, какой конкретно файл нужно предоставить.
Остальную разработку можешь продолжить, но RELEASE CANDIDATE не объявлять.

==================================================
3. СОХРАНИТЬ ВЕСЬ V3.0 ФУНКЦИОНАЛ
==================================================

До и после работ должны оставаться рабочими:

- Google OAuth;
- onboarding;
- Сегодня;
- главный CTA тяги;
- quick nicotine log «Никотин уже был»;
- вечерний разбор / Итоги дня;
- pulse metrics;
- исходный уровень;
- сравнение с baseline;
- Фонд свободы;
- карта внимания;
- история эпизодов;
- удаление ошибочного/тестового эпизода;
- автоматический пересчёт показателей после удаления;
- Связки;
- пользовательские Связки;
- add/delete/submit user Links;
- Путь;
- статистика 7/30 дней;
- эффективность Замен;
- Смыслы;
- пользовательские Смыслы;
- add/delete/enable/disable/submit Meanings;
- Identity Scripts;
- Profile;
- изменение исходного уровня;
- методология;
- Releases;
- logout;
- desktop navigation;
- mobile bottom navigation;
- safe areas;
- существующий guided craving flow;
- корректное разделение:
  ситуация → потребность → реальная Замена → итог;
- сигарета/кальян/vape НИКОГДА не называются «Заменой».

Если какой-либо baseline-сценарий пропал — текущий срез FAIL независимо от build.

==================================================
4. ИНТЕГРИРОВАТЬ V3.1 ВЕРТИКАЛЬНЫМИ СРЕЗАМИ
==================================================

Работай последовательно.

После КАЖДОГО среза:
1. маленький осмысленный commit;
2. UI CONTRACT;
3. typecheck;
4. build;
5. релевантные tests;
6. browser smoke-test;
7. сравнение с baseline;
8. убедиться, что старые функции не исчезли.

Не копи гигантский diff.

------------------------------
Срез 1. Today / CTA / язык
------------------------------

Добавь product-aware CTA внутрь существующего Today.

Текст должен учитывать target dependency пользователя там, где это действительно полезно, но не перегружать главный экран.

Весь пользовательский интерфейс — на хорошем естественном русском языке.

Убрать оставшиеся технические англицизмы из видимого UI там, где они не нужны.

НЕ менять существующую композицию Today целиком.

Главная визуальная иерархия текущего Today должна сохраниться.

------------------------------
Срез 2. Guided craving flow
------------------------------

Улучши существующий Guided flow, не создавая новый modal/application.

Нужно:

- ясный progress;
- заметное различие текущего и завершённых шагов;
- завершённые шаги кликабельны;
- пользователь может вернуться назад;
- при изменении предыдущего ответа корректно инвалидируются зависимые последующие данные;
- нельзя сохранить логически противоречивую цепочку;
- сила тяги должна быть понятной самостоятельной частью сценария;
- flow должен ощущаться быстро и удобно именно в момент реальной тяги;
- mobile-first;
- sticky controls не должны перекрывать контент;
- учитывать safe-area;
- touch targets минимум по Brandbook.

Сохраняем исходную концепцию:

ситуация
→ реальная потребность
→ подходящая Замена
→ результат
→ обучение.

------------------------------
Срез 3. Replacement Engine
------------------------------

Используй уже подготовленные данные v3.1.

В базе/ветке уже должны существовать:
- около 75 Replacement;
- 18 различных механизмов.

Не переписывай каталог без причины.

Задача:
подбирать несколько ДЕЙСТВИТЕЛЬНО РАЗНЫХ по механизму ответов под конкретную ситуацию и потребность.

Не выдавать:
- три варианта одной физической активности;
- три почти одинаковых дыхательных упражнения;
- случайный generic wellness list.

Предпочитать разнообразие механизмов, например:
- тело;
- дыхание;
- сенсорный фокус;
- внешний вид/окружение;
- музыка;
- чай/вода;
- пищевой ответ, если уместен;
- дневник;
- собственный Смысл;
- социальный контакт;
- смена контекста;
- короткая задача/фокус;
- НЗТ только как отдельный support type, не как обычная behavioural replacement.

Ранжирование должно учитывать:
- trigger;
- need;
- context;
- прошлую эффективность конкретного пользователя;
- craving;
- доступность/длительность;
- diversity mechanism.

Не обещать медицинскую эффективность.

------------------------------
Срез 4. Contextual Myths
------------------------------

Интегрировать Myths внутрь существующего опыта.

Не делать огромный образовательный портал перед пользователем.

Миф должен появляться контекстно, когда реально помогает разрушить ожидаемую «ценность» курения.

Например:
- «сигарета успокаивает»;
- «она помогает думать»;
- «мне нужна пауза»;
- «без неё я не социализируюсь».

Различать:
- факт;
- научную интерпретацию;
- продуктовую гипотезу.

User relevance/state — private.

Не создавать медицинских персональных прогнозов.

------------------------------
Срез 5. Facts
------------------------------

Добавить полноценный Facts section в существующий shell.

Новый маршрут должен:
- использовать текущий Header/navigation language;
- использовать r-* surfaces;
- выглядеть как ALIVE;
- объяснять источники;
- иметь evidence level;
- не превращаться в scare tactics;
- не выдавать ложную точность.

Продумай его место в IA:
главные четыре поведенческих раздела не должны потерять приоритет.

Если Facts лучше оставить вторичным разделом из Profile/Method/knowledge entry — сделай это, если соответствует документации release.

------------------------------
Срез 6. Вместе
------------------------------

Подключить уже подготовленный privacy-safe Together backend.

Визуально — часть текущего ALIVE.

Показывать только допустимые агрегаты.

ЖЁСТКО ЗАПРЕЩЕНО:
- leaderboard;
- сравнение «кто лучше»;
- приватный пользовательский текст;
- private notes;
- user IDs;
- чужие Смыслы;
- чужие Связки;
- display names, если контракт их не разрешает;
- маленькие cohort slices ниже privacy threshold.

Смысл раздела:
не соревнование, а ощущение «мы проходим сходный процесс» и полезный агрегированный контекст.

Small-group suppression должен реально работать.

------------------------------
Срез 7. Smoking exposure metadata
------------------------------

Интегрировать start year / smoking history metadata.

Сделать это аккуратно:
- onboarding;
- profile/edit;
- backward compatible для существующих пользователей;
- не заставлять существующего пользователя заново проходить onboarding;
- отсутствие данных не ломает приложение.

Не строить индивидуальные медицинские прогнозы риска.

------------------------------
Срез 8. Lapse / context disruption
------------------------------

Улучшить обработку ситуации, когда пользователь всё-таки использовал никотин.

Это НЕ «провал».

Нужно:
- сохранить честную фиксацию факта;
- отличать употребление от Замены;
- подсвечивать контекст;
- искать, что можно изменить в следующем похожем эпизоде;
- давать context-disruption / next experiment;
- не использовать стыд;
- не обнулять прогресс;
- не строить streak как центральную мотивацию.

==================================================
5. НЕ ТРОГАТЬ БЭКЕНД БЕЗ НЕОБХОДИМОСТИ
==================================================

Большая часть v3.1 backend/research/security уже реализована.

Не переписывай работающие migrations/API просто ради красоты.

Если frontend contract отличается:
предпочитай adapter / backward-compatible mapping.

Не делай новый backend contract основанием переписать весь frontend.

Перед изменением Supabase:
- прочитать текущие migrations;
- проверить RLS;
- проверить security implications;
- не использовать service role во frontend;
- никакие secrets в git.

==================================================
6. ВАЛИДАЦИЯ ПОСЛЕ КАЖДОГО СРЕЗА
==================================================

Обязательно запускать:

cd app

node scripts/check-ui-contract.mjs
npm run typecheck
npm run build

Плюс существующие тесты проекта.

Если UI contract красный:
НЕ удалять проверку и НЕ ослаблять её ради build.

Сначала выяснить, действительно ли произошла регрессия.

==================================================
7. ПОЛНАЯ REGRESSION MATRIX ПЕРЕД RC
==================================================

Перед тем как сказать «готово», руками/автоматизированным browser tooling проверь минимум:

AUTH
- Google login
- redirect на branch preview
- logout

BRAND
- exact logo SHA
- login logo
- desktop header logo
- mobile header logo
- отсутствие ∞/placeholder/broken image

TODAY
- hero
- CTA
- pulse
- Freedom Fund
- attention map
- history

EPISODE
- полный guided flow
- progress
- переход назад
- изменение уже выбранного шага
- downstream invalidation
- Replacement selection
- successful response
- nicotine-used outcome
- save
- отображение карточки эпизода

QUICK LOG
- cigarette
- hookah
- vape, если настроены

CORRECTION
- удалить ошибочную запись
- проверить автоматический пересчёт counters/analytics

EVENING
- открыть
- изменить sliders
- сохранить
- открыть повторно

LINKS
- list
- create
- delete
- submit
- открыть craving flow из trigger

PATH
- 7 days
- 30 days
- baseline delta
- Freedom Fund
- replacements effectiveness
- raw product stats

MEANINGS
- library
- create
- disable/enable
- delete
- submit

PROFILE
- открыть
- изменить baseline
- сохранить без потери данных

METHOD / RELEASES
- открываются
- navigation работает

V3.1
- Myths
- Facts
- Together
- start year
- lapse improvements

RESPONSIVE
обязательно:
- 390 px
- 430 px
- ~768–820 px
- 1280 px
- 1440+ px

Проверить:
- safe areas;
- ничего не перекрывается;
- bottom navigation не закрывает actions;
- modal scroll;
- sticky footer;
- длинный русский текст;
- logo.

==================================================
8. VISUAL QA
==================================================

Для визуальной проверки не полагайся только на JSX/CSS.

Запусти реальное приложение / preview и посмотри глазами.

Сравни с production-approved v3.0.

Если есть возможность использовать отдельных агентов/роли, используй:

1. Frontend implementer
   — интеграция функций.

2. QA/regression reviewer
   — проверка baseline matrix.

3. UX/art-direction reviewer
   — только поиск визуальных регрессий относительно Brandbook.
   НЕ разрешать ему делать собственный redesign.

4. Backend/security reviewer
   — только если затрагиваются Together/RLS/API.

Финальный diff интегрирует один ответственный агент.
Не позволяй нескольким агентам независимо переписывать одни и те же UI-файлы.

==================================================
9. RELEASE ENGINEERING
==================================================

Каждый законченный вертикальный срез — отдельный осмысленный commit.

Не делать один commit на тысячи строк без необходимости.

Удалить:
- временные diagnostic scripts;
- мёртвый active integration code;
- временные CSS imports;
- debug UI;
- accidental assets.

Не удалять исторические материалы, если они нужны для audit trail.

Обновить:
- CHANGELOG;
- VALIDATION;
- release requirements status;
- rollback;
- CURRENT_STATE при необходимости;
- AI session prompt/response audit trail.

PR #5 должен честно показывать:
- что реализовано;
- что проверено;
- что остаётся blocker.

==================================================
10. PREVIEW
==================================================

После полного технического и функционального PASS:

- дождись Cloudflare branch preview;
- НЕ переключай production;
- НЕ merge main;
- проверь branch preview;
- предоставь владельцу ОДИН конкретный preview URL для финальной визуальной проверки.

Не выдавай preview за production.

==================================================
11. DEFINITION OF DONE ДЛЯ СЕГОДНЯ
==================================================

Release candidate можно считать готовым только если одновременно:

1. Восстановлен exact canonical ALIVE logo.
2. SHA-256 логотипа точно:
   11c8624d6ecf84c6a6bb554ca72a7455a0e5c1923ed324fb58c8eeabc42191d2
3. RedesignApp остаётся root.
4. redesign.css остаётся base design system.
5. Нет активного V31App/v31.css.
6. Весь baseline v3.0 функционал сохранён.
7. Все запланированные v3.1 frontend capabilities интегрированы.
8. Replacement Engine использует различные механизмы.
9. Myths работают контекстно.
10. Facts работают.
11. Together работает с privacy suppression.
12. Smoking metadata работает backward-compatible.
13. Lapse flow улучшен без shame/streak framing.
14. UI CONTRACT PASS.
15. Typecheck PASS.
16. Build PASS.
17. Tests PASS.
18. Полная regression matrix PASS.
19. Desktop visual QA PASS.
20. Mobile visual QA PASS.
21. Docs/validation/rollback актуальны.
22. Нет временных файлов/костылей.
23. Есть рабочий Cloudflare branch preview.
24. PR #5 остаётся draft.
25. Production/main НЕ изменены.
26. Владелец ещё должен дать финальный visual approval перед merge.

==================================================
12. ФИНАЛЬНЫЙ ОТЧЁТ
==================================================

Когда RC готов, ответь владельцу компактно и предметно:

1. Что реализовано.
2. Какие commits сделаны.
3. Как восстановлен логотип и какой фактический SHA-256.
4. Результат UI CONTRACT.
5. Результат typecheck/build/tests.
6. Результат полной regression matrix.
7. Что проверено на mobile/desktop.
8. Cloudflare preview URL.
9. Есть ли хоть один оставшийся blocker.
10. Что именно владелец должен проверить глазами перед merge.

Не заявляй «готово», если что-либо из release gate не прошло.

НАЧИНАЙ С BLOCKER 0 — КАНОНИЧЕСКОГО ЛОГОТИПА.


---

## Owner amendments recorded during execution

1. Work directly in the connected private repository; do not clone it.
2. The owner explicitly supplied a PNG and instructed: «используй этот лого». This direct owner identity gate superseded the earlier requested historical hash for the current branch.
3. Preserve the supplied PNG exact bytes; only displayed CSS size may change.
4. The owner confirmed login, desktop authenticated header and mobile authenticated header visually.
5. The owner declined signing in to the shared automation browser; production and merge remain prohibited.
