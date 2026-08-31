#!/usr/bin/env bash
# Установка подсистемы резервного копирования. Идемпотентна: повторный запуск
# обновляет скрипты и юниты и НЕ трогает уже заполненный backup.env.
set -euo pipefail
[ "$(id -u)" = "0" ] || { echo "нужен sudo"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"

install -d -m 700 /etc/habitoff
install -d -m 700 /var/lib/habitoff
install -d -m 700 /srv/alive/backups/outbox
chown -R alive:alive /srv/alive/backups

install -m 755 "$HERE"/bin/habitoff-notify /usr/local/bin/
install -m 755 "$HERE"/bin/habitoff-yadisk /usr/local/bin/
install -m 755 "$HERE"/bin/habitoff-backup /usr/local/bin/
install -m 755 "$HERE"/bin/habitoff-verify /usr/local/bin/
install -m 755 "$HERE"/bin/habitoff-report /usr/local/bin/

if [ -f /etc/habitoff/backup.env ]; then
  echo "backup.env уже существует — не трогаю"
else
  install -m 600 "$HERE"/etc/backup.env.example /etc/habitoff/backup.env
  echo "создан /etc/habitoff/backup.env — его надо заполнить"
fi
install -m 600 "$HERE"/etc/backup.env.example /etc/habitoff/backup.env.example

install -m 644 "$HERE"/units/*.service "$HERE"/units/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now habitoff-backup.timer habitoff-verify.timer habitoff-report.timer

echo
echo "=== ТАЙМЕРЫ ==="
systemctl list-timers 'habitoff-*' --no-pager
echo
echo "Дальше: заполнить /etc/habitoff/backup.env и получить токен Яндекса."
