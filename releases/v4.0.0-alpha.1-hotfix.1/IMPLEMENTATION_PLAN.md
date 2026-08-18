# Implementation Plan

1. Восстановить бинарный logo asset из owner-approved commit и проверить SHA-256.
2. Подключить asset в `RedesignApp.tsx`, удалить подменяющий SVG.
3. Собрать `/facts` поверх `data.release4.awarenessContent` без legacy data path.
4. Вернуть входы в раздел на desktop/mobile, главной и в профиле.
5. Удалить точки из статических заголовков.
6. Добавить contract test и постоянное правило в `DEVELOPMENT_RULES.md`.
7. Выполнить typecheck, tests, build, browser smoke и remote preview QA.

Scope frozen: только перечисленные regression corrections и необходимая документация.
