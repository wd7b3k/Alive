# Rollback

Этот release candidate не содержит migrations и не меняет данные.

## Preview rollback

1. Закрыть PR без merge.
2. Удалить branch deployment в Cloudflare при необходимости.
3. Продолжить использовать production commit `86b4608da61b34d6db14648a5d5f591ad6e63bcc` на `https://alive-aw2.pages.dev`.

## После merge

1. В Cloudflare Pages выбрать последний успешный deployment предыдущего commit и выполнить rollback deployment.
2. Создать отдельный revert PR для stabilization commit; не переписывать историю `main`.
3. Изменения БД не требуются.
