# Prompt — Google OAuth и frontend CI

Дата: 2026-08-15

## Запрос владельца

Владелец сообщил, что Google OAuth и Google provider в Supabase настроены, и ожидает продолжения пошаговой настройки ALIVE v3.0.

## Канонический контекст

- source of truth: `wd7b3k/Alive`;
- active branch: `v3.0-platform`;
- Supabase project: `xkigijaqimzuveyzyzyk`;
- schema/RLS migrations уже применены;
- Google OAuth shell уже присутствует во frontend;
- OAuth Dashboard configuration нельзя считать end-to-end PASS без реального входа.

## Задача

1. отразить external OAuth configuration в repo без сохранения секретов;
2. создать воспроизводимый GitHub frontend CI;
3. зафиксировать dependency lock;
4. перейти на `npm ci`;
5. проверить `typecheck` и production build;
6. обновить CURRENT_STATE/VALIDATION;
7. определить следующий минимальный ручной шаг владельца.
