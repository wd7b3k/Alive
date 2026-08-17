# R1 — Rollback

## До применения migrations

Откат равен закрытию/удалению implementation branch. Живой runtime и БД не меняются.

## После применения на development database

Предпочтительный откат — удалить/reset development branch до предыдущей migration version.

Не выполнять ручное выборочное удаление объектов, если база предназначена только для проверки R1.

## После будущего применения к alpha/production

R1 преимущественно additive, поэтому runtime предыдущей версии может продолжать использовать старые таблицы/колонки.

При проблеме:

1. откатить frontend deployment к предыдущему commit;
2. отключить использование новых R1 routes/features;
3. не удалять новые таблицы немедленно — они не мешают legacy runtime;
4. исправить schema forward-fix migration;
5. если требуется физическое удаление, сначала экспортировать новые user-created entities и проверить отсутствие runtime references.

## Что нельзя откатывать разрушительно

- исходные `episodes`;
- `tobacco_events`;
- существующие `user_meanings`;
- существующие `user_links`;
- historical analytics, если они уже начали использоваться для product decisions.

## Learning projections

`user_trigger_stats` и `user_replacement_stats` являются rebuildable projections.

При ошибке алгоритма их можно очистить и полностью пересчитать из raw episodes/actions после исправления модели.

## Evidence

Ошибочный Fact/Myth сначала снимается с публикации (`published=false`) или claim переводится в архив. Источник не удаляется только для того, чтобы скрыть старую формулировку: история доказательной базы должна оставаться прослеживаемой.
