# Rollback

- До merge: закрыть hotfix PR или не merge branch.
- После merge: revert hotfix commit целиком; schema и пользовательские данные не затрагиваются.
- Предпочтительный forward-fix для отдельного visual defect: сохранить owner-approved PNG и исправить только CSS/render path.
- Нельзя восстанавливать удалённый самодельный SVG как rollback логотипа.
