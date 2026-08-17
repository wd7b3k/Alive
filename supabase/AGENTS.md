# Правила Codex для `supabase/`

Этот файл применяется ко всем schema/migration изменениям ALIVE внутри `supabase/` и дополняет root `AGENTS.md`.

## До SQL

Обязательно прочитать:

- `docs/CURRENT_STATE.md`;
- `docs/DATA_MODEL.md`;
- `docs/TECHNICAL_STRATEGY.md`;
- `docs/PRIVACY_AND_DATA.md`;
- `docs/DEVELOPMENT_RULES.md`;
- `docs/CODEX_QUALITY_PROTOCOL.md`;
- текущий release unit.

Использовать Supabase и Postgres best-practices skill, если они доступны.

Не проектировать schema только из UI-макета.

## Source of truth

Schema меняется только versioned migrations в git.

Ручное изменение remote schema не становится каноническим состоянием.

## Raw и derived

Исходные факты пользователя хранятся отдельно от производных моделей.

Derived/projection data должны быть:

- versioned where relevant;
- rebuildable;
- объяснимыми;
- пересчитываемыми после correction/delete.

## RLS

Каждая user-owned таблица private by default.

Для новой user-owned сущности обязательно проверить:

- owner SELECT;
- owner INSERT/UPDATE/DELETE по необходимости;
- невозможность чтения другого пользователя;
- невозможность записи от имени другого пользователя;
- unauthenticated denial;
- admin получает только обоснованный scope.

Не использовать user-editable metadata как authorization authority.

## Admin analytics

Admin dashboard не является основанием давать admin произвольный SELECT чужих private текстов.

Analytics хранит структурированные поля.

Не переносить туда:

- личный текст Зачем;
- notes;
- свободный текст Связки;
- сообщения пользователя;
- другие чувствительные free-text поля.

## Evidence

Scientific source, claim и user copy — отдельные сущности.

Не смешивать bibliographic truth с мотивирующей формулировкой.

История evidence revisions не должна молча исчезать.

## Existing data

Перед migration проверить фактическую текущую schema и наличие legacy данных.

Не считать новую таблицу пустой только потому, что branch новая.

Если есть legacy Facts/Myths/Meanings/Links state — определить compatibility/migration path.

## Идентификаторы

- primary keys/opaque tokens не генерировать через `Math.random()`;
- не hardcode user IDs;
- не hardcode generated external IDs в data migrations;
- human-readable codes допустимы для controlled catalogs, если имеют стабильную семантику.

## Индексы

Добавлять индексы под реальные access patterns и foreign keys, когда это оправдано.

После schema change запускать performance advisor и анализировать новые предупреждения.

Не удалять «unused» index механически на маленькой alpha-выборке без анализа будущего access pattern.

## Functions/triggers

- минимальный privilege;
- явный search_path для security-definer;
- триггер не должен скрывать сложную необратимую business logic;
- side effects должны быть документированы;
- recompute path должен быть доступен отдельно от trigger при необходимости восстановления.

## Migration quality gate

До применения к live alpha:

1. применить все новые migrations последовательно на development database/branch;
2. проверить существующие данные;
3. проверить RLS;
4. проверить security advisor;
5. проверить performance advisor;
6. проверить critical read/write path;
7. проверить correction/delete/recompute;
8. зафиксировать rollback/forward-fix.

Если development DB недоступна — migration gate `НЕ ПРОВЕРЕНО`.

## Запрещено

Без отдельного owner gate не выполнять:

- destructive migration;
- массовое удаление пользовательских данных;
- изменение privacy model;
- ослабление RLS;
- изменение Health Minutes/medical equivalence coefficients;
- автоматическое назначение всех существующих пользователей admin;
- production data rewrite только ради удобства новой модели.

## Handoff

Для schema change перечислить:

- migrations;
- новые/изменённые tables/functions/policies;
- data compatibility;
- RLS tests;
- advisors;
- recompute behavior;
- что реально применено remote, а что только находится в git.
