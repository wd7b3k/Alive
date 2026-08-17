# Запрос владельца

Реализовать первый пользовательский release новой серии:

**ALIVE `4.0.0-alpha.1`**

Execution mode: Direct GitHub Mode через connected GitHub repository `wd7b3k/Alive`.

Base/target:

- `agent/r1-data-evidence-admin`;
- `agent/v4.0.0-alpha.1`.

Обязательные условия:

- сначала полностью заполнить `IMPLEMENTATION_PLAN.md`;
- первым реализовать и фактически проверить canonical slice: сигарета после еды → `Хочу закурить` → контекст → approved Fact/Myth/Зачем → действие → outcome → Time/Money/≈Health Minutes → learning → admin analytics;
- не расширять scope на vape/hookah до фактического E2E PASS;
- deterministic engine без LLM;
- Health Minutes только для сигарет;
- quick log не считать craving help;
- private Зачем/Связки/notes не отправлять в generic analytics;
- medical copy только из Evidence Registry;
- добавить automated tests;
- выполнить programmatic gates, browser desktop/mobile, adversarial self-review и independent review, если доступны;
- обновить documentation/audit/CURRENT_STATE;
- создать draft PR и не merge.
