#!/usr/bin/env bash
# Доля пятисотых за последние пять минут по журналу Caddy.
# Сайт может отвечать 200 на главной и при этом сыпаться на записи эпизода —
# проверка точки этого не увидит, а журнал видит.
source "$(dirname "$0")/../lib/common.sh"

: "${CADDY_ACCESS_LOG:=/var/log/caddy/access.log}"
if [[ ! -r "$CADDY_ACCESS_LOG" ]]; then
  emit caddy_5xx "$CADDY_ACCESS_LOG" warn - - '{"note":"журнал недоступен"}'
  flush_buffer || true; exit 0
fi

since=$(( $(date +%s) - 300 ))
read -r total errors <<< "$(python3 - "$CADDY_ACCESS_LOG" "$since" <<'PY'
import json, sys
path, since = sys.argv[1], float(sys.argv[2])
total = errors = 0
with open(path, 'r', errors='ignore') as fh:
    for line in fh.readlines()[-20000:]:
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if row.get('ts', 0) < since:
            continue
        total += 1
        if int(row.get('status', 0)) >= 500:
            errors += 1
print(total, errors)
PY
)"

if [[ "${total:-0}" -eq 0 ]]; then
  emit caddy_5xx - ok - 0 '{"note":"запросов за окно не было"}'
else
  pct=$(( errors * 100 / total ))
  st=ok; [[ "$pct" -ge 1 ]] && st=warn; [[ "$pct" -ge 5 ]] && st=fail
  emit caddy_5xx - "$st" - "$pct" "{\"total\":$total,\"errors\":$errors}"
fi

flush_buffer || true
flush_alerts || true
