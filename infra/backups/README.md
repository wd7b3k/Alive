# Резервное копирование Habitoff

Исходники того, что работает на сервере. Правится здесь, а не в `/usr/local/bin` —
иначе через месяц никто не вспомнит, откуда там взялся код.

## Установка и обновление

```bash
sudo ./install.sh
```

Идемпотентно: обновляет скрипты и юниты, включает таймеры и **не трогает** уже
заполненный `/etc/habitoff/backup.env`.

## Из чего состоит

| Файл | Роль |
|---|---|
| `bin/habitoff-backup` | дамп, конфиги, шифрование, отправка, чистка. Ежедневно 00:30 UTC |
| `bin/habitoff-verify` | поднимает базу из последней копии и сверяет с живой. Воскресенье 01:30 UTC |
| `bin/habitoff-report` | недельная сводка «всё живо». Понедельник 06:00 UTC |
| `bin/habitoff-yadisk` | загрузка в папку приложения на Яндекс.Диске, обновление токена |
| `bin/habitoff-notify` | единственное место, откуда уходят сообщения |
| `units/` | таймеры systemd и `OnFailure=` на каждом задании |
| `etc/backup.env.example` | шаблон секретов |

Сервер живёт в UTC. По Москве это 03:30, 04:30 и 09:00 соответственно.

## Секреты

`/etc/habitoff/backup.env`, права 600, владелец root. **В git не попадает никогда.**
Заполняются пять значений: пара от приложения Яндекса, пароль шифрования и пара для
Telegram. Токены Диска записывает скрипт сам.

Пароль шифрования обязан лежать в менеджере паролей владельца. Без него копии на
Яндекс.Диске бесполезны — это единственная невосстановимая потеря во всей схеме.

## Первичная настройка Яндекс.Диска

Приложение на `oauth.yandex.ru` с правом **`cloud_api:disk.app_folder`** и только им:
токен окажется заперт в одной папке и не увидит остального Диска. Redirect URI —
`https://oauth.yandex.ru/verification_code`.

```bash
# открыть в браузере, подставив свой client_id, и скопировать показанный код
# https://oauth.yandex.ru/authorize?response_type=code&client_id=…
sudo habitoff-yadisk token <код>
sudo habitoff-yadisk check
```

## Проверка руками

```bash
sudo systemctl start habitoff-backup.service
sudo systemctl start habitoff-verify.service
sudo cat /var/lib/habitoff/last-verify        # ждём PASS
sudo habitoff-yadisk list
systemctl list-timers 'habitoff-*'
```

## Восстановление

```bash
# 1. Забрать копию с Диска и расшифровать
gpg --decrypt habitoff-YYYYMMDD-HHMM.tgz.gpg > bundle.tgz
tar xzf bundle.tgz                 # даст db-*.dump и conf-*.tgz

# 2. Поднять стек из конфигов, если их тоже потеряли
tar xzf conf-*.tgz -C /srv/supabase

# 3. Развернуть базу В ПУСТУЮ БАЗУ, а не в postgres
docker exec supabase-db createdb -U postgres restored
docker exec -i supabase-db pg_restore -U postgres -d restored --no-owner < db-*.dump
```

Третий шаг существенен. Образ `supabase/postgres` при первом старте сам наполняет базу
`postgres` — своя схема `auth`, свои роли. Восстановление в непустую базу молча не
доносит данные: первая же автоматическая проверка 27.08.2026 показала ноль пользователей
при трёх живых именно поэтому.

## Что эта схема не закрывает

Обе копии в одной стране и у двух поставщиков; географического разнесения нет.
Пароль шифрования лежит на том же сервере, что и данные, — значит шифрование защищает
копию у Яндекса, а не сервер. Пока в `backup.env` не прописан токен Telegram, сообщения
уходят только в системный журнал, и «узнать о поломке, не заходя на сервер» не работает.
