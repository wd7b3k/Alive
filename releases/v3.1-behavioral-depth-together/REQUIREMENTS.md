# Требования ALIVE v3.1

## Product

- [x] Сохранить product formula `импульс → контекст → потребность → альтернативный ответ → результат → обучение`.
- [x] Не переделывать утверждённую visual language v3.0 с нуля.
- [x] Весь новый user-facing copy на русском.
- [x] CTA для сигарет `Хочу закурить`, для vape `Хочу затянуться`, для hookah `Хочу покурить кальян`.
- [x] Новые заголовки без завершающих точек.

## Evidence

- [x] Отдельный nicotine cessation review.
- [x] Отдельный Myths / outcome expectancies review.
- [x] Medical statements source-linked.
- [x] Не использовать population evidence как personal medical prediction.
- [x] Разделять cessation evidence, acute-state evidence и ALIVE heuristic.

## Замены

- [x] Расширить каталог минимум до grounding, breathing, attention, movement, pause, oral, manual, food, drink, focus, reflection, social, context change, meaning, reward, evidence treatment.
- [x] Пищевой каталог не ограничивается фруктом/кефиром.
- [x] Перенести простые HumanOS patterns без заявления, что они являются доказанной cessation therapy.
- [x] Ranking выбирает по возможности 3 разных механизма.
- [x] Personal outcomes участвуют в ranking.

## Guided flow

- [x] Явный `Шаг N из M`.
- [x] Заметный progress bar.
- [x] Завершённые шаги кликабельны.
- [x] Изменение product/trigger/need пересчитывает dependent selection.
- [x] Contextual Myth не чаще одного в коротком flow.

## Мифы

- [x] Versioned catalog entity.
- [x] Private user relevance state.
- [x] Минимум: stress relief, concentration, pause, coffee, after meal, style, social, low-dose smoking, light, hookah, vape, NRT, weight, too late, lapse reset, control, stressful period, pleasure, anxiety.
- [x] `Похоже на меня` / `Не про меня`.
- [x] No shame language.

## Факты

- [x] Versioned catalog entity.
- [x] Общий каталог работает без личного medical profile.
- [x] Риски и benefits чередуются.
- [x] У каждой карточки есть source URL.
- [x] Нет fabricated individual risk.

## Onboarding

- [x] Optional regular-smoking start year для cigarettes.
- [x] Pack-years используется только справочно и только для cigarettes.
- [x] Vape/hookah не конвертируются в pack-years через ALIVE units.

## Lapse

- [x] Один эпизод ничего не обнуляет.
- [x] Context disruption встроен в guided/quick flow.
- [x] Driving: сначала безопасная остановка, никогда не курение за рулём.
- [x] Observation не оптимизирует глубину/длительность/число затяжек.

## Вместе

- [x] Отдельный раздел основного меню.
- [x] Personal baseline comparison выше группового сравнения.
- [x] Aggregate participant/activity/episode/replacement metrics.
- [x] No leaderboard.
- [x] No raw private text or user identifiers in group endpoint.
- [x] Small cohort suppression минимум 3.
- [x] Mechanism aggregates only above privacy threshold.

## Security

- [x] RLS enabled on new exposed tables.
- [x] Explicit grants for Data API tables.
- [x] `user_myth_state` private by user_id.
- [x] Together SECURITY DEFINER has `search_path=''`, auth check and narrow EXECUTE grants.
- [x] Together API returns aggregates only.

## Logo

- [x] Approved asset preserved and not regenerated.
- [x] Active entrypoint explicitly imports v3.1 CSS logo hardening.
- [ ] Production deployment asset/network/rendering verified.

## Validation

- [x] Supabase migrations applied.
- [x] Catalog counts verified.
- [x] RLS verified.
- [x] Together aggregate privacy smoke-test passed.
- [ ] Frontend typecheck passes.
- [ ] Production build passes.
- [ ] Mobile smoke-test passes.
- [ ] Authenticated runtime smoke-test passes.
- [ ] Production logo smoke-test passes.
