#!/usr/bin/env bash
# Бэкапы.
#
# Скрипт бэкапа на сервере устроен лучше, чем эта проверка предполагала: он снимает дамп
# базы и архив конфигурации, шифрует их в один пакет, увозит на Яндекс.Диск и оставляет
# состояние в /var/lib/habitoff. Поэтому проверка не считает файлы там, где он уже
# написал о себе сам.
#
# Четыре разных вопроса, и третий с четвёртым важнее первых двух:
#   1. свежий ли локальный дамп;
#   2. не схлопнулся ли он в пустышку;
#   3. уехала ли копия наружу — сервер, потерявший диск, уносит с собой и локальные копии;
#   4. когда её последний раз разворачивали. Бэкап, который никто не восстанавливал, —
#      это файл, а не бэкап.
source "$(dirname "$0")/../lib/common.sh"

: "${BACKUP_DIR:=/srv/alive/backups}"
: "${BACKUP_STATE_DIR:=/var/lib/habitoff}"

# --- 1. Свежесть локального дампа ---
latest="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | head -1 || true)"
if [[ -z "$latest" ]]; then
  emit backups_age "$BACKUP_DIR" fail - - '{"note":"дампов нет вовсе"}'
  flush_buffer || true; flush_alerts || true; exit 0
fi

age_h=$(( ( $(date +%s) - $(stat -c %Y "$latest") ) / 3600 ))
st=ok; [[ "$age_h" -ge 26 ]] && st=fail
emit backups_age "$(basename "$latest")" "$st" - "$age_h" '{}'

# --- 2. Размер против предыдущего ---
# Резкое падение — признак того, что дамп снялся с пустой или частичной базы.
prev="$(ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null | sed -n 2p || true)"
if [[ -n "$prev" ]]; then
  new_size="$(stat -c %s "$latest")"; old_size="$(stat -c %s "$prev")"
  if [[ "$old_size" -gt 0 ]]; then
    ratio=$(( new_size * 100 / old_size ))
    st=ok; [[ "$ratio" -lt 80 ]] && st=fail
    emit backups_size "$(basename "$latest")" "$st" - "$ratio" "{\"bytes\":$new_size}"
  fi
fi

# --- 3. Уехала ли копия наружу ---
# Скрипт бэкапа сообщает о неудачной отправке сам — но одним сообщением в тот день,
# когда она случилась. Молчание на третий день неотличимо от «всё хорошо», поэтому
# состояние проверяется отдельно и каждые сутки.
if [[ -r "$BACKUP_STATE_DIR/last-upload" ]]; then
  up_age_h=$(( ( $(date +%s) - $(cat "$BACKUP_STATE_DIR/last-upload") ) / 3600 ))
  st=ok; [[ "$up_age_h" -ge 26 ]] && st=warn; [[ "$up_age_h" -ge 50 ]] && st=fail
  emit backups_offsite - "$st" - "$up_age_h" '{}'
else
  emit backups_offsite - fail - - '{"note":"наружу не уезжало ни разу"}'
fi

# Пакеты, застрявшие в outbox: отправка не удалась и файл ждёт следующего раза.
# `|| true` обязателен: пустой outbox — это успех, но глоб не находит ничего, ls
# отдаёт 2, pipefail пробрасывает код наружу, и присваивание под set -e убивает
# проверку ровно в тот момент, когда с бэкапами всё хорошо.
stuck="$(ls -1 "$BACKUP_DIR"/outbox/*.gpg 2>/dev/null | wc -l || true)"
if [[ "$stuck" -gt 1 ]]; then
  emit backups_outbox - warn - "$stuck" '{"note":"пакеты копятся — отправка не проходит"}'
else
  emit backups_outbox - ok - "$stuck" '{}'
fi

# --- 4. Давность проверки восстановления ---
# Метку ставит скрипт проверки восстановления, а не человек и не эта проверка.
marker="$BACKUP_STATE_DIR/last-restore-test"
if [[ -r "$marker" ]]; then
  days=$(( ( $(date +%s) - $(stat -c %Y "$marker") ) / 86400 ))
  st=ok; [[ "$days" -ge 30 ]] && st=warn; [[ "$days" -ge 60 ]] && st=fail
  emit backups_restore_test - "$st" - "$days" '{}'
else
  emit backups_restore_test - fail - - '{"note":"восстановление не проверялось ни разу"}'
fi

flush_buffer || true
flush_alerts || true
