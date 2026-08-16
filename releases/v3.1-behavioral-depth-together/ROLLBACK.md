# Rollback ALIVE v3.1

## Frontend rollback

v3.1 is an additive extension of the active `RedesignApp`; `main.tsx` already remains on the v3.0 shell.

Если отдельный slice ломает core flow или runtime:

1. не merge PR;
2. revert только commit проблемного vertical slice;
3. не переключать root app и не создавать отдельный shell;
4. повторить UI contract, typecheck, build и затронутую regression matrix;
5. проверить login, Today, guided flow, Links, Path, Meanings и mobile navigation.

Новые catalog tables можно оставить: v3.0 не зависит от их UI routes.

## Feature-level rollback

- CTA/guided: revert соответствующие additive commits, сохраняя старый guided contract.
- Replacement Engine: вернуть frontend selection к v3.0 `pickReplacements`; каталог не удалять.
- Contextual Myths/Facts: скрыть secondary route/reminder; private relevance data не удалять.
- Together: скрыть route и при privacy incident новой emergency migration revoke authenticated EXECUTE.
- Start year: убрать optional UI/display, не переписывая baseline JSON других продуктов.
- Lapse: revert только next-experiment copy, не меняя raw tobacco events.

## Content rollback

Мифы/Факты/Замены являются versioned catalog content. Предпочтительно:

- `published=false` для проблемной карточки;
- не удалять historical code/id;
- медицинскую формулировку исправлять новой migration и отражать в changelog.

## Together privacy rollback

1. `revoke execute on function public.get_together_summary(integer) from authenticated` новой emergency migration;
2. скрыть `/together`;
3. сохранить raw behavioural history;
4. исправить aggregate function отдельной migration;
5. повторить privacy/RLS validation до возврата EXECUTE.

## Logo rollback

Owner-approved binary `app/src/assets/brand-logo-full.png` не модифицировать. Если отображение вызывает layout regression, откатывать только CSS display sizing в `redesign.css`, сохраняя exact bytes и SHA-256 `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`.

## Schema rollback

Destructive rollback новых таблиц по умолчанию не выполнять. Безопаснее отключить feature/content и оставить additive schema до отдельной owner-approved destructive migration.

## Data invariant

Ни один rollback не должен:

- переписывать raw tobacco events;
- удалять прошлые episodes;
- менять исторические ALIVE units;
- публиковать private user data;
- превращать lapse в reset.
