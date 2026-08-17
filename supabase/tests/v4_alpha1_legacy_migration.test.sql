begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

insert into auth.users(id,email)
values ('10000000-0000-0000-0000-000000000021','legacy-awareness@example.test');

create table public.user_myth_state (
  user_id uuid not null,
  myth_code text not null,
  relevance text not null,
  seen_count integer not null,
  helpful_count integer not null,
  last_shown_at timestamptz,
  dismissed_until timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

insert into public.user_myth_state values
  ('10000000-0000-0000-0000-000000000021','too_late_to_quit','важно',3,2,'2026-08-01T10:00:00Z',null,'2026-08-01T09:00:00Z','2026-08-01T10:00:00Z'),
  ('10000000-0000-0000-0000-000000000021','legacy_without_mapping','не важно',9,1,null,null,now(),now());

select ok(
  not has_function_privilege('authenticated','private.alive_migrate_legacy_awareness_state()','EXECUTE'),
  'authenticated cannot execute legacy migration helper'
);
select lives_ok(
  $sql$select private.alive_migrate_legacy_awareness_state()$sql$,
  'legacy-present migration path executes'
);
select results_eq(
  $actual$select content_code,seen_count,helpful_count
    from public.user_awareness_state
    where user_id='10000000-0000-0000-0000-000000000021'::uuid$actual$,
  $expected$values ('myth_too_late'::text,3,2)$expected$,
  'mapped legacy state is preserved with counters'
);
select results_eq(
  $actual$select count(*) from public.user_awareness_state
    where user_id='10000000-0000-0000-0000-000000000021'::uuid$actual$,
  array[1::bigint],
  'unmapped legacy myths are not promoted into approved content'
);

update public.user_myth_state
set seen_count=5,helpful_count=4,last_shown_at='2026-08-02T10:00:00Z'
where myth_code='too_late_to_quit';

select lives_ok(
  $sql$select private.alive_migrate_legacy_awareness_state()$sql$,
  'legacy migration helper is idempotent on retry'
);

select results_eq(
  $actual$select seen_count,helpful_count from public.user_awareness_state
    where user_id='10000000-0000-0000-0000-000000000021'::uuid
      and content_code='myth_too_late'$actual$,
  $expected$values (5,4)$expected$,
  'retry keeps the greatest legacy counters without duplication'
);

select * from finish();
rollback;
