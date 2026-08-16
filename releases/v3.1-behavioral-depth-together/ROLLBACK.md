# Rollback ALIVE v3.1

## Frontend rollback

Если v3.1 frontend ломает core flow или runtime:

1. не merge PR либо revert merge commit;
2. вернуть `app/src/main.tsx` на `RedesignApp` v3.0;
3. redeploy последний известный хороший v3.0 commit;
4. проверить login, Today, guided flow, Links, Path, Meanings.

Новые v3.1 catalog tables при frontend rollback можно оставить: v3.0 их не читает.

## Content rollback

Мифы/Факты/новые Замены являются versioned catalog content.

Предпочтительный rollback:

- `published=false` для проблемной карточки;
- не удалять historical code/id;
- исправление медицинской формулировки — новой migration и с отражением в changelog.

## Together rollback

Если обнаружена privacy/metric проблема:

1. немедленно `revoke execute on function public.get_together_summary(integer) from authenticated` новой emergency migration;
2. скрыть маршрут `/together` frontend rollback/redeploy;
3. сохранить raw behavioural history неизменной;
4. исправить aggregate function отдельной migration;
5. повторить privacy/RLS validation перед возвратом EXECUTE.

## Schema rollback

Destructive rollback новых таблиц по умолчанию не выполнять.

Причина: user myth relevance и content history могут уже существовать. Безопаснее отключить feature/content и оставить additive schema до отдельного owner-approved destructive migration.

## Replacement Engine rollback

Если v2 ranking даёт плохие предложения:

- переключить frontend обратно на v3.0 `pickReplacements`;
- новый каталог может оставаться опубликованным, если individual items безопасны;
- при проблеме конкретной Замены снять её с публикации.

## Logo rollback

Approved logo asset не заменять. Если v3.1 CSS вызывает layout regression, откатить только `v31.css` logo rules, сохранив сам asset.

## Data invariant

Ни один rollback не должен:

- переписывать raw tobacco events;
- удалять прошлые episodes;
- менять исторические ALIVE units;
- публиковать private user data;
- превращать lapse в reset.
