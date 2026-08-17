# ADR — серия 4.x и усиление качества agent-driven разработки

Дата: 2026-08-17

Статус: принято владельцем

## Контекст

После разработки v3.x и пересборки Product Strategy стало очевидно два обстоятельства.

Первое: следующая пользовательская версия меняет не отдельную функцию, а основной product loop ALIVE:

> **Пауза → Реальность → Зачем → Выбор → Опыт → Обучение → Свобода**

Второе: качество части изменений, созданных Codex/AI, не удовлетворяет владельца.

Ранний процесс мог давать большой diff и подробный handoff, но оставлять критичные runtime/database/browser проверки на следующие gates. Одного длинного prompt и root `AGENTS.md` недостаточно для стабильно высокого качества.

## Решение 1 — перейти к пользовательской серии 4.x

Следующий новый пользовательский цикл называется **ALIVE 4.x**.

Первый release:

`4.0.0-alpha.1`

Он должен показать первый сквозной пользовательский контур новой стратегии.

Это не означает реализацию всей долгосрочной roadmap в одном diff.

## Почему не продолжать как v3.2/v3.3

v3.x решала прежде всего задачу самостоятельной платформы и роста набора поведенческих модулей.

4.x меняет:

- product backbone;
- терминологию `Смыслы → Зачем`;
- роль Facts/Myths;
- decision flow;
- intervention selection;
- permanent freedom metrics;
- observability;
- personal learning.

Номер 4.x лучше отражает разрыв продуктовой модели.

## Решение 2 — quality не обеспечивается одним master prompt

Ввести многоуровневую систему:

1. root `AGENTS.md` — общие guardrails;
2. scoped `app/AGENTS.md`, `supabase/AGENTS.md`, `docs/AGENTS.md`;
3. `DEVELOPMENT_RULES.md`;
4. `CODEX_QUALITY_PROTOCOL.md`;
5. `CODEX_SKILL_ROUTING.md`;
6. portable skill `alive-release-quality`;
7. mandatory implementation plan;
8. vertical slice first;
9. automated tests;
10. browser QA;
11. database/RLS/advisors gate;
12. adversarial self-review;
13. independent second-agent review where available;
14. factual handoff `PASS / FAIL / НЕ ПРОВЕРЕНО`.

## Решение 3 — специализированные skills

Агент обязан применять специализированный workflow, если он доступен.

Приоритет для текущего стека:

- Supabase;
- PostgreSQL best practices;
- Cloudflare/Wrangler;
- web performance;
- GitHub CI/review/publish;
- browser QA.

Нерелевантные skills не загружаются без необходимости, чтобы не раздувать контекст.

## Решение 4 — независимый reviewer

Крупный release предпочтительно имеет два agent roles:

- author;
- reviewer.

Reviewer не должен доверять авторскому резюме и обязан читать фактический diff/checks.

Если второго агента нет, отсутствие независимого review явно фиксируется.

## Решение 5 — документация как часть runtime quality

Документация не считается вторичной административной задачей.

Каждое значимое изменение должно оставлять:

- rationale;
- release docs;
- validation;
- rollback;
- evolution/decision trace;
- AI audit trail;
- следующий gate.

Новый агент должен продолжить работу без чата владельца.

## Последствия

### Положительные

- меньше скрытого scope drift;
- меньше архитектурных догадок;
- выше шанс поймать ошибку до owner review;
- более стабильная локализация;
- меньше contamination аналитики;
- database/security становятся частью DoD;
- смена агента становится дешёвой.

### Отрицательные

- первоначальная реализация может идти медленнее;
- будет больше маленьких checkpoints и файлов документации;
- часть работы Codex будет тратиться на проверки, а не на новые функции.

Эта цена принимается сознательно.

## Критерий пересмотра

После нескольких 4.x release оценить:

- число regressions;
- количество owner-found issues после agent handoff;
- долю проверок, которые реально выполняются;
- размер diff;
- скорость исправления PR review;
- качество перехода между агентами.

Если процесс становится формальным бюрократическим шумом без снижения ошибок, правила нужно упростить на основании данных.
