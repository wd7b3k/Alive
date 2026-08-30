# Доступ по ssh

`/etc/ssh/sshd_config.d/00-no-password.conf` — копия файла из этого каталога.

## Почему запрет пароля лежит в файле с префиксом 00

`sshd_config` подключает `sshd_config.d/*.conf` первой строкой, файлы читаются в
лексическом порядке, и для большинства ключей **выигрывает первое встреченное
значение**. Это противоположно тому, как ведут себя `conf.d` у большинства демонов, и
на этом здесь уже обожглись:

| Файл | Что говорит | Кто положил |
|---|---|---|
| `50-cloud-init.conf` | `PasswordAuthentication yes` | образ провайдера |
| `99-alive.conf` | `PasswordAuthentication no` | настройка сервера 26.08.2026 |

Запрет из `99-alive.conf` не действовал ни дня: до него дело не доходило. Настройка
выглядела сделанной, `sshd -T` отвечал `yes`, и к 30.08 в журнале было 3692 неудачных
попытки входа и 460 забаненных адресов.

`50-cloud-init.conf` не трогается: он вернётся при следующем обновлении cloud-init.

## Установка

```bash
sudo install -m 644 -o root -g root   /srv/alive/repo/infra/ssh/sshd_config.d/00-no-password.conf   /etc/ssh/sshd_config.d/00-no-password.conf
sudo sshd -t                                   # ДО reload, а не после
ssh alive@habitoff.ru true                     # вход по ключу работает ДО reload
sudo systemctl reload ssh
sudo sshd -T | grep -i passwordauthentication  # должно быть no
ssh alive@habitoff.ru true                     # вход по ключу работает и после
```

Порядок не переставлять. `reload` с испорченным конфигом оставляет работать старый
демон, но проверять это на боевом сервере, где ключ — единственный способ войти, — не
то место для экспериментов. Открытая вторая сессия на время правки стоит дёшево.

`reload`, а не `restart`: перезапуск рвёт текущие сессии, включая ту, из которой
идёт правка.

## Что действует сейчас

```
passwordauthentication no
kbdinteractiveauthentication no
pubkeyauthentication yes
permitrootlogin prohibit-password
permitemptypasswords no
```

Вход только по ключу, `AllowUsers alive root` (в `99-alive.conf`).

## fail2ban

`/etc/fail2ban/jail.d/`: `sshd.local` (aggressive, 5 попыток за 10 минут, бан на час) и
`ignoreip.local` с адресом рабочей машины владельца. Последний нужен по делу: серия
отказов по проверке ключа хоста ловится тем же счётчиком, что и подбор пароля, и
отрезает доступ на время бана.

Проверка состояния:

```bash
sudo fail2ban-client status sshd
```
