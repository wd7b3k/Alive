# Habitoff — frontend

## Требования

- Node.js `>=22.12.0`;
- npm;
- адрес Supabase и publishable key.

## Локальный запуск

Из корня репозитория:

```bash
cd app
cp .env.example .env
npm ci
npm run dev
```

Заполнить в `.env`:

```env
VITE_SUPABASE_URL=https://habitoff.ru
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_APP_ORIGIN=http://localhost:5173
VITE_AUTH_PROVIDERS=google,yandex
VITE_GA_MEASUREMENT_ID=
VITE_YANDEX_METRIKA_ID=
```

`VITE_SUPABASE_URL` — это адрес сайта, а не отдельный хост бэкенда: на своём сервере
Caddy разводит `/rest/v1`, `/auth/v1` и `/functions/v1` на шлюз Supabase по путям,
а всё остальное отдаёт статикой. Отдельного адреса вида `<ref>.supabase.co` больше нет.

`.env` не коммитится — он в `.gitignore`. Это не формальность: на self-hosted там лежат
ключи, а не только адрес проекта.

## Проверка

```bash
npm run typecheck
npm run build
```

## Выкладка

Вручную ничего собирать не надо. На сервере:

```bash
/srv/alive/deploy.sh
```

Скрипт проверяет, что рабочее дерево git чистое и что число файлов миграций равно числу
записей в журнале миграций базы, собирает, кладёт сборку в новый каталог и атомарно
переключает симлинк. Подробности и откат — в [`../docs/RELEASE_POLICY.md`](../docs/RELEASE_POLICY.md).

## Переменные окружения на проде

Vite подставляет `VITE_*` **на этапе сборки**, а не в рантайме. Поэтому изменение любой
из них требует пересборки и новой выкладки — само по себе оно ничего не поменяет.

## Security

В `VITE_*` запрещено помещать:

- `service_role` / secret key Supabase;
- client secret Google или Яндекса;
- пароль базы;
- токены почтовых сервисов.

Frontend может содержать только публичный адрес и publishable key; доступ к приватным
данным ограничивается RLS. Скан собранного бандла на секреты — постоянный шаг CI.
