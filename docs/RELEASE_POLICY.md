# Релизная политика ALIVE

## 1. Каноническая история

- v2.7 — последняя legacy production reference;
- v2.8 не является production release;
- новая продуктовая серия начинается с v3.0.

Экспериментальные локальные архивы не становятся релизами только потому, что получили имя ZIP.

## 2. Release unit

Каждое значимое изменение оформляется как отдельный release unit с:

- scope;
- changed files/modules;
- schema/methodology changes;
- validation;
- privacy/security checks;
- rollback;
- known limitations;
- release notes.

## 3. SemVer-like дисциплина

На раннем этапе:

- `3.0` — platform/core-loop milestone;
- `3.1` — Together milestone;
- `3.2` — Admin/Intelligence milestone;
- patch version (`3.0.1`) допускается только для фактически выпущенного `3.0`.

Нельзя создавать `3.0.1`, если `3.0` не был принят/выпущен.

## 4. Документация релиза

Минимум:

- `README.md`;
- `RELEASE_NOTES.md`;
- `VALIDATION.md`;
- `ROLLBACK.md`;
- `INTEGRITY.md` при downloadable artifact;
- `MIGRATION.md` при schema/data migration;
- обновление `CURRENT_STATE.md`.

Для v3 platform дополнительно:

- `ARCHITECTURE.md`;
- `DB_SCHEMA.md`;
- `PRIVACY.md`/ссылка на канонический privacy contract;
- `TEST_REPORT.md`.

## 5. Database changes

Все migrations versioned в git.

Запрещено:

- вручную менять production schema без migration record;
- silent reinterpretation historical data;
- destructive migration без backup/rollback.

## 6. Methodology changes

Изменения, меняющие смысл метрик/модели:

- новая methodology/equivalence version;
- release note;
- пересчёт derived projections допустим;
- raw data не переписывается.

## 7. Brand assets

Утверждённый Om-logo считается immutable asset между релизами, если владелец явно не запросил изменение.

## 8. Rollback

До production deployment сохраняются:

- previous git tag/commit;
- DB migration rollback или forward-fix strategy;
- config snapshot без секретов;
- deployment rollback procedure.

## 9. Release gate

Нельзя считать релиз готовым только по syntax check.

Минимально проверять:

- functional acceptance;
- privacy/tenant isolation;
- critical data integrity;
- responsive UI;
- no frontend secrets;
- documentation consistency.

## 10. AI-generated releases

AI не должен самостоятельно повышать версию или объявлять production deployment состоявшимся без фактического подтверждения.
