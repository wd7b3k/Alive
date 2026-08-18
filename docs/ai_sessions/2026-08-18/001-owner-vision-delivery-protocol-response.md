# Response — owner vision / delivery protocol

Дата: 2026-08-18

## Результат

Создан постоянный operating protocol, который позволяет владельцу продолжать формулировать product vision свободно и разговорно, а агенту — самому превращать его в последовательный delivery process.

## Branch / PR

- base: `agent/v4.0.0-alpha.1`
- branch: `agent/owner-vision-delivery-protocol`
- draft PR: `#9` — `ALIVE: owner vision and delivery protocol`

## Изменённые сущности

### `docs/AGENT_CONTINUITY.md`

Добавлены обязательные правила:

- owner не обязан писать инженерное ТЗ;
- агент сам формирует `GOAL / SCOPE / INVARIANTS / ACCEPTANCE / NON-GOALS`;
- новые идеи классифицируются как `BLOCKER / SCOPE CORRECTION / CURRENT SCOPE / BACKLOG / ROADMAP / RESEARCH`;
- агент сам предлагает момент freeze;
- freeze ограничивает delivery scope, но не product vision;
- backlog обязан иметь revisit gate;
- после каждого значимого release gate агент возвращается к backlog;
- существующее подтверждённое поведение сохраняется как invariant, если текущий contract не требует его изменения;
- запрещены лишние parallel shells/workarounds, которые ломают существующую функциональность;
- агент минимизирует уточняющие вопросы и не просит владельца заново пересказывать project history;
- основной цикл: `Product vision → triage → release contract → owner freeze → implementation → verification → Definition of Done → backlog review → следующий proposed freeze`.

### `docs/PRODUCT_BACKLOG.md`

Создан живой backlog с:

- разделением backlog / roadmap / active release;
- статусами `INBOX / TRIAGED / READY / RESEARCH / PROMOTED / DROPPED`;
- обязательным полем `revisit-gate`;
- правилом review перед новым freeze и после ключевого gate;
- защитой одновременно от ограничения vision и от scope creep.

На момент создания отдельные крупные идеи последних итераций уже распределены по roadmap, поэтому новый backlog не дублирует их и начинает работу как очередь для следующих несcheduled идей.

### `docs/ACTIVE_RELEASE.md`

Создана оперативная точка контроля текущего delivery:

- активный release: `4.0.0-alpha.1`;
- runtime branch: `agent/v4.0.0-alpha.1`;
- scope state: `FROZEN FOR DELIVERY`;
- новые идеи не расширяют alpha.1 автоматически;
- текущий ближайший gate — authenticated canonical browser E2E desktop/mobile и `/admin`, затем transport/remote DB preflight;
- следующий backlog review — после закрытия authenticated canonical browser gate либо раньше при blocker/scope correction.

## Validation

- `PASS` — новая branch создана от текущей active branch `agent/v4.0.0-alpha.1`;
- `PASS` — compare с base до audit-response показывал только documentation changes;
- `PASS` — runtime/schema/migrations/CI config не изменялись;
- `PASS` — `AGENT_CONTINUITY.md` уже входит в обязательный context-loading path root `AGENTS.md`, поэтому новый протокол становится частью обязательного continuity для следующего агента;
- `PASS` — создан draft PR #9;
- `НЕ ПРОВЕРЕНО` — автоматический markdown/link lint отсутствует как отдельный gate для этой docs-only правки.

## Runtime impact

Нет.

## Open gate

PR #9 остаётся draft. После owner acceptance его нужно интегрировать в активную линию разработки до следующего significant product task, чтобы новый protocol применялся не только в этой ветке.
