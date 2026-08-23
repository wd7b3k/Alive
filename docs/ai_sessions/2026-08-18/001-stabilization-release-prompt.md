# Prompt

Выполнить инженерный stabilization release ALIVE без новых продуктовых функций: удалить мёртвый legacy App после проверки импортов, декомпозировать RedesignApp, заменить routing на react-router с Cloudflare deep-linking, добавить lint/formatter/tests/RLS checks/error handling, синхронизировать source-of-truth и release discipline, обновить CI, оформить requirements/validation/rollback/changelog и отдать Cloudflare preview URL для теста.

Дополнительное правило владельца: не создавать локальный склад release-артефактов; handoff и каноническое состояние вести через GitHub.
