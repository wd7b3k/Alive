-- ALIVE R1 — сохраняем пользовательскую историю старых Мифов без признания старого каталога новым Evidence Registry.

create table public.user_awareness_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_code text not null references public.awareness_content(code) on delete cascade,
  relevance text not null default 'не определена',
  seen_count integer not null default 0 check (seen_count >= 0),
  helpful_count integer not null default 0 check (helpful_count >= 0 and helpful_count <= seen_count),
  last_shown_at timestamptz,
  dismissed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,content_code)
);

alter table public.user_awareness_state enable row level security;
create policy user_awareness_state_own on public.user_awareness_state for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.user_awareness_state to authenticated;

create trigger user_awareness_state_set_updated_at before update on public.user_awareness_state
for each row execute function public.set_updated_at();

create index user_awareness_state_recent_idx on public.user_awareness_state(user_id,last_shown_at desc);

-- Мигрируем только смыслово однозначные соответствия.
-- Если новый материал существенно меняет утверждение, старый state намеренно не переносится.
-- Legacy-таблица могла существовать только в remote history, поэтому fresh replay обязан работать и без неё.
do $legacy_migration$
begin
  if pg_catalog.to_regclass('public.user_myth_state') is null then
    return;
  end if;

  execute $copy$
    insert into public.user_awareness_state(
      user_id,content_code,relevance,seen_count,helpful_count,last_shown_at,dismissed_until,created_at,updated_at
    )
    select s.user_id,m.new_code,s.relevance,s.seen_count,s.helpful_count,s.last_shown_at,s.dismissed_until,s.created_at,s.updated_at
    from public.user_myth_state s
    join (values
      ('too_late_to_quit','myth_too_late'),
      ('nrt_same_as_smoking','myth_nrt_relapse'),
      ('vape_is_harmless','myth_vape_harmless'),
      ('hookah_is_mild','myth_hookah_water'),
      ('one_does_not_count','myth_few_cigarettes_safe'),
      ('without_smoking_more_anxious','myth_mental_health'),
      ('weight_is_inevitable','myth_weight_gain')
    ) as m(old_code,new_code) on m.old_code=s.myth_code
    on conflict(user_id,content_code) do update set
      seen_count=greatest(public.user_awareness_state.seen_count,excluded.seen_count),
      helpful_count=greatest(public.user_awareness_state.helpful_count,excluded.helpful_count),
      last_shown_at=greatest(public.user_awareness_state.last_shown_at,excluded.last_shown_at),
      dismissed_until=greatest(public.user_awareness_state.dismissed_until,excluded.dismissed_until),
      updated_at=now()
  $copy$;
end
$legacy_migration$;

comment on table public.user_awareness_state is 'Персональное состояние утверждённого Fact/Myth-контента. Legacy myth state переносится только при однозначном смысловом соответствии.';
