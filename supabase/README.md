# Habitoff — Supabase / PostgreSQL

## Источник истины

Схема БД и содержимое каталогов меняются **только** миграциями из
`supabase/migrations/` этого репозитория.

Прямой `psql` на боевой базе — **только чтение**. Своя база убрала кнопку SQL Editor, но
это ничего не даст, если её место займёт `psql` по SSH: за историю проекта четыре
расхождения прода и репозитория, и все родились из ручной правки.

Нарушение видно машине, а не глазам: число файлов в `supabase/migrations/` обязано
равняться числу записей в `supabase_migrations.schema_migrations`. Проверка стоит в
`/srv/alive/deploy.sh` и срабатывает при каждой выкладке.

## Где всё живёт

Стек развёрнут на собственном сервере, `/srv/supabase`. Официальный
`docker-compose.yml` не правится; наши изменения — в `docker-compose.override.yml`.
Состав, версии образов и выключенные сервисы описаны в
[`../docs/INFRASTRUCTURE_STATE.md`](../docs/INFRASTRUCTURE_STATE.md).

Postgres опубликован на `127.0.0.1:5432` — наружу не смотрит.

## Применение миграций

Сначала на одноразовой базе, потом на боевой. Всегда.

```bash
export PGPASSWORD=$(grep -m1 '^POSTGRES_PASSWORD=' /srv/supabase/.env | cut -d= -f2-)
P="psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -q"

for f in supabase/migrations/*.sql; do
  v=$(basename "$f" .sql | cut -d_ -f1)
  $P -f "$f" || { echo "ОСТАНОВ: $f"; break; }
  $P -c "insert into supabase_migrations.schema_migrations(version) values ('$v') on conflict do nothing"
done
```

Запись версии в журнал — обязательная часть, а не бухгалтерия. Миграция, применённая без
записи, будет считаться непринятой и однажды накатится повторно; среди них есть
удаляющие колонки.

**Замечание про одноразовую базу.** Голый образ `supabase/postgres` не содержит ни схемы
`auth`, ни ролей `anon`/`authenticated`/`service_role` — их создают init-скрипты стека и
миграции GoTrue. Прогонять миграции продукта на голом контейнере бессмысленно: они упадут
не по своей вине. Одноразовая база — это полный стек, поднятый с нуля:

```bash
cd /srv/supabase && docker compose down -v && sudo rm -rf volumes/db/data && docker compose up -d
```

Две минуты. Данные лежат в bind-mount, поэтому `down -v` сам по себе их не убирает.

## Версии клиента

На хосте `psql` версии 16, сервер — 17. `psql` работает; `pg_dump` откажется по
несовпадению версий, поэтому дампы снимаются через `docker exec`:

```bash
docker exec supabase-db pg_dump -U postgres -Fc postgres > /srv/alive/backups/db-$(date +%Y%m%d-%H%M).dump
```

## Edge-функции

Код функций живёт в `supabase/functions/` этого репозитория. На сервере он
синхронизируется, а не правится на месте:

```bash
rsync -a /srv/alive/repo/supabase/functions/ /srv/supabase/volumes/functions/
cd /srv/supabase && docker compose restart functions
```

Сейчас их две: `delete-account` (удаление аккаунта) и `yandex` (мост входа, см.
[`../docs/AUTH_PROVIDERS.md`](../docs/AUTH_PROVIDERS.md)).

## Обязательная проверка перед внешними участниками

1. база, поднятая с нуля из миграций, проходит все файлы без ошибок;
2. число файлов миграций равно числу записей в журнале;
3. `supabase/tests/local` — PASS;
4. два тестовых пользователя: A не видит приватных строк B;
5. анонимный посетитель читает опубликованные каталоги и ноль приватных строк;
6. profile auto-create работает;
7. `service_role` отсутствует во frontend и в git;
8. восстановление из дампа проверено на пустом стеке.
