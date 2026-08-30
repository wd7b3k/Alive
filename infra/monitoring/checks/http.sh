#!/usr/bin/env bash
# Внешний вид сайта: что видит человек, открывший habitoff.ru.
source "$(dirname "$0")/../lib/common.sh"

read -r code ttfb <<< "$(http_probe "$HABITOFF_ORIGIN/")"
if [[ "$code" == "200" ]]; then
  emit apex_http "$HABITOFF_ORIGIN/" ok "$(ms "$ttfb")" - '{}'
else
  emit apex_http "$HABITOFF_ORIGIN/" fail "$(ms "$ttfb")" - "{\"code\":\"$code\"}"
fi

# www обязан отдавать 301 на apex. Молча начавший работать www — это две копии сайта
# в индексе поисковика и разъехавшаяся статистика.
www="${HABITOFF_ORIGIN/https:\/\//https://www.}"
read -r wcode _ <<< "$(http_probe "$www/")"
if [[ "$wcode" == "301" ]]; then
  emit www_redirect "$www/" ok - - '{}'
else
  emit www_redirect "$www/" fail - - "{\"code\":\"$wcode\"}"
fi

# Отпечаток живой сборки. Расхождение с симлинком current означает, что выкладка
# оборвалась на середине: файлы новые, отдаётся старое (или наоборот).
live_commit="$(curl -sS --max-time "$CURL_TIMEOUT" "$HABITOFF_ORIGIN/version.json" 2>/dev/null \
  | sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
disk_commit="$(sed -n 's/.*"commit"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
  "$APP_DIR/current/version.json" 2>/dev/null || true)"
if [[ -z "$live_commit" ]]; then
  emit build_fingerprint version.json fail - - '{"note":"version.json не отдаётся"}'
elif [[ -n "$disk_commit" && "$live_commit" != "$disk_commit" ]]; then
  emit build_fingerprint version.json fail - - \
    "{\"live\":\"$live_commit\",\"disk\":\"$disk_commit\"}"
else
  emit build_fingerprint version.json ok - - "{\"commit\":\"$live_commit\"}"
fi

flush_buffer || true
flush_alerts || true
