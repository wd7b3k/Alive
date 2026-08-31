#!/usr/bin/env bash
# Сроки: сертификаты и регистрация домена. Оба кончаются молча и роняют сайт целиком.
source "$(dirname "$0")/../lib/common.sh"

host_only="${HABITOFF_ORIGIN#https://}"

cert_days() {
  local host="$1"
  local end
  end="$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  [[ -z "$end" ]] && return 1
  echo $(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
}

for h in "$host_only" "www.$host_only"; do
  if days="$(cert_days "$h")"; then
    st=ok; [[ "$days" -le 14 ]] && st=warn; [[ "$days" -le 7 ]] && st=fail
    emit tls_days "$h" "$st" - "$days" '{}'
  else
    emit tls_days "$h" fail - - '{"note":"сертификат не читается"}'
  fi
done

# Домен. whois есть не везде; отсутствие инструмента — это warn, а не тишина.
if command -v whois >/dev/null 2>&1; then
  paid="$(whois "$host_only" 2>/dev/null | sed -n 's/^paid-till:[[:space:]]*//p' | head -1)"
  if [[ -n "$paid" ]]; then
    days=$(( ( $(date -d "$paid" +%s) - $(date +%s) ) / 86400 ))
    st=ok; [[ "$days" -le 30 ]] && st=warn; [[ "$days" -le 14 ]] && st=fail
    emit domain_days "$host_only" "$st" - "$days" '{}'
  else
    emit domain_days "$host_only" warn - - '{"note":"paid-till не найден в ответе whois"}'
  fi
else
  emit domain_days "$host_only" warn - - '{"note":"whois не установлен"}'
fi

flush_buffer || true
flush_alerts || true
