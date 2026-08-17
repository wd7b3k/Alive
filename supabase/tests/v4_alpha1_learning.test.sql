begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(14);

insert into auth.users(id, email)
values ('10000000-0000-0000-0000-000000000001', 'alpha-learning@example.test');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.episodes(
      id,user_id,target_product,trigger_code,craving_before,craving_after,outcome,helpfulness,episode_kind
    ) values (
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'cigarette','after_meal',7,4,'successful_response',4,'craving'
    )$$,
  'baseline learning episode can be created'
);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$insert into public.episodes(
      id,user_id,target_product,trigger_code,craving_before,craving_after,outcome,helpfulness,episode_kind
    ) values (
      '20000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      'cigarette','after_meal',8,3,'successful_response',5,'craving'
    )$$,
  'learning source episode can be created'
);
select lives_ok(
  $$insert into public.episode_actions(
      id,user_id,episode_id,action_type,replacement_code
    ) values (
      '30000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'replacement','water'
    )$$,
  'learning source action can be created'
);
select results_eq(
  $$select observations from public.user_trigger_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[2],
  'trigger learning includes both confirmed episodes'
);
select results_eq(
  $$select attempts from public.user_replacement_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and replacement_key = 'g:water'
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[1],
  'replacement learning includes the action'
);
select lives_ok(
  $$update public.episodes
    set deleted_at = now()
    where id = '20000000-0000-0000-0000-000000000002'::uuid$$,
  'soft delete of raw episode succeeds'
);
select results_eq(
  $$select observations from public.user_trigger_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[1],
  'soft delete recomputes trigger learning'
);
select results_eq(
  $$select count(*) from public.user_replacement_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and replacement_key = 'g:water'
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[0::bigint],
  'soft delete removes deleted episode from replacement learning'
);
select lives_ok(
  $$update public.episodes
    set deleted_at = null
    where id = '20000000-0000-0000-0000-000000000002'::uuid$$,
  'restoring corrected raw episode succeeds'
);
select results_eq(
  $$select observations from public.user_trigger_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[2],
  'restoring episode rebuilds trigger learning'
);
select results_eq(
  $$select attempts from public.user_replacement_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and replacement_key = 'g:water'
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[1],
  'restoring episode rebuilds replacement learning'
);
select lives_ok(
  $$delete from public.episode_actions
    where id = '30000000-0000-0000-0000-000000000002'::uuid$$,
  'deleting raw action succeeds'
);
select results_eq(
  $$select count(*) from public.user_replacement_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and replacement_key = 'g:water'
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[0::bigint],
  'action delete recomputes replacement learning'
);
select results_eq(
  $$select observations from public.user_trigger_stats
    where user_id = '10000000-0000-0000-0000-000000000001'::uuid
      and trigger_key = 'g:after_meal'
      and product_type = 'cigarette'$$,
  array[2],
  'action delete does not erase trigger learning'
);

select * from finish();
rollback;
