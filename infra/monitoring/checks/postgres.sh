#!/usr/bin/env bash
# База: жива ли, не упирается ли в соединения, и держится ли изоляция записей.
source "$(dirname "$0")/../lib/common.sh"

if ! docker exec "$DB_CONTAINER" pg_isready -U postgres -q 2>/dev/null; then
  emit postgres "$DB_CONTAINER" fail - - '{"note":"pg_isready не отвечает"}'
  flush_buffer || true; flush_alerts || true; exit 0
fi

read -r conns maxconns dbsize longest <<< "$(psql_run -c "
select (select count(*) from pg_stat_activity),
       current_setting('max_connections')::int,
       pg_database_size(current_database()),
       coalesce(round(extract(epoch from max(now() - query_start))), 0)
from pg_stat_activity where state = 'active' and query not like '%pg_stat_activity%';
" | tr '|' ' ')"

pct=$(( conns * 100 / maxconns ))
if   [[ "$pct" -ge 90 ]]; then st=fail
elif [[ "$pct" -ge 70 ]]; then st=warn
else st=ok; fi
emit postgres connections "$st" - "$pct" "{\"used\":$conns,\"max\":$maxconns,\"db_bytes\":$dbsize}"

# Долгий запрос — предвестник исчерпания соединений, а не самостоятельная беда.
if [[ "${longest%.*}" -ge 120 ]]; then
  emit postgres_longest_query - warn - "$longest" '{}'
else
  emit postgres_longest_query - ok - "$longest" '{}'
fi

# Страховка приватности: anon обязан получать отказ на личной таблице.
# Одна неудачная миграция открывает чужие записи, и узнать об этом надо от таймера.
canary="$(psql_run -c "
set local role anon;
select 'ЧИТАЕТСЯ' from public.user_goals limit 1;
" 2>&1 || true)"
if [[ "$canary" == *"permission denied"* || "$canary" == *"42501"* ]]; then
  emit rls_canary user_goals ok - - '{}'
elif [[ -z "$canary" ]]; then
  emit rls_canary user_goals warn - - '{"note":"таблица пуста, отказ не проверен"}'
else
  emit rls_canary user_goals fail - - '{"note":"anon читает личную таблицу"}'
fi

flush_buffer || true
flush_alerts || true
