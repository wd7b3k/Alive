# Changelog

## Added

- `react-router-dom` routing и Cloudflare Pages `_redirects` fallback;
- render error boundary и локальный сессионный журнал обезличенных ошибок;
- ESLint, Prettier и Vitest;
- unit tests бизнес-расчётов и подбора замен;
- статические RLS-инварианты для versioned migrations;
- CI gate: format, lint, typecheck, tests, build.

## Changed

- session/bootstrap loading, shared UI, navigation и formatting utilities вынесены из `RedesignApp.tsx` в отдельные hooks/components/services;
- release policy фиксирует scope freeze, backlog и обязательное закрытие structural debt.

## Removed

- неиспользуемый legacy `app/src/App.tsx`.

## Product behavior

Новых пользовательских функций и намеренных изменений UX нет.
