#!/usr/bin/env bash
# Бэкапы. Три отдельных вопроса, и второй с третьим важнее первого:
# свежий ли дамп, не схлопнулся ли он в пустышку, и когда его последний раз
# разворачивали. Бэкап, который никто не восстанавливал, — это не бэкап, а файл.
source "$(dirname "$0")/../lib/common.sh"

latest="$(ls -1t "$BACKUP_DIR"/*.sql* 2>/dev/null | head -1 || true)"
if [[ -z "$latest" ]]; then
  emit backups_age "$BACKUP_DIR" fail - - '{"note":"дампов нет вовсе"}'
  flush_buffer || true; flush_alerts || true; exit 0
fi

age_h=$(( ( $(date +%s) - $(stat -c %Y "$latest") ) / 3600 ))
st=ok; [[ "$age_h" -ge 26 ]] && st=fail
emit backups_age "$(basename "$latest")" "$st" - "$age_h" '{}'

# Резкое падение размера — признак того, что дамп снялся с пустой или частичной базы.
prev="$(ls -1t "$BACKUP_DIR"/*.sql* 2>/dev/null | sed -n 2p || true)"
if [[ -n "$prev" ]]; then
  new_size="$(stat -c %s "$latest")"; old_size="$(stat -c %s "$prev")"
  if [[ "$old_size" -gt 0 ]]; then
    ratio=$(( new_size * 100 / old_size ))
    st=ok; [[ "$ratio" -lt 80 ]] && st=fail
    emit backups_size "$(basename "$latest")" "$st" - "$ratio" "{\"bytes\":$new_size}"
  fi
fi

# Метку ставит скрипт проверки восстановления, а не человек и не эта проверка.
marker="$BACKUP_DIR/.last-restore-test"
if [[ -r "$marker" ]]; then
  days=$(( ( $(date +%s) - $(stat -c %Y "$marker") ) / 86400 ))
  st=ok; [[ "$days" -ge 30 ]] && st=warn; [[ "$days" -ge 60 ]] && st=fail
  emit backups_restore_test - "$st" - "$days" '{}'
else
  emit backups_restore_test - fail - - '{"note":"восстановление не проверялось ни разу"}'
fi

flush_buffer || true
flush_alerts || true
