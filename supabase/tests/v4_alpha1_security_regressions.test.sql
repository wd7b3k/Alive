begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

insert into auth.users(id,email) values
  ('10000000-0000-0000-0000-000000000011','security-owner@example.test'),
  ('10000000-0000-0000-0000-000000000012','security-other@example.test');

insert into public.episodes(id,user_id,target_product,trigger_code,outcome,episode_kind) values
  ('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','cigarette','after_meal','successful_response','craving'),
  ('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000012','cigarette','after_meal','successful_response','craving');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000011',true);

select throws_ok(
  $sql$update public.profiles set role='admin'
    where id='10000000-0000-0000-0000-000000000011'::uuid$sql$,
  '42501',
  'profile role and status are controlled by administrators',
  'participant cannot promote own profile to admin'
);
select results_eq(
  $$select role from public.profiles where id='10000000-0000-0000-0000-000000000011'::uuid$$,
  array['participant'::text],
  'failed escalation leaves participant role unchanged'
);

select throws_ok(
  $sql$update public.profiles set status='disabled'
    where id='10000000-0000-0000-0000-000000000011'::uuid$sql$,
  '42501',
  'profile role and status are controlled by administrators',
  'participant cannot mutate controlled profile status'
);
select results_eq(
  $$select status from public.profiles where id='10000000-0000-0000-0000-000000000011'::uuid$$,
  array['active'::text],
  'failed status mutation leaves profile active'
);

select throws_ok(
  $sql$insert into public.episode_actions(id,user_id,episode_id,action_type,replacement_code)
    values (
      '30000000-0000-0000-0000-000000000012',
      '10000000-0000-0000-0000-000000000011',
      '20000000-0000-0000-0000-000000000012',
      'replacement','water'
    )$sql$,
  '23503',
  'insert or update on table "episode_actions" violates foreign key constraint "episode_actions_episode_owner_fkey"',
  'participant cannot attach own action to another participant episode'
);

select throws_ok(
  $sql$delete from public.episodes
    where id='20000000-0000-0000-0000-000000000011'::uuid$sql$,
  '42501',
  'permission denied for table episodes',
  'participant cannot physically delete an episode outside recompute path'
);

select * from finish();
rollback;
