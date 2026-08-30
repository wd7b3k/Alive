#!/usr/bin/env bash
# Общая часть всех проверок.
#
# Три вещи, которые здесь решаются раз и навсегда, чтобы не решаться в каждом скрипте:
#
# 1. Проверка никогда не падает молча. Любой выход из скрипта проходит через `emit`,
#    и даже «не смог проверить» становится строкой со статусом fail, а не тишиной.
#    Тишина в мониторинге неотличима от «всё хорошо» — это его главный способ врать.
#
# 2. Результат переживает недоступность базы. Если Postgres лёг, писать историю некуда,
#    а это ровно тот момент, ради которого история заводилась. Поэтому сначала строка
#    ложится в файловый буфер, и только потом буфер сливается в базу. Не слился — полежит
#    до следующего запуска.
#
# 3. Секреты берутся из окружения и никогда не печатаются. Токен пульса не появляется
#    ни в логе, ни в сообщении об ошибке.
set -euo pipefail

CONFIG_FILE="${HABITOFF_MONITORING_ENV:-/etc/habitoff-monitoring.env}"
if [[ -r "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$CONFIG_FILE"; set +a
fi

: "${HABITOFF_ORIGIN:=https://habitoff.ru}"
: "${SUPABASE_DIR:=/srv/supabase}"
: "${APP_DIR:=/srv/alive}"
: "${BACKUP_DIR:=/srv/alive/backups}"
: "${DB_CONTAINER:=supabase-db}"
: "${STATE_DIR:=/var/lib/habitoff-monitoring}"
: "${CURL_TIMEOUT:=10}"

BUFFER_FILE="$STATE_DIR/buffer.jsonl"
ALERT_QUEUE="$STATE_DIR/alerts.jsonl"
mkdir -p "$STATE_DIR/streak"

# Выполнить SQL в боевой базе. Только чтение и вставка в ops — схема продукта не трогается.
psql_run() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -qtA "$@"
}

json_escape() {
  # Без jq: он есть не на каждом сервере, а зависимость ради экранирования строки — перебор.
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || printf '""'
}

now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# emit <check> <target> <status ok|warn|fail> <latency_ms|-> <value|-> <detail-json>
emit() {
  local check="$1" target="$2" status="$3" latency="$4" value="$5" detail="${6:-{\}}"
  printf '{"check_name":"%s","target":%s,"status":"%s","latency_ms":%s,"value":%s,"detail":%s,"observed_at":"%s"}\n' \
    "$check" \
    "$( [[ "$target" == "-" ]] && echo null || printf '"%s"' "$target" )" \
    "$status" \
    "$( [[ "$latency" == "-" ]] && echo null || echo "$latency" )" \
    "$( [[ "$value" == "-" ]] && echo null || echo "$value" )" \
    "$detail" \
    "$(now_iso)" >> "$BUFFER_FILE"
  track_streak "$check" "$status" "$detail"
}

# Слить буфер в базу. Успех — файл очищается; неуспех — остаётся до следующего раза.
flush_buffer() {
  [[ -s "$BUFFER_FILE" ]] || return 0
  local tmp; tmp="$(mktemp)"
  mv "$BUFFER_FILE" "$tmp"
  if psql_run <<SQL
begin;
create temporary table _incoming (doc jsonb) on commit drop;
\copy _incoming (doc) from '$tmp'
insert into ops.check_results (check_name, target, status, latency_ms, value, detail, observed_at)
select doc->>'check_name', doc->>'target', doc->>'status',
       (doc->>'latency_ms')::integer, (doc->>'value')::numeric,
       coalesce(doc->'detail', '{}'::jsonb), (doc->>'observed_at')::timestamptz
from _incoming;
commit;
SQL
  then rm -f "$tmp"
  else cat "$tmp" >> "$BUFFER_FILE"; rm -f "$tmp"; return 1
  fi
}

# Счётчик подряд идущих неудач. Алерт уходит на второй, а не на первый: одиночный сетевой
# сбой на минутной проверке — это не авария, а погода.
track_streak() {
  local check="$1" status="$2" detail="$3"
  local file="$STATE_DIR/streak/$check"
  local prev=0
  [[ -r "$file" ]] && prev="$(cat "$file")"
  if [[ "$status" == "fail" ]]; then
    local next=$(( prev + 1 ))
    echo "$next" > "$file"
    [[ "$next" -eq 2 ]] && queue_alert critical "$check" "$detail"
  elif [[ "$status" == "warn" ]]; then
    echo "0" > "$file"
    queue_alert warning "$check" "$detail"
  else
    if [[ "$prev" -ge 2 ]]; then queue_alert resolved "$check" '{"note":"проверка снова проходит"}'; fi
    echo "0" > "$file"
  fi
}

queue_alert() {
  local level="$1" check="$2" detail="$3"
  printf '{"level":"%s","check":"%s","detail":%s,"at":"%s"}\n' \
    "$level" "$check" "$detail" "$(now_iso)" >> "$ALERT_QUEUE"
}

# Отправить очередь алертов сторожу на втором сервере. Токен уходит заголовком и нигде
# не печатается. Не доставили — очередь остаётся, следующий запуск попробует снова.
flush_alerts() {
  [[ -s "$ALERT_QUEUE" ]] || return 0
  [[ -n "${WATCHDOG_URL:-}" && -n "${HEARTBEAT_TOKEN:-}" ]] || return 0
  local tmp; tmp="$(mktemp)"; mv "$ALERT_QUEUE" "$tmp"
  local failed=0
  while IFS= read -r line; do
    if ! curl -sS --max-time "$CURL_TIMEOUT" -X POST "$WATCHDOG_URL/alert" \
         -H "X-Habitoff-Token: $HEARTBEAT_TOKEN" -H 'Content-Type: application/json' \
         -d "$line" -o /dev/null; then
      echo "$line" >> "$ALERT_QUEUE"; failed=1
    fi
  done < "$tmp"
  rm -f "$tmp"
  return "$failed"
}

# Замер: печатает код ответа и время до первого байта в миллисекундах.
http_probe() {
  local url="$1"; shift
  curl -sS -o /dev/null --max-time "$CURL_TIMEOUT" \
    -w '%{http_code} %{time_starttransfer}' "$@" "$url" 2>/dev/null || echo "000 0"
}

ms() { awk -v s="$1" 'BEGIN { printf "%d", s * 1000 }'; }
