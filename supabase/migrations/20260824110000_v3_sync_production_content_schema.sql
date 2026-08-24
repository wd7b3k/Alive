-- Записать в репозиторий контентный слой, который существует только в проде.
--
-- Эти одиннадцать таблиц созданы прямо в базе и не описаны ни одной миграцией. Пока это
-- так, любая миграция, которая на них ссылается, падает на чистом Postgres — а именно
-- на чистом Postgres прогоняется supabase/tests/local, единственная автоматическая
-- проверка политик, которая у проекта есть. То есть без этого файла контентный слой
-- нельзя ни протестировать, ни поднять заново.
--
-- Схема снята с прода интроспекцией 2026-08-24: колонки, типы, NOT NULL, значения по
-- умолчанию, первичные и внешние ключи, check-ограничения. `create table if not exists`
-- означает, что в проде не изменится ничего — таблицы там уже есть, и файл для него
-- пустая операция. Он нужен локальной базе и следующему человеку, который откроет
-- репозиторий и захочет понять, из чего состоит продукт.
--
-- Контент здесь не воспроизводится: 19 фактов, 19 мифов, 18 целей, 18 источников и 18
-- утверждений живут в проде и остаются там. Локальная база поднимается пустой, и тест
-- изоляции сеет в неё ровно те несколько строк, которые ему нужны.

-- ---------------------------------------------------------------------------
-- Доказательная база
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  title_original text not null,
  source_label_ru text not null,
  authors text,
  publication text,
  publication_date date,
  url text not null unique,
  doi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_claims (
  code text primary key,
  topic text not null,
  claim_ru text not null,
  population_ru text,
  limitations_ru text not null default '',
  -- Отдельный словарь уровней, по-русски и про уверенность, а не про дизайн
  -- исследования. Он не совпадает с A/B/C на facts_catalog и myths_catalog — это два
  -- разных словаря, живущих в проде одновременно.
  evidence_level text not null check (evidence_level in (
    'высокая уверенность', 'умеренная уверенность', 'предварительные данные', 'гипотеза ALIVE'
  )),
  status text not null default 'черновик' check (status in ('черновик', 'проверено', 'архив')),
  last_reviewed_at date,
  review_due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_claim_sources (
  claim_code text not null references public.evidence_claims(code) on delete cascade,
  source_id uuid not null references public.evidence_sources(id) on delete cascade,
  source_role text not null default 'основной'
    check (source_role in ('основной', 'поддерживающий', 'контекст')),
  primary key (claim_code, source_id)
);

-- ---------------------------------------------------------------------------
-- Микроосознанность
-- ---------------------------------------------------------------------------
create table if not exists public.awareness_content (
  code text primary key,
  content_type text not null check (content_type in ('факт', 'миф')),
  title_ru text not null,
  hook_ru text not null,
  explanation_ru text not null,
  motivation_ru text,
  caveat_ru text not null default '',
  claim_code text references public.evidence_claims(code) on delete restrict,
  product_types text[] not null default array['cigarette', 'hookah', 'vape']::text[],
  context_tags text[] not null default '{}'::text[],
  published boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.awareness_content_contexts (
  id uuid primary key default gen_random_uuid(),
  content_code text not null references public.awareness_content(code) on delete cascade,
  trigger_code text references public.triggers_catalog(code) on delete cascade,
  product_type text check (product_type is null or product_type in ('cigarette', 'hookah', 'vape')),
  moment text not null default 'микроосознанность'
    check (moment in ('микроосознанность', 'после эпизода', 'путь', 'библиотека')),
  priority integer not null default 100
);

-- ---------------------------------------------------------------------------
-- Факты и мифы
-- ---------------------------------------------------------------------------
-- Ссылка на источник лежит прямо на строке, как и на replacements_catalog. Это
-- сознательный выбор прода, а не недоделка: у карточки один источник, и отдельная
-- библиография ради него добавила бы соединение в каждый запрос.
create table if not exists public.facts_catalog (
  code text primary key,
  title text not null,
  short_text text not null,
  full_text text not null,
  category text not null,
  -- true — карточка про выигрыш от отказа, false — про вред. От этого зависит, можно
  -- ли показывать её на экране до входа: посетитель, который ещё ничего не решил, не
  -- должен встречать продукт цифрой о потерянном десятилетии.
  benefit boolean not null default false,
  evidence_level text not null default 'A' check (evidence_level in ('A', 'B', 'C')),
  evidence_kind text not null,
  source_title text not null,
  source_url text not null,
  doi text,
  sample_size integer check (sample_size is null or sample_size > 0),
  product_types text[] not null default array['cigarette']::text[],
  -- Диапазоны стажа: карточка про большой стаж не нужна тому, кто курит второй год.
  min_years numeric check (min_years is null or min_years >= 0),
  max_years numeric,
  min_pack_years numeric check (min_pack_years is null or min_pack_years >= 0),
  max_pack_years numeric,
  context_tags text[] not null default '{}'::text[],
  published boolean not null default true,
  sort_order integer not null default 100,
  last_verified_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_years is null or max_years >= min_years),
  check (max_pack_years is null or max_pack_years >= min_pack_years)
);

create table if not exists public.myths_catalog (
  code text primary key,
  -- Само убеждение, дословно, как его произносит человек. Интерфейс обязан подавать
  -- его как чужую реплику, которой продукт возражает.
  title text not null,
  short_reframe text not null,
  explanation text not null,
  mechanism text not null,
  evidence_level text not null default 'C' check (evidence_level in ('A', 'B', 'C')),
  evidence_scope text,
  source_title text not null,
  source_url text not null,
  doi text,
  -- Массивы кодов вместо связующих таблиц. Внешнего ключа у массива быть не может,
  -- поэтому 20260824130000 отдельно проверяет, что ни один код не висит в пустоту:
  -- именно так `water` вместо `water_pause` прожил незамеченным.
  trigger_codes text[] not null default '{}'::text[],
  need_codes text[] not null default '{}'::text[],
  product_types text[] not null default array['cigarette', 'hookah', 'vape']::text[],
  context_tags text[] not null default '{}'::text[],
  replacement_codes text[] not null default '{}'::text[],
  published boolean not null default true,
  sort_order integer not null default 100,
  last_verified_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Цели
-- ---------------------------------------------------------------------------
-- Преемник meanings_catalog: у user_goals есть колонка source_meaning_id, то есть
-- переход задумывался с самого начала. Раздел Смыслов пока работает на старой таблице.
create table if not exists public.goals_catalog (
  code text primary key,
  goal_type text not null check (goal_type in ('цель', 'ценность', 'направление')),
  title_ru text not null,
  body_ru text not null,
  reflection_prompt_ru text,
  context_tags text[] not null default '{}'::text[],
  published boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Персональное состояние
-- ---------------------------------------------------------------------------
create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_goal_code text references public.goals_catalog(code) on delete set null,
  source_meaning_id uuid references public.user_meanings(id) on delete set null,
  goal_type text not null default 'направление'
    check (goal_type in ('цель', 'ценность', 'направление')),
  title_ru text not null,
  body_ru text not null,
  priority smallint not null default 3 check (priority >= 1 and priority <= 5),
  context_tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.user_awareness_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_code text not null references public.awareness_content(code) on delete cascade,
  relevance text not null default 'не определена',
  seen_count integer not null default 0 check (seen_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0 and helpful_count <= seen_count),
  last_shown_at timestamptz,
  dismissed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_code)
);

create table if not exists public.user_myth_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  myth_code text not null references public.myths_catalog(code) on delete cascade,
  relevance text not null default 'unknown'
    check (relevance in ('unknown', 'relevant', 'not_relevant')),
  seen_count integer not null default 0 check (seen_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  last_shown_at timestamptz,
  dismissed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, myth_code)
);

create index if not exists awareness_content_contexts_trigger_idx
  on public.awareness_content_contexts (trigger_code);
create index if not exists user_goals_user_idx on public.user_goals (user_id) where deleted_at is null;

-- RLS включается здесь, права и политики — в 20260824120000. Разделение намеренное:
-- этот файл описывает форму, тот решает, кто что видит.
alter table public.evidence_sources enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.evidence_claim_sources enable row level security;
alter table public.awareness_content enable row level security;
alter table public.awareness_content_contexts enable row level security;
alter table public.facts_catalog enable row level security;
alter table public.myths_catalog enable row level security;
alter table public.goals_catalog enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_awareness_state enable row level security;
alter table public.user_myth_state enable row level security;

create or replace trigger evidence_sources_set_updated_at before update on public.evidence_sources
for each row execute function public.set_updated_at();
create or replace trigger evidence_claims_set_updated_at before update on public.evidence_claims
for each row execute function public.set_updated_at();
create or replace trigger awareness_content_set_updated_at before update on public.awareness_content
for each row execute function public.set_updated_at();
create or replace trigger facts_catalog_set_updated_at before update on public.facts_catalog
for each row execute function public.set_updated_at();
create or replace trigger myths_catalog_set_updated_at before update on public.myths_catalog
for each row execute function public.set_updated_at();
create or replace trigger goals_catalog_set_updated_at before update on public.goals_catalog
for each row execute function public.set_updated_at();
create or replace trigger user_goals_set_updated_at before update on public.user_goals
for each row execute function public.set_updated_at();
create or replace trigger user_awareness_state_set_updated_at before update on public.user_awareness_state
for each row execute function public.set_updated_at();
create or replace trigger user_myth_state_set_updated_at before update on public.user_myth_state
for each row execute function public.set_updated_at();
