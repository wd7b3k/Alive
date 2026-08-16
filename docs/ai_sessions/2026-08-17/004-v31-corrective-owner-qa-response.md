# Response — corrective owner QA

Дата: 2026-08-17

Owner feedback принят как release regression, а не как косметическое замечание.

## Root cause и исправления

Setup сохранял все выбранные products как `target_dependency`. Today, Guided и Quick log затем использовали первый row как fallback, поэтому кальян мог стать default. Теперь:

- пользователь выбирает один explicit primary product;
- остальные products остаются дополнительными;
- ambiguous legacy profile получает CTA `Разобрать тягу`;
- Guided и Quick log не выбирают product за пользователя.

Facts/Myths были технически реализованы, но недостаточно discoverable. Теперь они доступны:

- в secondary desktop header;
- compact shortcut в mobile header;
- knowledge-блок на Today;
- прежний route `/facts` и Profile entry сохранены;
- contextual Myth внутри guided flow сохранён.

Русифицированы preview badge, fallback category/mechanism labels и user-facing auth/data errors. История версий дополнена v3.1.

## Commits и validation

- `d550d4a` — explicit primary product + neutral legacy behavior + Russian UI fallbacks.
- `6e13dff` — visible Facts/Myths + Today knowledge + v3.1 release entry.
- `1326f98` — видимые mobile labels `Факты` и `Вместе` без изменения четырёх main tabs.
- CI `#134` — UI contract/typecheck/build PASS.
- CI `#135` — UI contract/typecheck/build PASS.
- Public preview 390×844 и 1440×960 — PASS.
- Preview badge: `Предпросмотр v3.1 · кандидат в релиз`.

PR #5 остаётся draft. Production/main не изменены. Authenticated post-change owner regression остаётся обязательным до merge.
