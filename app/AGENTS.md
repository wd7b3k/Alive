# Правила Codex для `app/`

Этот файл применяется ко всему frontend-коду ALIVE внутри `app/` и дополняет root `AGENTS.md`.

## Перед изменением

Обязательно прочитать:

- `docs/CURRENT_STATE.md`;
- `docs/PRODUCT_STRATEGY.md`;
- `docs/PRODUCT_PRINCIPLES.md`;
- `docs/DESIGN_RESEARCH_AND_REQUIREMENTS.md`;
- `docs/DEVELOPMENT_RULES.md`;
- `docs/CODEX_QUALITY_PROTOCOL.md`;
- текущий release unit.

Если frontend change зависит от новой schema/API — сначала проверить, что contract существует и принят в текущем release scope.

## Пользовательский язык

Пользовательский и админский UI — русский.

Не выводить machine identifiers или необязательные английские labels.

Проверить весь изменённый flow на:

- кальку с английского;
- неоднозначные CTA;
- `trigger/replacement/outcome/reset/NRT/streak` и другие протёкшие технические термины;
- медицинский канцелярит;
- shame/manipulation copy.

## Craving flow

`Хочу закурить` — high-load scenario.

Правила:

- один очевидный primary action;
- минимум обязательных вводов;
- первый полезный ответ максимально быстро;
- длинные объяснения через progressive disclosure;
- referral/donation/marketing отсутствуют;
- network/secondary content не должны блокировать безопасный первый ответ.

## Business logic

Не дублировать decision/ranking/medical logic в React component, если она должна быть общей для будущих fronts.

Pure logic выносить в тестируемые функции/modules.

Frontend не придумывает медицинский текст при отсутствии Evidence content.

## Analytics

Новая значимая interaction должна иметь структурированное событие или явное решение, почему событие не нужно.

Не отправлять sensitive free text в generic analytics.

Quick log и craving help остаются разными действиями.

## States

Для затронутого flow проверить:

- loading;
- empty;
- error;
- success;
- retry;
- correction/delete, если применимо;
- mobile;
- desktop.

Не считать happy path достаточной проверкой.

## CSS

- не создавать global selector, способный случайно изменить другой frontend/admin surface;
- component/surface styles должны иметь явный scope;
- не добавлять визуальную сложность без product purpose;
- не полагаться только на цвет для значения.

## Accessibility

Минимум:

- semantic controls;
- accessible names;
- видимый focus;
- keyboard path там, где применимо;
- удобный размер интерактивных controls;
- цвет не является единственным сигналом.

## Проверки

После изменений из `app/` выполнить:

```bash
npm ci
npm run typecheck
npm run build
```

Если в `package.json` появился/существует test script — выполнить и его.

Для user-facing release, если доступен browser/Computer Use/Playwright, пройти реальный critical path в desktop и mobile viewport.

Если browser tool недоступен, записать `browser QA: НЕ ПРОВЕРЕНО`.

## Финальный review

Перед handoff проверить изменённый UI на:

- два competing primary CTA;
- англоязычный текст;
- непонятные термины;
- fake personalization;
- missing feedback;
- silent fallback;
- privacy leak;
- medical claim без Evidence Registry;
- layout regressions.
