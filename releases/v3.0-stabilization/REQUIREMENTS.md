# Requirements

1. Пользовательские сценарии и визуальное поведение v3.0 alpha не меняются намеренно.
2. Legacy `App.tsx` удаляется только после проверки отсутствия импортов.
3. Внутренняя навигация использует `react-router-dom`, прямые URL возвращают SPA entrypoint на Cloudflare Pages.
4. Ошибки render/runtime не оставляют пустой экран и сохраняют обезличенный локальный диагностический след текущей сессии.
5. CI блокирует merge при ошибке format, lint, typecheck, tests или build.
6. Unit tests покрывают ALIVE units, baseline cost, period metrics, trigger/replacement aggregation и eligibility/ranking замен.
7. SQL test проверяет включение RLS для всех создаваемых public tables, ownership policies критичных private tables и отсутствие anonymous grants.
8. Release scope заморожен; новые идеи не входят в этот release unit.
