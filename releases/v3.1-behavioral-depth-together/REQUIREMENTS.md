# Требования ALIVE v3.1

## Product

- [x] Сохранить formula `импульс → контекст → потребность → альтернативный ответ → результат → обучение`.
- [x] Сохранить утверждённый visual language v3.0.
- [x] Оставить `RedesignApp` root и `redesign.css` base design system.
- [x] Не подключать параллельный `V31App`/`v31.css`.
- [x] Сохранить четыре главных раздела и весь baseline v3.0.
- [x] Весь новый user-facing copy на русском.
- [x] CTA: `Хочу закурить` / `Хочу затянуться` / `Хочу покурить кальян`.
- [x] При нескольких продуктах пользователь явно выбирает один основной; порядок rows БД не влияет на CTA.
- [x] Старый неоднозначный profile показывает нейтральный `Разобрать тягу`, а не случайный продукт.
- [x] Preview badge, fallback labels и user-facing errors отображаются по-русски.

## Evidence

- [x] Отдельные nicotine cessation и Myths/outcome expectancies reviews.
- [x] Medical statements source-linked.
- [x] Population evidence не используется как personal medical prediction.
- [x] Разделены cessation evidence, acute-state evidence и ALIVE heuristic.

## Замены

- [x] Каталог содержит 75 published items и 18 mechanisms.
- [x] Ranking учитывает product, trigger, need, context, intensity, history и recent repetition.
- [x] Personal outcomes участвуют в ranking.
- [x] Top-3 по возможности состоят из разных mechanisms.
- [x] Food/NRT/product eligibility v3.0 сохранены.

## Guided flow

- [x] Явный `Шаг N из M` и заметный progress bar.
- [x] Сила тяги — отдельный шаг.
- [x] Достигнутые шаги кликабельны.
- [x] Изменение product/trigger/strength/need инвалидирует downstream state.
- [x] Изменение Replacement сбрасывает result.
- [x] Contextual Myth появляется не чаще одного раза за короткий flow.
- [ ] Authenticated end-to-end interaction/save regression подтверждён владельцем.

## Мифы и факты

- [x] Versioned catalogs и private user relevance state.
- [x] `Похоже на меня` / `Не про меня` без shame language.
- [x] Вторичный `/facts` route не вытесняет четыре главных раздела.
- [x] `Факты и мифы` видимы в desktop/mobile header, Today и Profile.
- [x] Facts чередуют risks/benefits, показывают evidence level и source URL.
- [x] Knowledge loading failure изолирован от v3.0 bootstrap.
- [ ] Owner review медицински значимого user-facing copy.

## Onboarding и lapse

- [x] Optional regular-smoking start year только для cigarettes.
- [x] Existing users не проходят onboarding заново.
- [x] Pack-years только справочно для cigarettes.
- [x] Vape/hookah не конвертируются в pack-years.
- [x] Nicotine use остаётся фактом, а не Replacement.
- [x] Context disruption встроен в guided/quick flow.
- [x] Driving copy требует сначала безопасно остановиться; курение за рулём не предлагается.
- [x] Один эпизод ничего не обнуляет.

## Вместе

- [x] Вторичный route/entry point добавлен без расширения четырёхэлементной mobile bottom navigation.
- [x] Personal baseline comparison расположен выше группового сравнения.
- [x] Aggregate participant/activity/episode/replacement metrics.
- [x] Нет leaderboard, raw private text, names или user identifiers.
- [x] Small cohort suppression минимум 3.
- [x] Mechanism aggregates дополнительно фильтруются по privacy threshold.
- [ ] Authenticated suppressed/evaluable UI states проверены на preview.

## Security

- [x] RLS enabled on new exposed tables.
- [x] Explicit grants for Data API tables.
- [x] `user_myth_state` private by `user_id`.
- [x] Together privileged function hardening и narrow grants.
- [x] Together API возвращает aggregates only.
- [ ] Client-level isolation проверен со вторым реальным/test account.

## Logo

- [x] Владелец прямо утвердил приложенный PNG.
- [x] Exact bytes сохранены без обработки.
- [x] SHA-256: `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`.
- [x] `RedesignApp` использует bundled asset; изменяется только CSS display size.
- [x] Login, desktop authenticated header и mobile authenticated header подтверждены владельцем.
- [x] Standalone methodology page проверена на branch preview.
- [ ] Production deployment не выполнялся и не должен выполняться в draft PR.

## Validation

- [x] Supabase migrations, catalog counts, RLS и Together privacy smoke.
- [x] UI contract PASS.
- [x] TypeScript typecheck PASS.
- [x] Vite production build PASS.
- [x] Public preview desktop/mobile/tablet smoke PASS.
- [x] Cloudflare branch preview доступен.
- [ ] Полная authenticated regression matrix PASS.
- [ ] Full responsive authenticated matrix 390/430/768–820/1280/1440+ PASS.
- [ ] Final owner visual approval всего RC.
