# Веб-сервер

`Caddyfile` здесь — канонический. `/etc/caddy/Caddyfile` на сервере является его копией
и правится только установкой из репозитория: `AGENTS.md` требует, чтобы внешняя
конфигурация, влияющая на работу продукта, имела версионируемое отражение, а
`RELEASE_POLICY` §9 — чтобы изменение конфигурации и запись о нём лежали в одном коммите.

## Что этот конфиг решает

| Блок | Зачем |
|---|---|
| `/rest/v1/*`, `/auth/v1/*`, `/functions/v1/*` | шлюз Supabase на `127.0.0.1:8000` |
| `/functions/v1/yandex/*` | подстановка заголовка `apikey`: браузер при переходе по ссылке заголовков не шлёт, и возврат от Яндекса упёрся бы в 401 |
| `@assets` | имя чанка содержит хэш — файл кэшируется год |
| `@not-assets` | всё остальное `no-cache`. **Матчер обязателен:** `header` без матчера перезаписывает заголовок всем, включая `/assets/*` |
| `header /site.webmanifest` | расширения `.webmanifest` Caddy не знает и `Content-Type` не ставит вовсе |
| `@app` + `rewrite` | экраны, которые рисует клиент: своего файла у них нет |
| `try_files` + `file_server` | всё остальное отдаётся только если лежит на диске, иначе 404 |
| `www.habitoff.ru` | 301 на apex. Две копии сайта в индексе — это разъехавшаяся статистика |

## Ключ

Публикуемый ключ Supabase не лежит в этом файле: он приходит из
`/etc/habitoff-caddy.env` через drop-in `caddy.service.d/habitoff-env.conf`. Ключ не
секрет — он и так уезжает в браузер, — но при ротации меняется одно значение на сервере,
а не коммит в репозитории. Оговорка: юнит запускает `caddy run --environ`, поэтому
значение попадает в журнал systemd при старте. Для публикуемого ключа это допустимо; для
настоящего секрета такой способ не годится.

## Установка

```bash
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo install -m 644 /srv/alive/repo/infra/caddy/caddy.service.d/habitoff-env.conf \
                    /etc/systemd/system/caddy.service.d/habitoff-env.conf
sudo install -m 600 -o root -g root \
     /srv/alive/repo/infra/caddy/habitoff-caddy.env.example /etc/habitoff-caddy.env
sudo nano /etc/habitoff-caddy.env          # публикуемый ключ Supabase
sudo systemctl daemon-reload
```

Дальше — при каждом изменении конфигурации:

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak     # откат в одну команду
sudo install -m 644 /srv/alive/repo/infra/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile         # до reload, а не после
sudo systemctl reload caddy
```

`validate` до `reload` — не формальность: `reload` с испорченным конфигом оставляет
работать старый, но `restart` уже нет, и разница обнаруживается в худший момент.

## Как проверить, а не поверить

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://habitoff.ru/what-new        # 404
curl -s -o /dev/null -w '%{http_code}\n' https://habitoff.ru/knowledge       # 200
curl -s https://habitoff.ru/knowledge | grep canonical                       # /knowledge
curl -sI https://habitoff.ru/site.webmanifest | grep -i content-type          # manifest+json
curl -sI https://habitoff.ru/assets/index-*.js | grep -i cache-control        # immutable
curl -s -o /dev/null -w '%{http_code}\n' https://www.habitoff.ru/            # 301
```

Отдельно — вход через Яндекс: он единственный зависит от подстановки заголовка, и
ломается молча. Быстрая проверка — `infra/monitoring/checks/supabase.sh`, поле
`yandex_bridge`.

## Откат

```bash
sudo install -m 644 /etc/caddy/Caddyfile.bak /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
