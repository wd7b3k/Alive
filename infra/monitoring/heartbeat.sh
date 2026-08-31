#!/usr/bin/env bash
# Пульс сторожу на втором сервере.
#
# Это единственная проверка, которую нельзя сделать отсюда: «сервер лёг целиком».
# Пока пульс идёт — сервер жив. Пропал на пятнадцать минут — сторож сообщает сам,
# и ему для этого ничего от нас уже не нужно.
source "$(dirname "$0")/lib/common.sh"

[[ -n "${WATCHDOG_URL:-}" && -n "${HEARTBEAT_TOKEN:-}" ]] || exit 0
curl -sS --max-time "$CURL_TIMEOUT" -X POST "$WATCHDOG_URL/heartbeat" \
  -H "X-Habitoff-Token: $HEARTBEAT_TOKEN" -o /dev/null
