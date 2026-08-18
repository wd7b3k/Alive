# ALIVE v3.0 stabilization candidate

Статус: **TEST CANDIDATE**. Это отдельный release unit без новых продуктовых функций. Он не объявляет v3.0 production-ready до пользовательского smoke-test и merge в `main`.

## Scope

- удалить подтверждённо неиспользуемый legacy `app/src/App.tsx`;
- отделить routing, session bootstrap, shared UI, utilities и error boundary от корневого приложения;
- обеспечить deep-linking Cloudflare Pages;
- добавить lint, formatter, unit/RLS tests и полный CI gate;
- синхронизировать release discipline и source-of-truth документы.

## Out of scope

- новые экраны, сущности, сценарии и продуктовые тексты;
- изменение методологии, ALIVE units, privacy model или migrations;
- production merge до ручной проверки владельцем.

## Release artifacts

- GitHub branch: `agent/stabilization-release`;
- draft PR: `https://github.com/wd7b3k/Alive/pull/10`;
- Cloudflare branch preview: `https://agent-stabilization-release.alive-aw2.pages.dev`;
- immutable preview первого candidate commit: `https://efb27316.alive-aw2.pages.dev`;
- канонический changelog: `CHANGELOG.md`;
- validation: `VALIDATION.md`;
- rollback: `ROLLBACK.md`.
