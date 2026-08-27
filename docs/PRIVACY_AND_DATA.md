# Privacy и данные Habitoff

## 1. Принцип

Habitoff работает с данными, которые могут быть чувствительными: зависимое поведение, срывы, триггеры, личные Смыслы, Связки и optional notes.

Поэтому базовая модель:

**минимум сбора + private by default + понятный consent + техническая изоляция.**

## 2. Некоммерческая модель данных

Habitoff не использует пользовательские данные для:

- рекламного таргетинга;
- продажи аудитории;
- передачи data brokers;
- построения маркетингового профиля для третьих сторон.

Если коммерческий статус проекта когда-либо изменится, эти принципы не меняются молча: требуется отдельное privacy decision и новый consent.

**Как устроен consent (с 27.08.2026).** Галочка на экране входа: без неё кнопки
провайдеров выключены. Версия текста и дата пишутся в `profiles.consent_version` и
`consent_accepted_at`; проверка в схеме не даёт записать одно без другого. Версия строкой
означает, что при смене формулировки сравнение с текущей версией само покажет, у кого
согласие устарело, — требование «новый consent» выполняется без отдельной таблицы.
Решение — ADR-0006.

## 3. Identity

План v3:

- Google Sign-In через Supabase Auth;
- Google используется для идентификации пользователя;
- внутренние business entities связаны с собственным UUID;
- email не используется как primary foreign key.

## 4. Tenant isolation

Пользовательские таблицы защищаются PostgreSQL Row Level Security.

Frontend не может доверенно задавать чужой `user_id`.

Политика должна гарантировать, что participant не может читать/изменять private rows другого participant.

## 5. Private content

По умолчанию private:

- Episodes;
- optional notes;
- пользовательские Смыслы;
- пользовательские Связки;
- NRT usage;
- food replacement history;
- детальные triggers/needs;
- индивидуальные settings;
- персональная recommendation history.

## 6. Страница «Вместе»

Группе разрешены только заранее определённые агрегаты.

Не показывать:

- notes;
- тексты Смыслов;
- тексты Связок;
- конкретные craving details;
- NRT;
- пищевые Замены;
- любые приватные тексты.

## 7. UGC

Пользовательский контент попадает в очередь общего каталога только после отдельного действия:

`Предложить в общую базу`.

Submission является отдельной копией/сущностью. Private original не становится публичным.

Желательно хранить отдельный `attribution_allowed`.

## 8. Admin

Админка по умолчанию работает на:

- агрегатах;
- event IDs/categories;
- anonymized/limited operational data;
- explicitly submitted UGC.

Админ не должен получать удобный «просмотр всей личной жизни пользователя» только потому, что технически имеет service role.

Privileged access к private content, если когда-либо потребуется для incident support, должен быть отдельным audited break-glass flow.

## 9. Analytics

Analytics events не должны содержать raw sensitive text.

Хранить:

- event type;
- IDs/categories;
- timestamps;
- latency/error metadata;
- coarse product context.

Не хранить в обычной аналитике full note/meaning/link text.

## 10. Удаление

Пользователь должен иметь возможность:

- удалить отдельный event;
- удалить собственный Смысл/Связку;
- экспортировать свои данные;
- удалить профиль.

Soft delete допустим для event integrity только при понятной retention policy. Полное удаление профиля должно иметь конечный purge path.

## 11. Секреты

Запрещено в git/frontend/logs:

- Supabase service-role keys;
- OAuth secrets;
- email provider tokens;
- реальные private health/behavioural exports;
- access tokens;
- database passwords.

## 12. Инфраструктурные поставщики

Публичная privacy-страница должна честно объяснять: абсолютной изоляции от infrastructure providers не существует.

**Где физически лежат данные (на 27.08.2026).** Приложение и база — на арендованном
сервере Timeweb Cloud в Москве. Supabase развёрнут на этом же сервере, а не в облаке
Supabase: Postgres, GoTrue, PostgREST и Edge-функции — контейнеры на нём. Прокси и
сертификаты — Caddy там же. Cloudflare из схемы выведен и в обработке данных больше не
участвует.

Остаются внешними: **Google** и **Яндекс** — как провайдеры входа (им видно, что человек
вошёл в Habitoff; поведенческих данных они не получают), и **Timeweb Cloud** — как
владелец физической машины. Больше в рантайме к посетителю никто не обращается:
счётчиков, шрифтовых CDN и сторонних скриптов в продукте нет (`PROJECT_CHARTER.md` §2).

**Резервные копии на 27.08.2026 ещё не настроены.** До появления живых участников это
блокирующий пункт, а не задача из бэклога: см. `docs/ROLLOUT.md` §5.

Habitoff не должен обещать «мы вообще никому ничего не передаём», если это технически неверно.

## 13. Privacy language

Допустим прямой человеческий тон:

> Эти данные слишком личные, чтобы превращать их в рекламный профиль.

Но нельзя делать ложные абсолютные заявления о безопасности или противопоставлять себя другим компаниям так, будто third-party infrastructure отсутствует.

## 14. Security gates

До подключения внешних участников v3 должны пройти минимум:

- RLS isolation tests;
- participant vs admin authorization tests;
- frontend secret scan;
- data export/delete tests;
- Together whitelist tests;
- UGC consent tests.
