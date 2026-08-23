-- Schema for «Факты и Мифы».
--
-- Owner decision 2026-08-23: the section exists, it is built on the evidence layer
-- normalized in 20260823120000, and it appears in four places — its own section, the
-- replacement card inside the craving flow, a per-trigger fact in Связки, and Сегодня
-- plus the pre-login first screen.
--
-- This migration adds structure only. Not one card of content is inserted here; the
-- content is a separate migration so it can be read and approved as content rather
-- than skimmed inside a schema diff.

-- ---------------------------------------------------------------------------
-- The A/B/C definitions have to widen here
-- ---------------------------------------------------------------------------
-- 20260823120000 defined the levels by reading them off replacements_catalog, where
-- every row is an ACTION and A therefore meant "proven to help you quit". Facts and
-- myths are not actions — «лёгкие сигареты менее вредны» is a claim about harm, with a
-- large prospective cohort behind it and nothing to do with cessation. Under the
-- action-shaped wording it would have had nowhere to sit but C, which would be a lie
-- about how well established it is.
--
-- So the levels are restated to describe the STRENGTH of the evidence rather than the
-- type of claim, which is what a level is for. The letters keep their meaning for every
-- existing replacement: A is still the WHO guideline behind NRT, B is still "studied,
-- but for craving in the moment and not for quitting", C is still an ALIVE heuristic.
-- What changes is that they now also fit a statement of fact.
--
-- The nuance a single letter cannot carry — study design versus relevance, certainty
-- ratings, populations — belongs in scope_note_ru on the card, which is required and
-- not nullable for exactly this reason.
insert into public.evidence_levels (code, rank, label_ru, claim_ru, limit_ru, sort_order) values
  ('A', 1, 'Систематический обзор или руководство',
   'Вывод из систематического обзора исследований или клинического руководства — самый надёжный уровень, доступный по этой теме.',
   'Надёжно установленное среднее по многим людям. Это не обещание конкретного результата лично тебе.', 10),
  ('B', 2, 'Отдельные исследования',
   'Исследования есть, но они об отдельном эффекте или о состоянии в моменте, а не о самом отказе от курения.',
   'Не доказывает, что это поможет бросить. Долгосрочный эффект не установлен.', 20),
  ('C', 3, 'Эвристика ALIVE',
   'Приём или наблюдение, собранное из практики и здравого смысла продукта.',
   'Исследованием не проверено. Работает или нет — покажет твоя собственная статистика в разделе «Путь».', 30)
on conflict (code) do update
  set rank = excluded.rank,
      label_ru = excluded.label_ru,
      claim_ru = excluded.claim_ru,
      limit_ru = excluded.limit_ru,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- One table, not two
-- ---------------------------------------------------------------------------
-- A fact and a myth look like different things and are the same shape. The owner chose
-- the three-part form «Миф → что известно → что это меняет для тебя», and a fact fits
-- it exactly: a headline claim, what the evidence says, and the practical consequence.
-- Splitting them into facts_catalog and myths_catalog would duplicate the columns, the
-- policies, the evidence link table and every query, and would then require a union
-- anywhere both are shown together — which, in the section itself, is everywhere.
--
-- `kind` carries the difference that actually matters: a myth's claim_ru is a statement
-- the product is CONTRADICTING, and the interface must never render it in a way that
-- can be read as ALIVE asserting it. A fact's claim_ru is a statement the product is
-- making. Same columns, opposite polarity, and the polarity has to be explicit.
create table if not exists public.knowledge_catalog (
  code text primary key,
  kind text not null check (kind in ('fact', 'myth')),

  -- The three slots the owner specified.
  claim_ru text not null,     -- myth: the false belief, stated plainly. fact: the headline.
  known_ru text not null,     -- what the evidence actually says.
  changes_ru text not null,   -- what follows from it for this person, today.

  -- Honesty fields. These are not optional decoration: a claim about health shown
  -- without its strength and without its limits is worse than no claim, because the
  -- reader has no way to weigh it.
  evidence_level text not null references public.evidence_levels(code),
  -- Where the evidence does NOT reach. Mirrors replacements_catalog.evidence_scope,
  -- which is the existing convention for exactly this.
  scope_note_ru text not null,

  -- Which products this is about. A waterpipe card must not surface for someone who
  -- only vapes.
  product_types text[] not null default array['cigarette', 'hookah', 'vape']::text[],

  -- Where this card is allowed to appear. The section shows every published card, so
  -- it is not listed here; these are the contextual placements, and they are opt-in.
  -- A long card has no business interrupting somebody mid-craving.
  --   flow   — inside the guided craving flow
  --   links  — on the Связки screen, next to a trigger
  --   today  — on Сегодня
  --   public — on the pre-login first screen
  surfaces text[] not null default '{}'::text[]
    constraint knowledge_catalog_surfaces_known
    check (surfaces <@ array['flow', 'links', 'today', 'public']::text[]),

  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Which card belongs to which trigger
-- ---------------------------------------------------------------------------
-- A real link table rather than a trigger_codes text[] on the card. An array cannot
-- have a foreign key, and this catalog has already been bitten by exactly that class
-- of problem: two duplicate trigger codes survived for months because nothing tied
-- catalog rows together (see 20260821120000). A card pointing at a trigger code that
-- no longer exists would silently stop appearing, with nothing to notice it.
--
-- A card with no rows here is not context-specific — it belongs to the section and to
-- whatever general surfaces it opted into, which is the normal case for a myth.
create table if not exists public.knowledge_trigger_map (
  knowledge_code text not null references public.knowledge_catalog(code) on delete cascade,
  trigger_code text not null references public.triggers_catalog(code) on delete cascade,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (knowledge_code, trigger_code)
);

create index if not exists knowledge_trigger_map_trigger_idx
  on public.knowledge_trigger_map (trigger_code);

-- ---------------------------------------------------------------------------
-- Which card rests on which source
-- ---------------------------------------------------------------------------
-- Reuses evidence_sources from 20260823120000 rather than growing a second, parallel
-- bibliography. That is the whole point of having normalized it: the WHO guideline is
-- one row, cited by a replacement and by a myth alike.
create table if not exists public.knowledge_evidence (
  knowledge_code text not null references public.knowledge_catalog(code) on delete cascade,
  source_id uuid not null references public.evidence_sources(id) on delete restrict,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (knowledge_code, source_id)
);

create index if not exists knowledge_evidence_source_idx
  on public.knowledge_evidence (source_id);

-- ---------------------------------------------------------------------------
-- Every published card must carry a source, unless it admits it has none
-- ---------------------------------------------------------------------------
-- This is the rule that keeps the section honest, and it is enforced rather than
-- documented. Level A and B mean "there is research behind this" — a card claiming
-- either while citing nothing is making a false claim about its own evidence. Level C
-- is the honest escape hatch: it means "this is ALIVE's own reasoning", and a C card
-- may legitimately have no source.
create or replace function public.knowledge_requires_source()
returns trigger
language plpgsql
as $$
declare
  offending text;
begin
  select string_agg(k.code, ', ')
    into offending
    from public.knowledge_catalog k
   where k.published = true
     and k.evidence_level in ('A', 'B')
     and not exists (
       select 1 from public.knowledge_evidence e where e.knowledge_code = k.code
     );

  if offending is not null then
    raise exception
      'Published knowledge card(s) claim evidence level A or B but cite no source: %. Either attach a source or mark the card as level C.',
      offending;
  end if;

  return null;
end;
$$;

-- Deferred to the end of the transaction so a card and its citations can be inserted in
-- either order — but only within one transaction. Editing by hand through the Supabase
-- table editor, where each statement commits on its own, the workflow is therefore:
-- insert the card with published = false, attach its sources, then publish. The check
-- only looks at published rows, so an unpublished draft can sit uncited for as long as
-- it needs to.
drop trigger if exists knowledge_catalog_requires_source on public.knowledge_catalog;
create constraint trigger knowledge_catalog_requires_source
  after insert or update on public.knowledge_catalog
  deferrable initially deferred
  for each row execute function public.knowledge_requires_source();

drop trigger if exists knowledge_evidence_requires_source on public.knowledge_evidence;
create constraint trigger knowledge_evidence_requires_source
  after delete on public.knowledge_evidence
  deferrable initially deferred
  for each row execute function public.knowledge_requires_source();

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------
-- Editorial content, same boundary as every other catalog: readable, never writable
-- from the client, and readable without an account because the section is one of the
-- things a visitor should be able to see before deciding to sign up. No personal data
-- can live here.
alter table public.knowledge_catalog enable row level security;
alter table public.knowledge_trigger_map enable row level security;
alter table public.knowledge_evidence enable row level security;

drop policy if exists knowledge_catalog_read_published on public.knowledge_catalog;
create policy knowledge_catalog_read_published on public.knowledge_catalog
  for select to authenticated using (published = true);
drop policy if exists knowledge_catalog_read_published_anon on public.knowledge_catalog;
create policy knowledge_catalog_read_published_anon on public.knowledge_catalog
  for select to anon using (published = true);

drop policy if exists knowledge_trigger_map_read on public.knowledge_trigger_map;
create policy knowledge_trigger_map_read on public.knowledge_trigger_map
  for select to authenticated using (true);
drop policy if exists knowledge_trigger_map_read_anon on public.knowledge_trigger_map;
create policy knowledge_trigger_map_read_anon on public.knowledge_trigger_map
  for select to anon using (true);

drop policy if exists knowledge_evidence_read on public.knowledge_evidence;
create policy knowledge_evidence_read on public.knowledge_evidence
  for select to authenticated using (true);
drop policy if exists knowledge_evidence_read_anon on public.knowledge_evidence;
create policy knowledge_evidence_read_anon on public.knowledge_evidence
  for select to anon using (true);

grant select on public.knowledge_catalog to authenticated, anon;
grant select on public.knowledge_trigger_map to authenticated, anon;
grant select on public.knowledge_evidence to authenticated, anon;

create or replace trigger knowledge_catalog_set_updated_at before update on public.knowledge_catalog
for each row execute function public.set_updated_at();
