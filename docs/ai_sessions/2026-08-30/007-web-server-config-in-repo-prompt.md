# Конфигурация веб-сервера в репозиторий

Запрос владельца, 30.08.2026. Сессия C из пяти. Делать строго после сессии A, иначе
предрендеренные адреса начнут отдавать 404.

Карточки: `konfiguraciya-veb-servera-ne`, `nesuschestvuyuschiy-put-otdaet-dvesti`,
`manifest-otdaetsya-kak-tekstovyy`.

Снять текущий `Caddyfile` с сервера, положить в `infra/` без секретов, оттуда же: 404 на
неизвестный путь вместо подстановки `index.html`, content-type
`application/manifest+json` для `site.webmanifest`, редирект `www` сохранить.

Приёмка: `https://habitoff.ru/what-new` отдаёт 404, все адреса из `sitemap.xml` отдают
200, `GET /site.webmanifest` отдаёт `application/manifest+json`.

Правила сессии: одна ветка от актуального `origin/main`; прод правится только выкладкой
из репозитория, не руками по ssh; сессия заканчивается пушем и PR, даже если работа не
закончена; проверка фактами.
