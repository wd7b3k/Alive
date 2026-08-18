# Режимы выполнения Codex в ALIVE

Этот документ определяет допустимые способы работы Codex с ALIVE и имеет приоритет над более ранним требованием обязательного локального checkout.

## Главное правило

Владелец проекта не обязан клонировать repository, пользоваться терминалом, GitHub Desktop или вручную настраивать локальную среду.

ALIVE должен поддерживать разработку агентами непосредственно через подключённые инструменты GitHub, CI, Supabase и preview-инфраструктуру.

Локальный git checkout полезен, если он уже доступен, но **не является обязательным условием разработки**.

## Режим A — Direct GitHub Mode

Это нормальный и поддерживаемый режим для owner-driven разработки ALIVE.

Используется, когда:

- Codex имеет подключённый доступ к `wd7b3k/Alive` через GitHub integration/connector;
- repository можно читать;
- можно создавать или обновлять отдельную рабочую branch;
- можно публиковать commits и draft PR.

В этом режиме Codex обязан:

1. проверить, что доступен именно `wd7b3k/Alive`;
2. прочитать обязательные документы из repository;
3. определить base branch и target branch;
4. работать только в отдельной branch;
5. делать небольшие логические commits;
6. использовать GitHub diff/PR для контроля изменений;
7. использовать GitHub Actions как основной remote build/typecheck/test gate, если workflow существует;
8. при доступности preview deployment проверять пользовательский интерфейс на preview, а не требовать local server;
9. для SQL/RLS по умолчанию использовать **бесплатный временный Supabase stack внутри CI runner** через Supabase CLI/Docker, а не платную Supabase Preview Branch;
10. документировать каждое значимое изменение и validation state;
11. не merge самостоятельно без owner gate.

## Дисциплина локального диска

ALIVE не должен использовать локальный диск владельца как постоянное рабочее хранилище артефактов разработки.

По умолчанию Codex не должен создавать на компьютере владельца долговечные копии repository, ZIP, build output, `node_modules`, Docker volumes, тестовые БД, отчёты, дубли документации или иные файлы, которые владельцу не нужны напрямую.

Канонические и полезные для продолжения работы материалы должны сразу сохраняться в repository:

- исходный код;
- migrations;
- tests;
- release docs;
- решения;
- prompt/response audit trail;
- конфигурация CI;
- воспроизводимые test fixtures без sensitive data.

Временные вычислительные артефакты предпочтительно создавать на ephemeral remote runner и уничтожать по завершении job.

Локальная запись допустима только если:

- без неё технически невозможно выполнить нужную операцию;
- файл является краткоживущим временным артефактом;
- он не используется как source of truth;
- Codex удаляет его после завершения, если среда это позволяет;
- действие не требует ручного обслуживания владельцем.

Нельзя просить владельца хранить локальные резервные копии проекта ради rollback: rollback обеспечивается git history, branch, commit и PR.

## Что Direct GitHub Mode не означает

Он не означает снижение требований к качеству.

Если локальный command недоступен, проверка должна быть перенесена на эквивалентный remote gate, например:

- local `npm run build` → GitHub Actions build;
- local tests → GitHub Actions tests;
- local `git diff` → GitHub PR diff;
- local browser → deployed preview + browser tool;
- local Supabase → **Supabase CLI stack внутри GitHub Actions**;
- local static inspection → GitHub repository file inspection.

Если эквивалентной проверки нет, пункт помечается `НЕ ПРОВЕРЕНО`, но это **не blocker для всей работы**, если изменение можно безопасно выполнить и откатить через branch/commit.

## Бесплатный database gate по умолчанию

До отдельного решения владельца ALIVE **не использует платные Supabase Preview Branches для обычной разработки и проверки migrations**.

Стандартный DB gate:

1. GitHub Actions получает код branch/PR;
2. устанавливает Supabase CLI;
3. запускает временный Supabase stack через `supabase start` на GitHub runner;
4. применяет все migrations с чистого состояния;
5. запускает DB/pgTAP/RLS tests через `supabase test db` и необходимые E2E проверки;
6. при необходимости проверяет seed/test data;
7. сохраняет только logs/test result;
8. runner и его Docker volumes уничтожаются после job.

Платная Supabase development/preview branch создаётся только если реально нужна проверка поведения, которое невозможно воспроизвести в ephemeral CI stack, и только после отдельного owner approval стоимости.

## Режим B — Local Repository Mode

Если Codex уже запущен внутри полноценного локального checkout ALIVE, он может использовать обычный git/shell workflow.

В этом случае локальные проверки допустимы, но предпочтение всё равно отдаётся воспроизводимым CI gates для того, что должно проверяться каждым агентом одинаково.

Codex не должен требовать от владельца вручную создавать этот режим.

## Настоящие blockers

Codex останавливается только если без следующего условия невозможно безопасно продолжить:

- нет доступа ни к локальному repository, ни к GitHub repository;
- GitHub доступ только read-only, а задача требует изменений;
- невозможно создать/использовать отдельную branch;
- destructive migration требует owner decision;
- требуется секрет/credential, который нельзя получить через разрешённую интеграцию;
- отсутствует evidence для медицински значимого решения;
- обнаружен конфликт принятых канонических документов, который меняет смысл задачи;
- невозможно обеспечить безопасный rollback/forward-fix для destructive изменения.

Отсутствие `.git` в локальной временной папке само по себе blocker **не является**.

Наличие платного, но необязательного validation service также blocker **не является**: сначала ищется бесплатный воспроизводимый remote equivalent.

## Branch и rollback вместо ручной локальной страховки

Для owner workflow основным механизмом безопасности являются:

`base branch → отдельная feature branch → небольшие commits → draft PR → validation → owner review → merge`

Если release неудачен:

- branch можно не merge;
- PR можно закрыть;
- отдельный commit можно revert;
- migration должна иметь описанный rollback/forward-fix;
- предыдущий принятый state остаётся доступен в git history.

Поэтому владельцу не требуется вручную хранить копии проекта на компьютере.

## Remote validation hierarchy

При Direct GitHub Mode использовать по возможности такой порядок:

1. структурный review и diff;
2. automated GitHub Actions;
3. ephemeral Supabase CI stack + migration/RLS/DB tests, если затронута БД;
4. deployed preview;
5. browser QA desktop/mobile;
6. независимый reviewer-agent;
7. owner review.

## Бесплатный ephemeral database gate

Если платная Supabase development/preview branch не разрешена владельцем, database validation в Direct GitHub Mode выполняется бесплатным воспроизводимым CI-контуром:

`GitHub Actions → pinned Supabase CLI → ephemeral local stack → fresh migration replay → pgTAP/RLS tests → lint → supabase stop --no-backup → runner destroyed`.

Обязательные свойства:

- workflow и tests находятся в repository;
- hosted Supabase project, production schema и пользовательские данные не затрагиваются;
- remote credentials и project link не требуются;
- runner не публикует Docker volumes, database dump или build artifact;
- migration replay выполняется с нуля через `supabase db reset --local`;
- RLS проверяет owner/cross-user/anonymous/admin boundaries;
- security-definer RPC проверяется по grants, ownership scope, idempotency и concurrent retry;
- correction/delete проверяет rebuildable projections;
- teardown выполняется через `if: always()` и окончательно гарантируется уничтожением GitHub-hosted runner.

Такой workflow является допустимым development database gate для migration/RLS behavior. Hosted Supabase Security/Performance Advisors он не подменяет; вместо них можно выполнить локальный `supabase db lint`, а hosted advisor status остаётся отдельным фактом.

## Не превращать validation в барьер

Главная задача quality gates — ловить ошибки, а не заставлять владельца становиться разработчиком или оплачивать инфраструктуру до необходимости.

Если конкретный инструмент недоступен или платный:

- Codex сначала ищет бесплатный автоматизированный эквивалент;
- выполняет максимально возможную безопасную часть задачи;
- явно указывает, что не проверено;
- не требует ручной технической подготовки владельца;
- не предлагает платный ресурс как единственный следующий шаг, пока существует бесплатный воспроизводимый путь.

## Приоритет

Если `docs/CODEX_QUALITY_PROTOCOL.md`, старый prompt или иной документ требует обязательного local checkout или платной Supabase Preview Branch для обычной DB validation, это требование считается **superseded этим документом**.

Канонический принцип:

> **ALIVE должен быть развиваем агентами в безопасных ветках непосредственно из подключённой среды владельца. Постоянное состояние живёт в git; тяжёлые временные проверки выполняются на ephemeral remote infrastructure. Качество обеспечивается наблюдаемыми gates и откатами, а не локальным диском владельца или платной dev-инфраструктурой.**
