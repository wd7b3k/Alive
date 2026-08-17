# Ответ AI

Предыдущее требование обязательного локального checkout признано неверным для реального owner workflow ALIVE.

## Исправление

Введены два допустимых режима:

- Direct GitHub Mode — основной режим owner-driven разработки;
- Local Repository Mode — дополнительный режим при наличии checkout.

Создан `docs/CODEX_EXECUTION_MODES.md`.

Обновлён `docs/CODEX_QUALITY_PROTOCOL.md`:

- отсутствие `.git` локально больше не blocker;
- quality gates переносятся на remote equivalents, где это возможно;
- GitHub Actions, PR diff, preview и Supabase tooling используются вместо обязательных local commands;
- недоступная некритичная проверка получает `НЕ ПРОВЕРЕНО`, а не блокирует всю безопасную работу.

Обновлён `releases/v4.0.0-alpha.1/CODEX_LAUNCHER.md`:

- Codex сначала определяет execution mode;
- при доступном writable GitHub repository продолжает release без local checkout;
- не требует от владельца clone, GitHub Desktop, CLI auth или ручную DevOps-настройку;
- продолжает работать в отдельной branch и draft PR;
- сохраняет vertical-slice-first, evidence/privacy и validation requirements.

Создан decision `docs/decisions/2026-08-17-direct-github-owner-workflow.md`.

## Новый принцип

> Качество ALIVE обеспечивается безопасными ветками, commits/PR, evidence, remote CI, development database gates, preview QA и rollback, а не обязательной локальной инженерной настройкой владельца.

Более ранний local-checkout-only подход считается superseded.
