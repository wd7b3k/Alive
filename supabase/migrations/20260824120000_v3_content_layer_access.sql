-- Открыть доступ к контентному слою, который уже лежит в проде.
--
-- Что обнаружено 2026-08-24 интроспекцией прода (только select, ничего не писалось):
-- в базе давно живёт полноценная подсистема контента, которой не было в репозитории —
-- facts_catalog (19), myths_catalog (19), goals_catalog (18), awareness_content (18),
-- awareness_content_contexts (19), evidence_claims (18), evidence_claim_sources (18),
-- evidence_sources (18). Это и есть задел под «Факты», о котором говорил владелец.
--
-- Ни одна строка из этого не доходит до человека. Причина не в приложении:
--   * facts_catalog, myths_catalog — RLS включён, политик НЕТ вообще, anon не выдан
--     даже select. То есть таблицы закрыты наглухо для обеих ролей.
--   * goals_catalog — RLS включён, политик нет.
--   * awareness_content, awareness_content_contexts, evidence_claims,
--     evidence_claim_sources, evidence_sources — есть по одной политике на select и
--     только для authenticated. До входа не читается ничего.
--   * user_goals, user_awareness_state, user_myth_state — политики по своему user_id
--     есть, но гранты выданы вперемешку, часть ролей осталась без select.
--
-- Отдельно: на большинстве этих таблиц роли anon и authenticated имеют гранты
-- INSERT / UPDATE / DELETE / TRUNCATE. Прямо сейчас записи не проходят только потому,
-- что RLS включён и разрешающих политик на запись нет — то есть единственное, что
-- отделяет анонимного посетителя от TRUNCATE редакционного каталога, это отсутствие
-- одной строки в pg_policies. Так оставлять нельзя: гранты снимаются здесь явно.
--
-- Миграция ничего не создаёт и не удаляет — только права. Контент прод считается
-- истиной и остаётся на месте.

-- ---------------------------------------------------------------------------
-- 1. Снять лишние права записи с клиентских ролей
-- ---------------------------------------------------------------------------
-- revoke на роль, у которой права нет, — не ошибка, так что это безопасно
-- прогонять повторно.
do $$
declare
  t text;
begin
  foreach t in array array[
    'facts_catalog', 'myths_catalog', 'goals_catalog',
    'awareness_content', 'awareness_content_contexts',
    'evidence_claims', 'evidence_claim_sources', 'evidence_sources'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;

  -- Пользовательские таблицы: anon здесь не нужен вообще, у него нет user_id.
  foreach t in array array['user_goals', 'user_awareness_state', 'user_myth_state'] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Редакционный контент: читают все, включая экран до входа
-- ---------------------------------------------------------------------------
-- Раздел «Факты» — одна из вещей, которую посетитель должен увидеть до регистрации,
-- поэтому anon читает тот же набор, что и вошедший. Персональных данных здесь нет.
-- Условие published = true оставляет редактору возможность держать черновик в базе.
-- Старые имена политик снимаются явно. 20260816211000 создал
-- facts_catalog_read_published и myths_catalog_read_published для authenticated; если
-- их не удалить, на таблице останутся две разрешающие политики с одинаковым условием.
-- Работать будет, но следующий человек, который придёт менять доступ, будет править
-- одну из двух и не понимать, почему ничего не изменилось.
alter table public.facts_catalog enable row level security;
drop policy if exists facts_catalog_read_published on public.facts_catalog;
drop policy if exists facts_catalog_read on public.facts_catalog;
create policy facts_catalog_read on public.facts_catalog
  for select to anon, authenticated using (published = true);

alter table public.myths_catalog enable row level security;
drop policy if exists myths_catalog_read_published on public.myths_catalog;
drop policy if exists myths_catalog_read on public.myths_catalog;
create policy myths_catalog_read on public.myths_catalog
  for select to anon, authenticated using (published = true);

alter table public.goals_catalog enable row level security;
drop policy if exists goals_catalog_read on public.goals_catalog;
create policy goals_catalog_read on public.goals_catalog
  for select to anon, authenticated using (published = true);

-- Слой микроосознанности и доказательная база под ним. Политики на эти таблицы уже
-- были, но только для authenticated — пересоздаём с anon, чтобы первый экран мог
-- показать карточку с источником.
alter table public.awareness_content enable row level security;
drop policy if exists awareness_content_read on public.awareness_content;
create policy awareness_content_read on public.awareness_content
  for select to anon, authenticated using (published = true);

alter table public.awareness_content_contexts enable row level security;
drop policy if exists awareness_content_contexts_read on public.awareness_content_contexts;
create policy awareness_content_contexts_read on public.awareness_content_contexts
  for select to anon, authenticated using (true);

alter table public.evidence_claims enable row level security;
drop policy if exists evidence_claims_read on public.evidence_claims;
create policy evidence_claims_read on public.evidence_claims
  for select to anon, authenticated using (true);

alter table public.evidence_claim_sources enable row level security;
drop policy if exists evidence_claim_sources_read on public.evidence_claim_sources;
create policy evidence_claim_sources_read on public.evidence_claim_sources
  for select to anon, authenticated using (true);

-- Библиография. Без неё карточка показывает утверждение о здоровье без источника,
-- а это ровно то, чего раздел «Факты» делать не должен.
alter table public.evidence_sources enable row level security;
drop policy if exists evidence_sources_read on public.evidence_sources;
create policy evidence_sources_read on public.evidence_sources
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 3. Пользовательское состояние: только своё
-- ---------------------------------------------------------------------------
-- Политики с таким смыслом в проде уже есть; пересоздаются явно, чтобы условие было
-- записано в репозитории, а не только в базе, и чтобы файл был самодостаточным.
alter table public.user_goals enable row level security;
drop policy if exists user_goals_own on public.user_goals;
create policy user_goals_own on public.user_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_awareness_state enable row level security;
drop policy if exists user_awareness_state_own on public.user_awareness_state;
create policy user_awareness_state_own on public.user_awareness_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.user_myth_state enable row level security;
drop policy if exists user_myth_state_own on public.user_myth_state;
drop policy if exists user_myth_state_select_own on public.user_myth_state;
drop policy if exists user_myth_state_insert_own on public.user_myth_state;
drop policy if exists user_myth_state_update_own on public.user_myth_state;
drop policy if exists user_myth_state_delete_own on public.user_myth_state;
create policy user_myth_state_own on public.user_myth_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
