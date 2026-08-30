# Предрендер публичных адресов

Запрос владельца, 30.08.2026. Сессия A из пяти, порядок сессий задан и менять его
нельзя: сессия C ломает A, если сделать её раньше.

Карточки: `canonical-na-vseh-adresah`, `seo-releases-crawler`,
`karta-sayta-bez-stranicy`, `gruppy-robotov-v-robots`.

Плагин сборки раскладывает отдельные `index.html` для `/knowledge`, `/links`,
`/meanings`, `/experiment`, `/releases` с их собственными title, description, canonical
и og:url — источник значений уже есть в `app/src/services/seo.ts`, дублировать его
нельзя. Для `/releases` дополнительно выложить в статику тексты из константы `RELEASES`
(`app/src/redesign/releases.ts`). Добавить `/releases` в `sitemap.xml` и `lastmod` всем
адресам. В `robots.txt` устранить то, что группы `GPTBot`, `ClaudeBot`, `PerplexityBot`
и `YandexBot` не наследуют `Disallow` личных экранов, и убрать устаревшую директиву
`Host`.

Приёмка: `curl -s https://habitoff.ru/knowledge | grep canonical` показывает
`/knowledge`; `curl` без JS возвращает тексты релизов; тела ответов `/knowledge` и
`/links` больше не совпадают побайтно.

Правила сессии: одна ветка от актуального `origin/main`, один критерий приёмки;
карточки закрываются трейлером `Board: done` в том же коммите, найденное попутно —
`Board: new` там же; никаких внешних сервисов в рантайме прода; прод правится только
выкладкой из репозитория; проверка фактами, а не «должно работать».
