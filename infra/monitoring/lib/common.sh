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
#
# Сообщения уходят через `/usr/local/bin/habitoff-notify` — то же единственное место,
# откуда пишет о себе бэкап. Свой канал я сначала завёл отдельно и был неправ: два
# канала оповещения расходятся через месяц, и половина алертов начинает приходить не
# туда, где их читают. Сторож на втором сервере остаётся только для того, чего изнутри
# сделать нельзя, — мёртвой руки и взгляда снаружи.
set -euo pipefail

CONFIG_FILE="${HABITOFF_MONITORING_ENV:-/etc/habitoff-monitoring.env}"
if [[ -r "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$CONFIG_FILE"; set +a
fi

: "${HABITOFF_ORIGIN:=https://habitoff.ru}"
: "${SUPABASE_DIR:=/srv/supabase}"
: "${APP_DIR:=/srv/alive}"
# Клон репозитория, из которого собирается прод. Нужен отпечатку сборки: он сверяет
# коммит живой страницы с origin/main, а не с самим собой.
: "${REPO_DIR:=/srv/alive/repo}"
: "${BACKUP_DIR:=/srv/alive/backups}"
: "${DB_CONTAINER:=supabase-db}"
: "${STATE_DIR:=/var/lib/habitoff-monitoring}"
: "${CURL_TIMEOUT:=10}"
: "${NOTIFY_BIN:=/usr/local/bin/habitoff-notify}"

BUFFER_FILE="$STATE_DIR/buffer.jsonl"
ALERT_QUEUE="$STATE_DIR/alerts.jsonl"
DIGEST_FILE="$STATE_DIR/digest.jsonl"
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
  track_streak "$check" "$status" "$detail" || true
}

# Слить буфер в базу.
#
# Через stdin, а не `\copy`: psql выполняется внутри контейнера и файла, лежащего на
# хосте, не видит. Первая редакция копировала именно так и упала бы на первом же
# запуске — с сообщением про отсутствующий файл, которое ничего не объясняет.
#
# Успех — файл очищается; неуспех — строки возвращаются в буфер до следующего раза.
flush_buffer() {
  [[ -s "$BUFFER_FILE" ]] || return 0
  local tmp; tmp="$(mktemp)"
  mv "$BUFFER_FILE" "$tmp"

  local sql; sql="$(mktemp)"
  {
    echo 'begin;'
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      # Одинарные кавычки внутри JSON удваиваются: иначе строка порвёт литерал.
      printf "insert into ops.check_results (check_name, target, status, latency_ms, value, detail, observed_at)\n"
      printf "select doc->>'check_name', doc->>'target', doc->>'status',\n"
      printf "       (doc->>'latency_ms')::integer, (doc->>'value')::numeric,\n"
      printf "       coalesce(doc->'detail', '{}'::jsonb), (doc->>'observed_at')::timestamptz\n"
      printf "from (select '%s'::jsonb as doc) as t;\n" "${line//\'/\'\'}"
    done < "$tmp"
    echo 'commit;'
  } > "$sql"

  if psql_run -f - < "$sql"; then
    rm -f "$tmp" "$sql"
  else
    cat "$tmp" >> "$BUFFER_FILE"
    rm -f "$tmp" "$sql"
    return 1
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
    if [[ "$next" -eq 2 ]]; then queue_alert critical "$check" "$detail"; fi
  elif [[ "$status" == "warn" ]]; then
    echo "0" > "$file"
    queue_alert warning "$check" "$detail"
  else
    if [[ "$prev" -ge 2 ]]; then queue_alert resolved "$check" '{"note":"проверка снова проходит"}'; fi
    echo "0" > "$file"
  fi
  # Явный успех обязателен: при `set -e` функция, закончившаяся неистинным условием,
  # роняет вызывающий скрипт. Проверка, падающая оттого, что всё хорошо, — это ровно
  # тот сорт ошибки, который обнаруживается на проде в три часа ночи.
  return 0
}

queue_alert() {
  local level="$1" check="$2" detail="$3"
  printf '{"level":"%s","check":"%s","detail":%s,"at":"%s"}\n' \
    "$level" "$check" "$detail" "$(now_iso)" >> "$ALERT_QUEUE"
}

# Разослать очередь алертов.
#
# Сначала — через `habitoff-notify`: он уже стоит на сервере, знает токен и чат и
# никогда не возвращает ошибку. Если его нет (проверка запущена не там), остаётся
# запасной путь через сторожа. Не доставили ни так, ни так — очередь остаётся,
# следующий запуск попробует снова.
flush_alerts() {
  [[ -s "$ALERT_QUEUE" ]] || return 0
  local tmp; tmp="$(mktemp)"; mv "$ALERT_QUEUE" "$tmp"
  local failed=0
  while IFS= read -r line; do
    local level check detail text
    level="$(sed -n 's/.*"level":"\([^"]*\)".*/\1/p' <<<"$line")"
    check="$(sed -n 's/.*"check":"\([^"]*\)".*/\1/p' <<<"$line")"
    detail="$(sed -n 's/.*"detail":\(.*\),"at".*/\1/p' <<<"$line")"
    case "$level" in
      critical) text="Habitoff: АВАРИЯ — $check
$detail
Что делать: docs/RUNBOOK_ALERTS.md" ;;
      resolved) text="Habitoff: восстановлено — $check" ;;
      *)        text="Habitoff: предупреждение — $check
$detail" ;;
    esac

    # Предупреждение не будит человека: оно копится и уходит одной сводкой раз в сутки.
    # Разделение существует ради единственной вещи — чтобы алерты продолжали читать.
    if [[ "$level" != "critical" && "$level" != "resolved" ]]; then
      printf '%s\t%s\n' "$check" "$detail" >> "$DIGEST_FILE"
    elif [[ -x "$NOTIFY_BIN" ]]; then
      "$NOTIFY_BIN" "$text" || true
    elif [[ -n "${WATCHDOG_URL:-}" && -n "${HEARTBEAT_TOKEN:-}" ]]; then
      curl -sS --max-time "$CURL_TIMEOUT" -X POST "$WATCHDOG_URL/alert" \
        -H "X-Habitoff-Token: $HEARTBEAT_TOKEN" -H 'Content-Type: application/json' \
        -d "$line" -o /dev/null || { echo "$line" >> "$ALERT_QUEUE"; failed=1; }
    else
      echo "$line" >> "$ALERT_QUEUE"; failed=1
    fi
  done < "$tmp"
  rm -f "$tmp"
  return "$failed"
}

# Отправить накопленные предупреждения одной сводкой. Зовётся суточной группой проверок.
flush_digest() {
  [[ -s "$DIGEST_FILE" ]] || return 0
  local body
  body="$(cut -f1 "$DIGEST_FILE" | sort | uniq -c | sort -rn \
          | awk '{ printf "%s — %s\n", $2, $1 }')"
  local total; total="$(wc -l < "$DIGEST_FILE")"
  if [[ -x "$NOTIFY_BIN" ]]; then
    "$NOTIFY_BIN" "Habitoff: сводка за сутки — предупреждений $total

$body" || return 1
  fi
  : > "$DIGEST_FILE"
  return 0
}

# Замер: печатает код ответа и время до первого байта в миллисекундах.
http_probe() {
  local url="$1"; shift
  curl -sS -o /dev/null --max-time "$CURL_TIMEOUT" \
    -w '%{http_code} %{time_starttransfer}' "$@" "$url" 2>/dev/null || echo "000 0"
}

ms() { awk -v s="$1" 'BEGIN { printf "%d", s * 1000 }'; }
