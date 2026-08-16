# UI regression audit ALIVE v3.1

Дата: 2026-08-16

Статус: **BLOCKING REGRESSION IDENTIFIED — BASE UI RESTORED BEFORE CONTINUING**

## Что произошло

Вместо additive расширения утверждённого ALIVE v3.0 был создан параллельный `V31App.tsx`, после чего `main.tsx` переключили с production-approved `RedesignApp` на новый root shell

Diff от production baseline `86b4608` показывает:

- `RedesignApp.tsx` не был эволюционно изменён
- был добавлен новый `V31App.tsx`
- была добавлена параллельная `v31.css`
- `main.tsx` был переключён на новый root component

Таким образом новые функции были реализованы не как extension существующего продукта, а как replacement части клиентского приложения

## Почему это неправильно

Это нарушило несколько принципов одновременно:

- существующий визуальный язык не был сохранён как контракт
- часть функциональности Today была заменена новым представлением
- CI/typecheck/build не могли обнаружить UX regression
- новые светлые/серые surfaces конфликтовали с утверждённой dark visual system
- навигация стала механически расширяться без сохранения прежней композиции
- новый shell создал второй источник frontend-логики вместо развития одного канонического приложения

## Наблюдаемые симптомы

По owner preview review:

- интерфейс визуально воспринимается как другой продукт
- нарушена утверждённая иерархия Today
- Facts surface визуально выбивается из dark ALIVE
- header/nav перегружены
- прежний функционал Today воспринимается потерянным/замещённым

## Root cause

Root cause не в Cloudflare, React или CSS framework

Root cause — **архитектурное решение заменить root shell ради release scope**

Это было возможно потому, что предыдущие правила проекта фиксировали стабильность логотипа и общие UX principles, но не содержали достаточно жёсткого запрета на параллельный root application shell и обязательный visual regression gate

## Немедленная remediation

В branch `agent/v3.1-behavioral-depth-together`:

1. `main.tsx` возвращён на `RedesignApp`
2. `v31.css` больше не подключается к active root
3. новые schema/migrations/research сохраняются
4. новый UI shell перестаёт быть active implementation
5. добавлен `docs/BRANDBOOK.md`
6. `AGENTS.md` требует читать брендбук перед frontend работой
7. новый root shell и глобальная смена visual language переведены в owner decision gate

## Что сохраняется из уже сделанной v3.1 работы

Не откатываются автоматически:

- evidence research
- Myths research
- расширенные Replacement catalog data
- Facts catalog data
- Together aggregate backend/privacy work
- migrations и RLS hardening
- roadmap для Admin/multi-client architecture

Эти части не являются причиной UI regression

## Что должно быть переинтегрировано заново

Следующие v3.1 функции необходимо добавлять непосредственно в утверждённый v3.0 frontend, по одной и с regression review:

1. product-aware CTA
2. более заметный progress
3. clickable completed steps
4. mechanism-aware Replacement ranking
5. expanded Replacement cards/catalog
6. contextual Myth reminder
7. Facts route
8. Together route
9. smoking start year/profile metadata
10. lapse context-disruption copy
11. logo root-cause fix без смены logo asset

## Порядок повторной интеграции

### Phase A — zero-layout-risk changes

- CTA wording
- heading punctuation cleanup
- catalog/ranking backend integration
- start year field
- lapse copy

### Phase B — craving modal refinement

- progress
- clickable steps
- contextual myth
- richer Replacement selection

Всё внутри существующего `r-modal` и текущего dark visual language

### Phase C — new routes

- Facts
- Together

Использовать существующие `r-page`, `r-title`, `r-section`, `r-episode-card` и текущую palette

Не создавать новые light card systems

### Phase D — navigation review

После появления новых routes отдельно решить information architecture для desktop/mobile

Не добавлять бесконечно пункты в один navbar

## Новый release gate

v3.1 не может быть promoted, если:

- новый экран нельзя визуально принять за естественное продолжение v3.0
- хотя бы одна существующая функция Today исчезла
- navigation ухудшилась на mobile
- появился parallel root shell
- visual review владельца не пройден

`typecheck PASS` + `build PASS` не являются достаточным frontend acceptance criterion

## Канонический visual reference

До нового отдельного owner approval визуальным baseline является production-approved v3.0:

- `app/src/RedesignApp.tsx`
- `app/src/redesign.css`
- production commit `86b4608da61b34d6db14648a5d5f591ad6e63bcc`

Все v3.1 frontend additions должны расширять этот baseline
