begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select has_table('public', 'episodes', 'episodes exists after fresh migration replay');
select has_table('public', 'analytics_events', 'analytics_events exists after fresh migration replay');
select has_table('public', 'user_replacement_stats', 'learning projection exists after fresh migration replay');
select has_function(
  'public',
  'alive_record_awareness_exposure',
  array['text', 'text', 'text', 'uuid'],
  'canonical awareness RPC exists'
);
select has_index(
  'public',
  'analytics_events',
  'analytics_events_one_canonical_event_per_flow_idx',
  'canonical flow idempotency index exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.episodes'::regclass),
  'episodes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.analytics_events'::regclass),
  'analytics_events has RLS enabled'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.alive_record_awareness_exposure(text,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated can execute awareness RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.alive_record_awareness_exposure(text,text,text,uuid)',
    'EXECUTE'
  ),
  'anonymous cannot execute awareness RPC'
);
select ok(
  not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'alive_record_awareness_exposure'
      and grantee = 'PUBLIC'
      and privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no awareness RPC grant'
);

insert into auth.users(id, email) values
  ('10000000-0000-0000-0000-000000000001', 'alpha-owner@example.test'),
  ('10000000-0000-0000-0000-000000000002', 'alpha-other@example.test'),
  ('10000000-0000-0000-0000-000000000003', 'alpha-admin@example.test');

update public.profiles
set role = 'admin', status = 'active'
where id = '10000000-0000-0000-0000-000000000003';

insert into public.user_goals(
  id,
  user_id,
  goal_type,
  title_ru,
  body_ru,
  priority,
  active
) values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'ценность',
  'Приватный заголовок',
  'Приватный текст не должен быть доступен администратору',
  5,
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'participant sees only own profile'
);
select results_eq(
  $$select count(*) from public.profiles where id = '10000000-0000-0000-0000-000000000002'::uuid$$,
  array[0::bigint],
  'participant cannot read another profile'
);
select lives_ok(
  $$insert into public.episodes(
      id,user_id,target_product,trigger_code,craving_before,craving_after,outcome,helpfulness,episode_kind
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'cigarette','after_meal',7,4,'successful_response',4,'craving'
    )$$,
  'participant can insert own craving episode'
);
select throws_ok(
  $$insert into public.episodes(
      id,user_id,target_product,trigger_code,outcome,episode_kind
    ) values (
      '20000000-0000-0000-0000-000000000099',
      '10000000-0000-0000-0000-000000000002',
      'cigarette','after_meal','open','craving'
    )$,
  '42501',
  'new row violates row-level security policy for table "episodes"',
  'participant cannot insert an episode for another user'
);
select results_eq(
  $$select count(*) from public.episodes where id = '20000000-0000-0000-0000-000000000001'::uuid$$,
  array[1::bigint],
  'participant reads own episode'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$select count(*) from public.episodes where id = '20000000-0000-0000-0000-000000000001'::uuid$$,
  array[0::bigint],
  'second participant cannot read first participant episode'
);

reset role;
set local role anon;
select throws_ok(
  $select count(*) from public.episodes$,
  '42501',
  'permission denied for table episodes',
  'anonymous cannot read private episodes'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.analytics_events(user_id,event_type,funnel_stage,surface,metadata)
    values (
      '10000000-0000-0000-0000-000000000001',
      'test_event','тест','ci','{"flow_id":"test-owner-event"}'::jsonb
    )$$,
  'participant can insert own structured analytics event'
);
select throws_ok(
  $$insert into public.analytics_events(user_id,event_type,funnel_stage,surface,metadata)
    values (
      '10000000-0000-0000-0000-000000000002',
      'test_event','тест','ci','{"flow_id":"test-cross-event"}'::jsonb
    )$,
  '42501',
  'new row violates row-level security policy for table "analytics_events"',
  'participant cannot insert analytics for another user'
);
select results_eq(
  $$select count(*) from public.analytics_events where event_type = 'test_event'$$,
  array[0::bigint],
  'participant cannot read analytics, including own rows'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.alive_record_awareness_exposure(
      'fact_move_through_craving',
      'cigarette',
      'after_meal',
      '40000000-0000-0000-0000-000000000099'::uuid
    )$,
  '42501',
  'permission denied for function alive_record_awareness_exposure',
  'anonymous cannot execute awareness RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is(
  public.alive_record_awareness_exposure(
    'fact_move_through_craving',
    'cigarette',
    'after_meal',
    '40000000-0000-0000-0000-000000000001'
  ),
  public.alive_record_awareness_exposure(
    'fact_move_through_craving',
    'cigarette',
    'after_meal',
    '40000000-0000-0000-0000-000000000001'
  ),
  'sequential flow_id retry returns the same impression id'
);
select results_eq(
  $$select count(*) from public.content_impressions
    where content_code = 'fact_move_through_craving'
      and trigger_code = 'after_meal'$$,
  array[1::bigint],
  'sequential retry creates one visible impression'
);

reset role;
select results_eq(
  $$select count(*) from public.analytics_events
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and event_type = 'awareness_shown'
      and metadata ->> 'flow_id' = '40000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'sequential retry creates one awareness event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select results_eq(
  $$select count(*) from public.analytics_events where event_type = 'test_event'$$,
  array[1::bigint],
  'active admin can read structured participant analytics'
);
select results_eq(
  $$select count(*) from public.analytics_events
    where event_type = 'awareness_shown'
      and metadata ->> 'flow_id' = '40000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'active admin can read canonical awareness analytics'
);
select results_eq(
  $$select count(*) from public.content_impressions
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid$$,
  array[1::bigint],
  'active admin can read content usage evidence'
);
select results_eq(
  $$select count(*) from public.user_goals
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid$$,
  array[0::bigint],
  'admin cannot read participant private goals'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$select count(*) from public.user_goals
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid$$,
  array[0::bigint],
  'another participant cannot read private goals'
);

select * from finish();
rollback;
