-- Two content fixes the owner decided on 2026-08-22.
--
-- 1. "Напряжение / сложная мысль" had no curated replacements at all.
--
-- Found during the live QA pass: `tension` is one of the most common real smoking
-- triggers, but carried zero rows in trigger_replacement_map. pickReplacements
-- (app/src/data.ts) cascades [...mapped, ...need-matched, ...all], so the flow did not
-- break — the person still got three cards — but they were matched on need alone,
-- silently skipping the situation-specific curation the product promises. `after_task`
-- had the same gap.
--
-- The owner's instruction was to curate these ("подышать и ещё что-то"). No new
-- replacement content is invented here: the mappings point at replacements that
-- already exist in the catalog, chosen to match how this trigger actually works —
-- tension asks for discharge, not distraction. The tiers mirror the existing
-- convention (fast → immediate physiological, deeper → a longer reset, meaning → the
-- personal "why"), and the shape follows the neighbouring `anxiety` mapping so the
-- catalog stays internally consistent.
--
-- tension: breathing first (the owner's "подышать"), then releasing the muscle
-- tension the trigger is named after, then movement, then meaning.
-- after_task: the need at a finished task is closure, so mark the ending and step away
-- from the screen rather than reach for a stimulant.
insert into public.trigger_replacement_map (trigger_code,replacement_code,tier,priority)
values
  ('tension','five_long_exhales','fast',1),
  ('tension','shoulder_release','fast',2),
  ('tension','press_release','deeper',3),
  ('tension','walk_two_minutes','deeper',4),
  ('tension','meaning_card','meaning',5),
  ('after_task','savor_result','fast',1),
  ('after_task','phone_down_pause','deeper',2),
  ('after_task','walk_two_minutes','deeper',3),
  ('after_task','one_line_conclusion','deeper',4),
  ('after_task','meaning_card','meaning',5)
on conflict (trigger_code, replacement_code) do update
  set tier = excluded.tier, priority = excluded.priority;

-- `other` ("Другое") is intentionally left unmapped: it is the catch-all for a
-- situation the person could not name, so there is no situation to curate for. It
-- falls back to need-based matching by design, not by omission.

-- 2. Two replacements carried the same title in production.
--
-- Renaming the terminology from "Смыслы" to "Зачем" collapsed `meaning_read` and
-- `meaning_card` into one name — "Прочитать своё «Зачем»" — so a person could be
-- shown two visually identical cards in the same set of three suggestions. They are
-- genuinely different actions, so they get names that say which is which rather than
-- one being deleted: meaning_read opens the whole list of personal reasons,
-- meaning_card is the shorter "one formulation that resonates today".
update public.replacements_catalog
   set title = 'Перечитать своё «Зачем»',
       short_action_ru = 'Вернуться к личной причине не идти за автоматическим импульсом.'
 where code = 'meaning_read';

update public.replacements_catalog
   set title = 'Одна опора из «Зачем»',
       short_action_ru = 'Вернуться от короткого импульса к выбранной жизни.'
 where code = 'meaning_card';
