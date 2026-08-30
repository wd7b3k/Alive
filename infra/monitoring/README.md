# Наблюдаемость Habitoff

Что здесь лежит и почему именно так.

## Два сервера, и это не избыточность

Мониторинг на том же сервере, что и продукт, не умеет сообщить о его смерти. Поэтому
проверок два круга:

- **на боевом VPS** — `infra/monitoring/`: восемь скриптов, три таймера, история в схеме
  `ops` той же базы;
- **на втором сервере** — `infra/watchdog/`: приём пульса, реле алертов в Telegram и
  независимый зонд снаружи.

Сообщения с боевого сервера уходят через `/usr/local/bin/habitoff-notify` — то же
единственное место, откуда пишет о себе бэкап. Отдельный канал заводить нельзя: два
канала расходятся через месяц, и половина алертов начинает приходить не туда, где их
читают. Сторожу на втором сервере нужен свой токен — он сообщает как раз тогда, когда
боевой молчит.

## Что проверяется

| Группа | Частота | Проверки |
|---|---|---|
| `fast` | минута | apex, редирект `www`, отпечаток живой сборки, `/auth/v1/health`, чтение каталога через PostgREST, первый шаг моста Яндекса |
| `slow` | 5 минут | Postgres (соединения, долгий запрос, страховка RLS), контейнеры и рестарты, диск, память, swap, нагрузка, доля 5xx по журналу Caddy |
| `daily` | сутки | сроки сертификатов и домена, свежесть и размер бэкапа, давность проверки восстановления, свёртка истории |

Пульс уходит отдельным таймером каждые пять минут.

## Установка на боевом сервере

```bash
sudo install -m 600 -o root -g root \
  /srv/alive/repo/infra/monitoring/systemd/habitoff-monitoring.env.example \
  /etc/habitoff-monitoring.env
sudo nano /etc/habitoff-monitoring.env            # ключ anon, адрес сторожа, общий секрет
sudo cp /srv/alive/repo/infra/monitoring/systemd/habitoff-check@.service \
        /srv/alive/repo/infra/monitoring/systemd/habitoff-heartbeat.service \
        /srv/alive/repo/infra/monitoring/systemd/habitoff-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now habitoff-check-fast.timer habitoff-check-slow.timer \
                            habitoff-check-daily.timer habitoff-heartbeat.timer
```

Разовый прогон без таймера — `sudo /srv/alive/repo/infra/monitoring/run-check.sh fast`.

## Установка сторожа на втором сервере

```bash
sudo useradd --system --no-create-home habitoff-watchdog
sudo mkdir -p /opt/habitoff-watchdog
sudo cp infra/watchdog/watchdog.py /opt/habitoff-watchdog/
sudo install -m 600 -o root -g root infra/watchdog/habitoff-alerts.env.example /etc/habitoff-alerts.env
sudo nano /etc/habitoff-alerts.env                # токен бота, чат, общий секрет
sudo cp infra/watchdog/systemd/habitoff-watchdog.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now habitoff-watchdog
```

Порт `8787` должен быть открыт только для адреса боевого сервера. Открытый всему миру
порт с общим секретом — это приглашение подбирать секрет.

## Как это проверить, а не поверить

Мониторинг, который никогда не срабатывал, — это предположение. Порядок проверки каждого
слоя описан в `docs/RUNBOOK_ALERTS.md`, раздел «Учебная тревога».

## Чего здесь нет намеренно

- **Prometheus и Grafana.** На одном сервере с восемью проверками они дают графики ценой
  полутора гигабайт памяти и четырёх новых движущихся частей. Если проверок станет
  вчетверо больше — вернуться к этому вопросу.
- **Внешнего сервиса мониторинга.** Он решает ту же задачу, что второй сервер, но ценой
  ещё одного получателя данных о продукте.
- **Оповещений по почте.** Почтового канала у продукта нет вовсе (см. `docs/INFRASTRUCTURE_STATE.md`).
