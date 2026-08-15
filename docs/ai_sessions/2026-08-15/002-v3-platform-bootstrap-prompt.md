# Prompt — ALIVE v3.0 Platform bootstrap

Дата: 2026-08-15

## Запрос владельца

Начать разработку ALIVE v3.0 кодом, закрепить правило «источник истины — РЕПО» и вести владельца по шагам.

## Канонический контекст

- foundation merged в `main`;
- v2.7 — legacy reference;
- v2.8 не production;
- новая линия — v3.0;
- runtime v3: Cloudflare Pages + Supabase Auth/Google + PostgreSQL/RLS;
- `alive.hmnos.ru` — планируемый production domain;
- migration legacy user data не требуется;
- Together относится к v3.1;
- Admin/Monitoring — v3.2.

## Задача этой сессии

1. создать ветку `alive/v3.0-platform`;
2. явно закрепить repository как единственный source of truth;
3. pre-register v3.0 FR/RISK scope;
4. начать минимальный frontend code bootstrap;
5. добавить versioned initial PostgreSQL migration + RLS;
6. добавить Google/Supabase auth shell;
7. добавить страницу `/experiment` и базовую explainability;
8. открыть v3.0 release unit;
9. не подключать внешние production-сервисы без отдельного шага владельца;
10. остановиться на gate, где требуется remote Supabase/Cloudflare configuration.
