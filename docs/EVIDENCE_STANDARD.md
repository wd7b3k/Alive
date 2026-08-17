# ALIVE — стандарт доказательности и медицинского контента

## 1. Назначение

Этот документ задаёт правила, по которым ALIVE отличает доказанный факт от эвристики и собственной гипотезы.

Он обязателен для:

- Фактов;
- Мифов;
- treatment-support copy;
- Health Minutes;
- health milestones;
- медицински значимых onboarding/notification messages;
- LLM-assisted content.

## 2. Классы знания

### E1 — Established / high-confidence evidence

Качественные clinical guidelines, systematic reviews/meta-analyses и другие сильные согласующиеся источники.

### E2 — Moderate evidence

Достаточно надёжные, но более ограниченные данные.

### E3 — Preliminary / uncertain evidence

Перспективные, ограниченные или неоднозначные данные.

### H — ALIVE heuristic

Условная модель для понятного UX/аналитики, не претендующая на медицинскую эквивалентность.

Примеры: behavioural normalization, versioned Time/Health calculations.

### P — ALIVE product hypothesis

Собственная проверяемая гипотеза продукта.

Примеры: micro-awareness effect, Fact+Goal synergy, expectation→outcome mechanism.

## 3. Приоритет источников

Для medically significant claims предпочитать:

1. актуальные международные/национальные clinical guidelines и public-health authorities;
2. Cochrane/systematic reviews/meta-analyses;
3. крупные RCT/strong primary studies;
4. качественные observational studies для вопросов, где RCT невозможны;
5. expert/secondary sources только как дополнительное объяснение.

Текущие рекомендации/регуляторные статусы всегда проверяются заново перед изменением production copy.

## 4. Evidence claim

Каждый значимый claim должен хранить минимум:

- canonical statement;
- topic;
- source(s);
- source type;
- population/context;
- effect/meaning;
- evidence class;
- limitations;
- reviewed_at;
- status/version.

## 5. Approved user copy

Пользовательская формулировка может быть проще scientific claim, но не должна:

- усиливать причинность;
- скрывать uncertainty;
- обобщать данные на неподходящую population;
- превращать group average в персональный прогноз;
- менять относительный риск на абсолютный без основания;
- выдавать proxy за health outcome.

## 6. Facts

Fact используется только если:

- связан с approved evidence claim;
- не просрочен по review policy;
- wording соответствует evidence class;
- context не делает claim вводящим в заблуждение.

## 7. Myths

Myth должен разделять:

- распространённое утверждение;
- evidence-backed correction;
- personal observation/hypothesis.

Нельзя маркировать индивидуальную мысль пользователя как ложь только потому, что она не совпадает с шаблоном ALIVE.

## 8. Treatment Support

ALIVE может информировать о доказанных cessation approaches, но production copy не должна превращаться в индивидуальное назначение.

Не генерировать автоматически:

- дозировку;
- схему приёма;
- противопоказания применительно к конкретному человеку без trusted medical source/workflow;
- персональный medical diagnosis.

## 9. Health Minutes

Health Minutes — `H` (эвристика), даже если коэффициент основан на published population evidence.

Обязательные свойства:

- символ/слово приблизительности;
- model version;
- source/version;
- covered product types;
- explanation that this is not individual life expectancy prediction.

Нельзя выводить Health Minutes для vape/hookah через cigarette-equivalent behavioural units без отдельной defensible model.

## 10. ALIVE units

Если остаются в продукте, относятся к `H`.

Они не являются:

- nicotine equivalence;
- toxic exposure equivalence;
- disease risk equivalence;
- Health Minutes equivalence.

## 11. AI rules

LLM может:

- упростить approved text;
- выбрать релевантный approved content;
- суммировать approved evidence;
- объяснить limitations.

LLM не может:

- создать production medical claim без Evidence Registry;
- повышать evidence class;
- скрывать uncertainty;
- самостоятельно обновлять source/version;
- выдавать model prior за доказанный персональный эффект.

## 12. Content release gate

Перед публикацией materially new health claim проверяются:

- источник;
- актуальность;
- evidence class;
- wording;
- limitations;
- product-specific applicability;
- UI context;
- source link/reference;
- rollback/versioning.

## 13. Review cadence

Для claims должна существовать policy review date или review trigger.

Триггеры вне графика:

- новая clinical guideline;
- крупный systematic review;
- regulatory change;
- owner/medical-review concern;
- обнаруженная ошибка/misleading copy.

## 14. Evidence transparency в UX

Пользователь не обязан видеть bibliographic detail всегда, но должен иметь возможность открыть:

- откуда информация;
- насколько она уверенная;
- что именно означает;
- где ALIVE использует эвристику.

## 15. Hypothesis promotion

Product hypothesis нельзя превращать в «метод ALIVE доказан» по результатам нескольких пользователей.

Promotion требует заранее определённого evidence gate и documented decision.
