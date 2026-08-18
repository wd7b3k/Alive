# Validation

Дата: 2026-08-18

## Automated

- `npm run format:check`: PASS;
- `npm run lint`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS, 3 files / 15 tests;
- `npm run build`: PASS, с предупреждением о JS chunk > 500 kB.

## Local production smoke

- root render: PASS;
- direct routes `/links`, `/path`, `/meanings`, `/experiment`, `/profile`: PASS;
- browser console errors: 0;
- authenticated flows: не запускались локально, потому что production preview собирался без Supabase env.

## Manual owner validation

- открыть Cloudflare preview root и прямые routes `/links`, `/path`, `/meanings`, `/experiment`, `/profile`;
- проверить Google OAuth redirect;
- пройти onboarding существующего тестового пользователя;
- создать и удалить тестовый эпизод, Связку и Смысл;
- проверить mobile navigation и desktop header;
- искусственно проверить error boundary в dev/test environment при необходимости.

## Not covered

- реальный двухпользовательский RLS isolation test против отдельной test database;
- полный local Supabase reset;
- bundle code splitting.
