# Архитектура Habitoff v3 — принятое направление

## 1. Статус

Документ фиксирует архитектуру текущей серии. С 27.08.2026 весь контур работает на
собственном сервере; причины ухода с Cloudflare Pages и Supabase Cloud — в
[`decisions/ADR-0007-self-hosted-ru-contour.md`](decisions/ADR-0007-self-hosted-ru-contour.md),
фактическое состояние развёртывания — в
[`INFRASTRUCTURE_STATE.md`](INFRASTRUCTURE_STATE.md).

Основной принцип: **простая архитектура, достаточная для нескольких участников и
дальнейшего роста, без преждевременного усложнения.**

## 2. High-level

```
Браузер / мобильный веб (РФ)
        │ 443
        ▼
   habitoff.ru — один сервер в Москве
        │
   ┌────┴──────────────────────────────────────────┐
   │ Caddy: TLS (Let's Encrypt), маршрутизация     │
   │   /                → статика из current/      │
   │   /rest/v1  ┐                                 │
   │   /auth/v1  ├─────► Envoy (шлюз Supabase)     │
   │   /functions/v1 ┘        ├ GoTrue (вход)      │
   │                          ├ PostgREST          │
   │                          ├ edge-runtime       │
   │                          └ postgres-meta      │
   │                              │                │
   │                          PostgreSQL + RLS     │
   │   studio — только через SSH-туннель           │
   └───────────────────────────────────────────────┘
```

Наружу открыты только `22`, `80`, `443`. Всё остальное слушает `127.0.0.1`.

**Никаких внешних сервисов в рантайме.** Единственные внешние обращения продакшна:
Let's Encrypt за сертификатом и сами провайдеры входа (`accounts.google.com`,
`oauth.yandex.ru`) в момент нажатия кнопки — без них OAuth не бывает. Ни CDN, ни
внешнего мониторинга, ни облачных функций, ни S3.

Операционные задачи и почтовые уведомления, если появятся, живут на этом же сервере
systemd-таймерами, а не внешним планировщиком.

## 3. Frontend

Web-first responsive client в `app/`. Сборка — статические файлы, которые отдаёт Caddy
из каталога, на который смотрит симлинк `current`.

Требования:

- mobile-first craving flow;
- desktop-friendly analytics/settings/methodology;
- no service secrets;
- прямой аутентифицированный клиент Supabase допустим только для RLS-защищённых
  user-scoped операций;
- privileged/admin/server operations — только через server-side functions.

Адрес API и адрес сайта совпадают: `VITE_SUPABASE_URL=https://habitoff.ru`. Разведение
идёт по путям на уровне Caddy, отдельного хоста бэкенда не существует. Побочный эффект,
ради которого это в том числе и делается: браузер не ходит ни на один сторонний домен.

**Два вида страниц, а не один.** Экраны продукта рисует React из одного бандла. Страницы
базы знаний (`/knowledge/<кластер>/<статья>`, `/knowledge/method`) — статические
документы без приложения и без гидрации: их раскладывает сборка, а оформление они берут
из того же файла стилей. Причина в весе: стартовый чанк — 613 КБ, и человеку, пришедшему
из поиска прочитать один ответ, он не нужен ни для чего. Плата — переход между двумя
видами страниц идёт полной загрузкой, и ссылки на статьи поэтому обычные `<a>`.

**Содержание раздела живёт вне `app/`.** Статьи лежат в `content/knowledge/` в корне
репозитория: их правит редактор, а не разработчик. Утверждения о здоровье там не
дублируются — статья цитирует карточку каталога по коду, а текст подставляется на
сборке из базы (ADR-0017).

## 4. Auth

Два способа входа, устроенные по-разному, и это важно понимать.

**Google** — встроенный провайдер GoTrue, включается переменными окружения.

**Яндекс** — собственный мост в edge-функциях. GoTrue не знает Яндекса и знать не может:
в self-hosted список провайдеров фиксирован, и вдобавок GoTrue ищет OIDC-claim `email`,
которого Яндекс не отдаёт. Мост сам меняет код на профиль и выпускает сессию через
админский API. Подробности и требования безопасности — в
[`AUTH_PROVIDERS.md`](AUTH_PROVIDERS.md).

Собственные пароли и invite-сессии не создаются. Внутренняя модель использует
`auth.uid()`/internal UUID для tenant isolation. Почтовый сервис не требуется.

## 5. Database

PostgreSQL — durable runtime data store. **Источник истины схемы — только
`supabase/migrations/` в репозитории.**

Основные принципы:

- normalized enough for integrity;
- raw events immutable/traceable where possible;
- derived metrics rebuildable;
- RLS on private entities;
- soft delete where auditability matters;
- schema migrations versioned in git.

С переездом появилось следствие, которого не было в облаке: база теперь **поднимается из
миграций**, а не существует как данность. Прогон всех миграций на чистой базе перестал
быть документированным шагом и стал обязательным условием.

## 6. Privileged logic

Edge Functions/DB functions используются только там, где действительно требуются
privileged credentials/authorization:

- удаление аккаунта (`supabase/functions/delete-account`);
- мост входа через Яндекс (`supabase/functions/yandex`);
- будущие admin operations, UGC publish/review, дайджесты, health checks, privileged
  агрегации.

Не использовать Edge Functions для каждой простой CRUD-операции без причины.

## 7. Analytics

Отделять:

- product events;
- behavioural domain facts;
- operational telemetry.

Не дублировать sensitive text в analytics.

Для групповой статистики использовать заранее агрегированные daily metrics, а не тяжёлые
пересчёты всей истории при каждом открытии. На своём сервере это перестало быть вопросом
стиля: за процессор теперь платит владелец.

## 8. Module boundaries

Реализуется как modular monolith на уровне приложения/БД с явным ownership и public
contracts между модулями. Микросервисы на ранней стадии не нужны.

## 9. Data model evolution

Raw tobacco facts не зависят от equivalence model.

Пример:

- raw: `hookah_session_count=1`;
- derived: `alive_units=10` по `equivalence_model=v1`.

При изменении модели raw history остаётся прежней.

## 10. Security

До внешнего пилота:

- RLS coverage/tenant isolation tests — включая проверку снаружи, через боевой путь;
- admin authorization tests, когда admin появится;
- secret scanning бандла;
- CSP/security headers;
- audit critical privileged actions;
- **backup/restore path, проверенный восстановлением на пустом стеке**;
- export/delete test;
- сканирование периметра снаружи: открыты ровно 22, 80, 443.

Два последних пункта появились вместе со своим сервером. Раньше за периметр и
восстановление отвечал провайдер.

## 11. Домен

Основной адрес: `habitoff.ru`, регистратор и DNS — Рег.ру. Cloudflare не участвует ни в
одном звене.

`alive.hmnos.ru` остаётся на прежней инфраструктуре и после переключения отвечает 301.
Старый прод не выключается две недели после перевода трафика.

## 12. Что не требуется

- Kubernetes;
- микросервисы;
- ClickHouse;
- Redis cluster;
- GPU/LLM infrastructure;
- event bus;
- сложный data warehouse;
- CDN, второй сервер под staging, реплика Postgres, anti-DDoS — это этап 2, после
  подтверждения продуктовой гипотезы, а не вместе с переездом.

Добавлять только при измеренном trigger.
