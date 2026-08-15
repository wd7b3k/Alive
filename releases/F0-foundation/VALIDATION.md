# F0 Validation

Дата: 2026-08-15

## Проверено

- ALIVE расположен внутри разрешённого `projectsv2.0/`, но отделён от HumanOS runtime.
- `projectsv2.0/AGENTS.md` маршрутизирует ALIVE-задачи к собственному `products/alive/AGENTS.md`.
- README содержит ссылки на канонические документы.
- Некоммерческий статус явно зафиксирован в README, Charter и AGENTS.
- Формулировка авторства признаёт заимствования и запрещает присвоение известных методов.
- Facts / hypotheses / heuristics разделены в methodology/governance.
- Privacy contract запрещает auto-publication personal content и рекламное профилирование.
- ALIVE units помечены как behavioural heuristic, а не медицинский эквивалент.
- Version history непротиворечива: v2.7 legacy, v2.8 not production, v3.0 next canonical series.
- v3.0 runtime-код в foundation не добавлен.
- Roadmap разделяет v3.0 Platform, v3.1 Together и v3.2 Admin/Intelligence.
- AI prompt/response сохранены в repo.
- Foundation change не модифицирует код/схему/runtime HumanOS 2.0.

## Result

`PASS` для создания foundation PR.

Merge в `main` является final acceptance этого foundation unit.
