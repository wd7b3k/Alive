#!/usr/bin/env bash
# Группа проверок. Три группы вместо восьми таймеров: частота у проверок разная,
# а поводов заводить восемь юнитов нет.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  fast)  checks=(http supabase) ;;
  slow)  checks=(postgres containers host caddy-errors) ;;
  daily) checks=(certs backups) ;;
  *) echo "использование: run-check.sh fast|slow|daily" >&2; exit 2 ;;
esac

status=0
for c in "${checks[@]}"; do
  # Упавший скрипт не должен уносить с собой остальные: одна сломанная проверка
  # не повод остаться без всех остальных.
  "$here/checks/$c.sh" || status=1
done

if [[ "${1}" == "daily" ]]; then
  source "$here/lib/common.sh"
  psql_run -c "select ops.roll_up_and_prune(90);" >/dev/null || status=1
fi

exit "$status"
