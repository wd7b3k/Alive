# Privacy и данные ALIVE

## 1. Принцип

ALIVE работает с данными, которые могут быть чувствительными: зависимое поведение, срывы, триггеры, личные Смыслы, Связки и optional notes.

Поэтому базовая модель:

**минимум сбора + private by default + понятный consent + техническая изоляция.**

## 2. Некоммерческая модель данных

ALIVE не использует пользовательские данные для:

- рекламного таргетинга;
- продажи аудитории;
- передачи data brokers;
- построения маркетингового профиля для третьих сторон.

Если коммерческий статус проекта когда-либо изменится, эти принципы не меняются молча: требуется отдельное privacy decision и новый consent.

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

Google, Cloudflare, Supabase и другие задействованные providers могут обрабатывать технические данные по своим правилам.

ALIVE не должен обещать «мы вообще никому ничего не передаём», если это технически неверно.

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
