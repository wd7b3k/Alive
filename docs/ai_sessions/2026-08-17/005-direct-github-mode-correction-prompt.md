# Запрос владельца

Владелец ALIVE указал, что обязательный local checkout и требование ручного git/CLI создают неприемлемый барьер.

Реальный owner workflow:

- разработка ведётся агентами напрямую;
- документы и release artifacts используются как источник контекста и механизм преемственности;
- ветки/PR/git history используются для отката;
- владелец не должен вручную клонировать repository или становиться программистом/DevOps.

Требуется:

1. убрать обязательный local checkout как blocker;
2. сохранить высокий стандарт качества;
3. поддержать Direct GitHub Mode через connected GitHub tooling;
4. использовать CI/preview/Supabase tooling как remote validation equivalents;
5. обновить правила и launcher 4.0.0-alpha.1;
6. документировать изменение и дать новый Codex prompt.
