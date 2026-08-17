# Релизная политика ALIVE

## 1. Каноническая история

- v2.7 — legacy production reference;
- v2.8 не является production release;
- новая runtime-линия начинается с v3.0;
- strategy/foundation release units могут существовать без изменения runtime SemVer.

Экспериментальный архив/ветка/ZIP не становится release только из-за имени.

## 2. Release unit

Каждое значимое изменение оформляется отдельным release unit с:

- purpose;
- strategy/hypothesis traceability;
- scope;
- changed modules/files;
- schema/methodology/model changes;
- validation;
- privacy/security checks where relevant;
- rollback/forward-fix;
- known limitations;
- release notes/handoff.

## 3. Documentation-only foundation

Разрешён отдельный documentation-only release unit, который:

- меняет strategy/methodology/contracts;
- не меняет runtime code;
- не меняет schema;
- не deployится как новая runtime version;
- служит foundation для следующих implementation releases.

Он всё равно требует branch, validation, rollback и draft PR.

## 4. Version discipline

Runtime version повышается только когда существует фактический runtime release milestone.

Нельзя:

- повышать version только из-за документа;
- создавать patch version для невыпущенной версии;
- объявлять deployment/release задним числом;
- смешивать methodology/model version и runtime app version.

Derived model versions (`Health Minutes`, `Intervention Ranking`, methodology и др.) имеют собственное versioning.

## 5. Документация release

Минимум по значимому release unit:

- scope/README;
- validation;
- rollback/forward-fix;
- current-state sync;
- AI prompt/response audit trail.

Runtime release дополнительно включает применимые:

- RELEASE_NOTES;
- TEST_REPORT;
- MIGRATION;
- DB/schema docs;
- privacy/security verification;
- integrity metadata для downloadable artifacts.

## 6. Database changes

Все migrations versioned в git.

Запрещено:

- вручную менять production schema без migration record;
- silent reinterpretation historical raw data;
- destructive migration без recovery path.

## 7. Methodology / metric / evidence changes

Изменения, меняющие смысл user-facing или derived data, требуют:

- новой model/methodology/evidence version where applicable;
- release note;
- compatibility/recompute decision;
- raw data сохранения;
- owner gate для medically significant coefficient/copy changes.

## 8. Product strategy traceability

Implementation release обязан отвечать:

- какую часть `PRODUCT_STRATEGY.md` реализует;
- какую hypothesis проверяет или какой обязательный foundation создаёт;
- какой outcome/metric должен измениться;
- что является acceptance gate.

Feature без понятной связи со стратегией не добавляется автоматически.

## 9. Brand assets

Утверждённый ALIVE/Om asset считается stable и не изменяется без прямого owner decision.

## 10. Rollback

До production deployment сохраняются:

- previous known-good commit/tag;
- DB rollback или documented forward-fix strategy;
- safe config snapshot без secrets;
- deployment rollback procedure.

Documentation-only release откатывается revert commit/PR и не требует runtime rollback.

## 11. Release gate

Нельзя считать release готовым по syntax/build check.

Проверять применимое:

- functional acceptance;
- product-strategy consistency;
- privacy/tenant isolation;
- data integrity;
- responsive UI;
- no frontend secrets;
- evidence/content integrity;
- documentation consistency;
- rollback.

## 12. AI-generated releases

AI не должен самостоятельно:

- повышать version;
- объявлять production deployment;
- менять product/evidence coefficients без owner gate;
- merge PR.

AI обязан оставить handoff с branch, PR, validation и open gates.
