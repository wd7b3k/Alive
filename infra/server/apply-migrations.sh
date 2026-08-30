#!/usr/bin/env bash
# Применить миграции, которых ещё нет в базе, и записать их в журнал.
#
# Зачем это существует. Гейт выкладки сравнивает число файлов миграций с числом записей
# в `supabase_migrations.schema_migrations` и не пускает сборку при расхождении. Правило
# верное: фронт, который ждёт колонок, которых в базе нет, — худший вид поломки.
#
# Но применялись миграции руками — `psql < файл`, как написано в `docs/ROLLOUT.md`, — и
# такой прогон меняет схему, не оставляя записи в журнале. Дальше гейт честно отказывает,
# выкладка стоит, а причина выглядит как «что-то с миграциями». Ровно это и случилось
# 30.08.2026: схема была новее прода, а прод не пересобирался, потому что счётчик не
# сходился.
#
# Скрипт закрывает разрыв: применяет только недостающее и сразу регистрирует.
# Состав колонок журнала читается из самой базы — у разных версий Supabase он разный,
# и вслепую вставлять в служебную таблицу нельзя.
#
# Использование:
#   infra/server/apply-migrations.sh            # показать, что будет сделано
#   infra/server/apply-migrations.sh --apply    # сделать
set -euo pipefail

: "${DB_CONTAINER:=supabase-db}"
: "${REPO_DIR:=/srv/alive/repo}"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

psql_run() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

cd "$REPO_DIR"

applied="$(psql_run -c "select version from supabase_migrations.schema_migrations order by version;")"
columns="$(psql_run -c "
  select string_agg(column_name, ',' order by ordinal_position)
  from information_schema.columns
  where table_schema = 'supabase_migrations' and table_name = 'schema_migrations';")"

echo "колонки журнала: $columns"

pending=()
for file in supabase/migrations/*.sql; do
  version="$(basename "$file" | cut -d_ -f1)"
  if ! grep -qx "$version" <<< "$applied"; then
    pending+=("$file")
  fi
done

if [[ "${#pending[@]}" -eq 0 ]]; then
  echo "нечего применять: журнал совпадает с репозиторием"
  exit 0
fi

echo "не применено: ${#pending[@]}"
printf '  %s\n' "${pending[@]}"

if [[ "$APPLY" -eq 0 ]]; then
  echo
  echo "это был показ. чтобы применить: $0 --apply"
  exit 0
fi

for file in "${pending[@]}"; do
  version="$(basename "$file" | cut -d_ -f1)"
  name="$(basename "$file" .sql | cut -d_ -f2-)"
  echo "==> $version $name"
  psql_run < "$file"

  # Регистрация. `version` есть всегда; `name` и `statements` — как повезёт с версией.
  fields="version"
  values="'$version'"
  if [[ ",$columns," == *",name,"* ]]; then
    fields="$fields, name"; values="$values, '$name'"
  fi
  if [[ ",$columns," == *",statements,"* ]]; then
    # Тело целиком одним элементом: журнал нужен для учёта, а не для повторного прогона.
    fields="$fields, statements"
    values="$values, array[\$mig\$$(cat "$file")\$mig\$]"
  fi
  psql_run -c "insert into supabase_migrations.schema_migrations ($fields) values ($values)
               on conflict (version) do nothing;"
  echo "    записано в журнал"
done

echo
echo "файлов в репозитории: $(ls supabase/migrations/*.sql | wc -l)"
echo "записей в журнале:    $(psql_run -c 'select count(*) from supabase_migrations.schema_migrations;')"
