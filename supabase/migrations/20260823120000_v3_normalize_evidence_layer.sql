-- Normalizes the evidence layer that already exists in production but is stored in a
-- shape nothing can query, and that no screen has ever shown.
--
-- Owner instruction 2026-08-23, on being shown that `replacements_catalog` already
-- carries evidence_level / evidence_scope / source_title / source_url with real PubMed
-- and WHO references while the interface displays none of it: «Это и есть база под
-- такие разделы, нормализуй их и продумай, как их добавить в сценарии».
--
-- Three concrete defects in the current shape:
--
-- 1. Sources are free text repeated per row. Fourteen of the 74 replacements cite a
--    source, but between them there are only THREE distinct sources — the title and
--    URL are copy-pasted onto every row that cites them. Nothing can list "everything
--    that rests on the WHO guideline", and a corrected URL would have to be fixed in
--    every copy or the catalog would disagree with itself.
--
-- 2. evidence_level and mechanism are stored TWICE: as real columns and again inside
--    the `eligibility` jsonb. Today both copies agree. Nothing enforces that, and the
--    two are written by different code paths, so they will eventually disagree
--    silently and the interface would show whichever one it happened to read.
--
-- 3. The A/B/C levels have no definition anywhere. They mean something specific in
--    this data — see evidence_levels below — but that meaning lives only in whoever
--    assigned them. A level shown to a user without its definition is worse than no
--    level: "B" reads as a grade rather than as "studied, but not for quitting".
--
-- What this migration deliberately does NOT do:
--
-- * it does not drop or rewrite a single production column. `eligibility`,
--   `evidence_level`, `source_title` and `source_url` all stay exactly as they are.
--   Production is the source of truth (owner decision 2026-08-21) and the running
--   frontend reads those columns today. Normalizing means adding a queryable
--   structure alongside and backfilling it FROM production values, not replacing
--   them. Retiring the duplicates is a separate, reviewable change that must come
--   after the interface stops reading them.
-- * it does not invent a single fact, level, scope statement or citation. Every value
--   inserted below is copied verbatim from what is already in production. The two
--   PubMed identifiers and the WHO document are the owner's existing curation.
-- * it adds no facts and no myths. Those are their own catalogs, in their own
--   migration, with their own content review.

-- ---------------------------------------------------------------------------
-- What A / B / C actually mean in this catalog
-- ---------------------------------------------------------------------------
-- These definitions are not a new grading scheme. They are read off how the existing
-- 74 rows use the levels, cross-checked against their own evidence_scope text:
--
--   A (2 rows: nrt_gum, nrt_spray)
--      scope: «Доказательный инструмент прекращения курения; ALIVE не назначает
--      дозировки» — cited to the WHO clinical treatment guideline. The claim is about
--      quitting itself, and it rests on a clinical guideline.
--
--   B (9 rows: movement and breathing)
--      scope: «Есть данные по кратковременному снижению тяги; не самостоятельная
--      гарантия отказа» and «Поддержка состояния/arousal; long-term smoking cessation
--      outcome не установлен». Research exists, but it is about the state in the
--      moment — craving intensity, arousal — and explicitly not about quitting.
--
--   C (63 rows)
--      No study is cited. These are ALIVE's own heuristics, several of them adapted
--      from HumanOS. They are honest product design, not evidence.
--
-- The distinction the interface has to preserve is the one between A and B: both have
-- a real citation, and it would be easy to present them as equally "backed". They are
-- not. B is studied for the wrong outcome, and saying so is the whole point.
create table if not exists public.evidence_levels (
  code text primary key,
  rank smallint not null,
  label_ru text not null,
  claim_ru text not null,
  limit_ru text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.evidence_levels (code, rank, label_ru, claim_ru, limit_ru, sort_order) values
  ('A', 1, 'Клиническое руководство',
   'Инструмент с доказанным влиянием на сам отказ от курения.',
   'ALIVE не назначает дозировку и не заменяет консультацию специалиста.', 10),
  ('B', 2, 'Есть исследования по состоянию',
   'Есть данные о кратковременном эффекте: тяга в моменте, напряжение, возбуждение.',
   'Это не доказательство того, что действие помогает бросить. Долгосрочный эффект на отказ не установлен.', 20),
  ('C', 3, 'Эвристика ALIVE',
   'Приём, собранный из практики и здравого смысла продукта.',
   'Исследованием не проверен. Работает или нет — покажет твоя собственная статистика в разделе «Путь».', 30)
on conflict (code) do update
  set rank = excluded.rank,
      label_ru = excluded.label_ru,
      claim_ru = excluded.claim_ru,
      limit_ru = excluded.limit_ru,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Sources, once each instead of once per citing row
-- ---------------------------------------------------------------------------
-- Exactly the three that exist in production today. The URLs are copied verbatim and
-- are the identity of each row.
--
-- The TITLES are corrected, and that correction is the one place this migration changes
-- what a user would read. Production stored loose paraphrases — "Physical activity and
-- acute cigarette craving evidence" — which was harmless while nothing displayed them
-- and becomes a problem the moment they are shown as citations: a reader cannot look up
-- a paper by a description of it. Each URL was opened and the real bibliographic record
-- taken from it on 2026-08-23:
--
--   22585034 → Roberts V, Maddison R, Simpson C, Bullen C, Prapavessis H.
--              "The acute effects of exercise on cigarette cravings, withdrawal
--              symptoms, affect, and smoking behaviour: systematic review update and
--              meta-analysis." Psychopharmacology (Berl), 2012. Systematic review and
--              meta-analysis — which, notably, is a STRONGER design than the loose
--              title suggested, while its finding stays exactly as narrow as the
--              existing evidence_scope says: reduced desire to smoke for roughly half
--              an hour after activity, with the effective intensity and mechanism
--              explicitly unresolved by the authors. Level B is the honest level.
--
--   36630953 → Balban MY et al. "Brief structured respiration practices enhance mood
--              and reduce physiological arousal." Cell Reports Medicine, 2023. A
--              randomised controlled trial about mood and arousal in healthy adults —
--              it is not a smoking study at all, which is precisely what the existing
--              scope note already says.
--
--   WHO      → "WHO clinical treatment guideline for tobacco cessation in adults",
--              published 2 July 2024, ISBN 978-92-4-009643-1. Title confirmed as
--              stored, only the capitalisation differed.
--
-- The paraphrases are preserved in legacy_title rather than discarded.
create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  url text,
  publisher text,
  kind text not null check (kind in ('guideline', 'review', 'study')),
  year smallint,
  -- The paraphrase this source was stored under in replacements_catalog.source_title,
  -- kept so the backfill can be audited against production and so nobody later
  -- "restores" the loose wording thinking the exact title was a mistake.
  legacy_title text,
  -- When a human last opened the URL and confirmed it is the document claimed here.
  -- A citation nobody has checked is a claim, not a source.
  verified_on date,
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.evidence_sources
  (code, title, url, publisher, kind, year, legacy_title, verified_on, sort_order) values
  ('who_tobacco_cessation_2024',
   'WHO clinical treatment guideline for tobacco cessation in adults',
   'https://www.who.int/publications/i/item/9789240096431',
   'Всемирная организация здравоохранения', 'guideline', 2024,
   'WHO Clinical Treatment Guideline for Tobacco Cessation in Adults 2024',
   date '2026-08-23', 10),
  ('physical_activity_acute_craving',
   'The acute effects of exercise on cigarette cravings, withdrawal symptoms, affect, and smoking behaviour: systematic review update and meta-analysis',
   'https://pubmed.ncbi.nlm.nih.gov/22585034/',
   'Psychopharmacology (Berl)', 'review', 2012,
   'Physical activity and acute cigarette craving evidence',
   date '2026-08-23', 20),
  ('brief_respiration_mood_arousal',
   'Brief structured respiration practices enhance mood and reduce physiological arousal',
   'https://pubmed.ncbi.nlm.nih.gov/36630953/',
   'Cell Reports Medicine', 'study', 2023,
   'Brief structured respiration practices and mood/arousal',
   date '2026-08-23', 30)
on conflict (code) do update
  set title = excluded.title,
      url = excluded.url,
      publisher = excluded.publisher,
      kind = excluded.kind,
      year = excluded.year,
      legacy_title = excluded.legacy_title,
      verified_on = excluded.verified_on,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Which replacement rests on which source
-- ---------------------------------------------------------------------------
-- Many-to-many on purpose. Today every citing replacement has exactly one source, but
-- the free-text column could only ever hold one, which is itself part of why the data
-- is thin: there was nowhere to put a second citation.
create table if not exists public.replacement_evidence (
  replacement_code text not null references public.replacements_catalog(code) on delete cascade,
  source_id uuid not null references public.evidence_sources(id) on delete restrict,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (replacement_code, source_id)
);

create index if not exists replacement_evidence_source_idx
  on public.replacement_evidence (source_id);

-- Backfill strictly by matching production's own source_url. Matching on the URL rather
-- than the title is what makes correcting the titles above safe: the identifier does
-- not change, so every existing citation keeps pointing at the same document. It is
-- also the more robust key — a stray character in a 140-character title would silently
-- produce zero matches, and the guard below would then reject the whole migration.
insert into public.replacement_evidence (replacement_code, source_id)
select r.code, s.id
  from public.replacements_catalog r
  join public.evidence_sources s on s.url = r.source_url
 where r.source_url is not null
on conflict (replacement_code, source_id) do nothing;

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
-- A backfill that quietly links nothing is worse than one that fails: the interface
-- would then show "no source" for rows that do have one, which is a false statement
-- about evidence. Fail loudly instead.
do $$
declare
  citing integer;
  linked integer;
  orphan text;
begin
  select count(*) into citing from public.replacements_catalog where source_url is not null;
  select count(distinct replacement_code) into linked from public.replacement_evidence;

  if citing <> linked then
    select string_agg(r.code, ', ')
      into orphan
      from public.replacements_catalog r
     where r.source_url is not null
       and not exists (select 1 from public.replacement_evidence e where e.replacement_code = r.code);
    raise exception
      'Evidence backfill incomplete: % replacement(s) cite a source but % got linked. Unlinked: %. A source URL exists in replacements_catalog that has no row in evidence_sources.',
      citing, linked, coalesce(orphan, '(none)');
  end if;

  raise notice 'Evidence backfill: % replacement(s) linked to % source(s)',
    linked, (select count(*) from public.evidence_sources);
end
$$;

-- Every level actually used by the catalog must have a definition, or the interface
-- would render a bare letter with nothing behind it.
do $$
declare
  undefined_level text;
begin
  select string_agg(distinct r.evidence_level, ', ')
    into undefined_level
    from public.replacements_catalog r
   where r.evidence_level is not null
     and not exists (select 1 from public.evidence_levels l where l.code = r.evidence_level);

  if undefined_level is not null then
    raise exception 'Replacements use evidence level(s) with no definition in evidence_levels: %', undefined_level;
  end if;
end
$$;

-- The duplication described at the top of this file. Both copies agree right now; this
-- makes that a checked fact rather than an assumption, so if a later write path sets
-- one and not the other, the next migration run says so instead of the interface
-- silently showing the stale copy.
do $$
declare
  drifted text;
begin
  select string_agg(code, ', ')
    into drifted
    from public.replacements_catalog
   where coalesce(eligibility->>'evidence_level', '') is distinct from coalesce(evidence_level, '');

  if drifted is not null then
    raise exception
      'evidence_level disagrees between the eligibility jsonb and the column for: %. Both are still written today; they must not diverge while both exist.',
      drifted;
  end if;

  select string_agg(code, ', ')
    into drifted
    from public.replacements_catalog
   where coalesce(eligibility->>'mechanism', '') is distinct from coalesce(mechanism, '');

  if drifted is not null then
    raise exception
      'mechanism disagrees between the eligibility jsonb and the column for: %.',
      drifted;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
-- Same boundary as the rest of the editorial catalogs: readable, never writable from
-- the client, and readable without an account because the product now opens before
-- sign-in. None of these three tables can hold personal data — they describe published
-- content and public documents.
alter table public.evidence_levels enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.replacement_evidence enable row level security;

-- Dropped first so the whole migration stays re-runnable: `create policy` has no
-- `if not exists`, and a migration that fails on its second run is a migration nobody
-- dares apply to production twice.
drop policy if exists evidence_levels_read on public.evidence_levels;
create policy evidence_levels_read on public.evidence_levels
  for select to authenticated using (true);
drop policy if exists evidence_levels_read_anon on public.evidence_levels;
create policy evidence_levels_read_anon on public.evidence_levels
  for select to anon using (true);

drop policy if exists evidence_sources_read_published on public.evidence_sources;
create policy evidence_sources_read_published on public.evidence_sources
  for select to authenticated using (published = true);
drop policy if exists evidence_sources_read_published_anon on public.evidence_sources;
create policy evidence_sources_read_published_anon on public.evidence_sources
  for select to anon using (published = true);

drop policy if exists replacement_evidence_read on public.replacement_evidence;
create policy replacement_evidence_read on public.replacement_evidence
  for select to authenticated using (true);
drop policy if exists replacement_evidence_read_anon on public.replacement_evidence;
create policy replacement_evidence_read_anon on public.replacement_evidence
  for select to anon using (true);

grant select on public.evidence_levels to authenticated, anon;
grant select on public.evidence_sources to authenticated, anon;
grant select on public.replacement_evidence to authenticated, anon;

create or replace trigger evidence_levels_set_updated_at before update on public.evidence_levels
for each row execute function public.set_updated_at();
create or replace trigger evidence_sources_set_updated_at before update on public.evidence_sources
for each row execute function public.set_updated_at();
