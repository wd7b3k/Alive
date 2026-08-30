#!/usr/bin/env bash
# Точки Supabase, от которых зависит вход и чтение каталогов.
source "$(dirname "$0")/../lib/common.sh"

read -r code ttfb <<< "$(http_probe "$HABITOFF_ORIGIN/auth/v1/health")"
[[ "$code" == "200" ]] \
  && emit auth_health /auth/v1/health ok "$(ms "$ttfb")" - '{}' \
  || emit auth_health /auth/v1/health fail "$(ms "$ttfb")" - "{\"code\":\"$code\"}"

# Каталог фактов читается ключом anon — то же, что делает браузер посетителя.
# Проверяем не только код, но и непустоту: PostgREST отвечает 200 и на пустой ответ,
# а пустой каталог означает, что гранты слетели после миграции.
if [[ -n "${SUPABASE_ANON_KEY:-}" ]]; then
  body="$(curl -sS --max-time "$CURL_TIMEOUT" \
    -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    "$HABITOFF_ORIGIN/rest/v1/facts_catalog?select=code&limit=1" 2>/dev/null || true)"
  if [[ "$body" == \[\{* ]]; then
    emit rest_catalog facts_catalog ok - - '{}'
  else
    emit rest_catalog facts_catalog fail - - '{"note":"пустой или неожиданный ответ"}'
  fi
else
  emit rest_catalog facts_catalog warn - - '{"note":"SUPABASE_ANON_KEY не задан"}'
fi

# Мост входа через Яндекс. Проверяем только первый шаг: он обязан увести на oauth.yandex.ru.
# Дальше идти нельзя — это был бы вход настоящим пользователем каждую минуту.
loc="$(curl -sS -o /dev/null --max-time "$CURL_TIMEOUT" -w '%{http_code} %{redirect_url}' \
  "$HABITOFF_ORIGIN/functions/v1/yandex/start" 2>/dev/null || echo '000 -')"
set -- $loc
if [[ "$1" == "302" && "${2:-}" == *oauth.yandex.ru* ]]; then
  emit yandex_bridge /functions/v1/yandex/start ok - - '{}'
else
  emit yandex_bridge /functions/v1/yandex/start fail - - "{\"code\":\"$1\"}"
fi

flush_buffer || true
flush_alerts || true
