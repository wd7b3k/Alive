# Active Release Control

Этот файл — короткая оперативная точка входа: **что сейчас доводим, что зафиксировано, куда класть новые идеи и когда открывается следующий этап**.

Он не заменяет `docs/CURRENT_STATE.md`, `docs/ROADMAP.md` или release documentation.

## Активный release

- release: `4.0.0-alpha.1`
- runtime branch: `agent/v4.0.0-alpha.1`
- release contract: `releases/v4.0.0-alpha.1/IMPLEMENTATION_PLAN.md`
- requirements: `releases/v4.0.0-alpha.1/REQUIREMENTS.md`
- status: **IN DEVELOPMENT / DRAFT PR**
- scope state: **FROZEN FOR DELIVERY**

## Что означает FROZEN FOR DELIVERY

Freeze не запрещает владельцу придумывать новые функции, менять видение или обсуждать будущий продукт.

Freeze означает только одно:

> новая идея не меняет текущий implementation scope автоматически.

Во время freeze новая вводная классифицируется агентом как одно из:

- `BLOCKER` — без неё текущий release нельзя корректно принять;
- `SCOPE CORRECTION` — обнаружено, что зафиксированный контракт неверен или неполон;
- `BACKLOG` — ценная идея, не нужная для текущего gate;
- `ROADMAP` — место идеи в следующих этапах уже достаточно понятно;
- `RESEARCH` — сначала нужны данные/исследование.

`BLOCKER` и `SCOPE CORRECTION` могут разморозить часть контракта только с явной записью причины и обновлением implementation plan.

## Текущий gate

Следующий минимальный delivery gate по состоянию `4.0.0-alpha.1`:

1. authenticated canonical browser E2E на desktop/mobile;
2. authenticated `/admin` проверка;
3. PostgREST/Auth transport E2E;
4. перед любым remote migration — historical data preflight и hosted Supabase advisors;
5. только после фактического PASS обязательного cigarette vertical slice решать расширение runtime scope.

Не считать релиз готовым по одному build/CI.

## Что не расширяет alpha.1 автоматически

Любые новые продуктовые идеи, которые не нужны для закрытия текущего acceptance gate, сохраняются в `docs/PRODUCT_BACKLOG.md` или `docs/ROADMAP.md`.

Агент обязан сделать это сам и коротко сообщить владельцу, куда именно идея попала.

## Когда агент обязан предложить новый freeze

После закрытия текущего gate агент:

1. сверяет фактический результат с Definition of Done;
2. открывает `docs/PRODUCT_BACKLOG.md`;
3. сверяет следующий этап `docs/ROADMAP.md`;
4. поднимает релевантные результаты исследований и пользовательских данных;
5. предлагает владельцу короткий следующий release contract:
   - цель;
   - scope;
   - invariants;
   - acceptance criteria;
   - non-goals;
6. явно предлагает: **FREEZE / изменить scope / отложить**;
7. после owner decision фиксирует новый contract в git и только затем начинает реализацию.

## Правило одного активного delivery scope

По умолчанию ALIVE имеет один основной активный user-facing delivery scope.

Допустимы параллельные независимые работы только когда они не конкурируют за один и тот же контракт и не создают неоднозначный baseline, например отдельное исследование или чисто инфраструктурная проверка.

Если параллельная ветка меняет те же пользовательские сущности, schema или UX, агент обязан сначала предложить порядок интеграции, а не создавать ещё одну конкурирующую реализацию.

## Следующий backlog review

Триггер: **после закрытия authenticated canonical browser gate `4.0.0-alpha.1` либо при выявлении blocker/scope correction раньше**.
