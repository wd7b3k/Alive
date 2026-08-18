begin;

create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
set local search_path = public, extensions;

do $setup$
begin
  perform extensions.dblink_connect(
    'setup',
    'host=supabase_db_alive-ci port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_exec(
    'setup',
    $$delete from auth.users
      where id = '10000000-0000-0000-0000-000000000004'::uuid$$
  );
  perform extensions.dblink_exec(
    'setup',
    $$insert into auth.users(id,email)
      values (
        '10000000-0000-0000-0000-000000000004',
        'alpha-concurrent@example.test'
      )$$
  );
  perform extensions.dblink_exec(
    'setup',
    $remote$
      create or replace function public.alive_test_exposure_with_pause(
        p_content_code text,
        p_product_type text,
        p_trigger_code text,
        p_flow_id uuid
      )
      returns uuid
      language plpgsql
      set search_path = ''
      as $function$
      declare
        v_id uuid;
      begin
        v_id := public.alive_record_awareness_exposure(
          p_content_code,
          p_product_type,
          p_trigger_code,
          p_flow_id
        );
        perform pg_catalog.pg_sleep(2);
        return v_id;
      end;
      $function$
    $remote$
  );

  perform extensions.dblink_connect(
    'concurrent_one',
    'host=supabase_db_alive-ci port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_connect(
    'concurrent_two',
    'host=supabase_db_alive-ci port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_exec('concurrent_one', 'set role authenticated');
  perform extensions.dblink_exec('concurrent_two', 'set role authenticated');
  perform extensions.dblink_exec(
    'concurrent_one',
    $remote$
      do $claim$
      begin
        perform set_config(
          'request.jwt.claim.sub',
          '10000000-0000-0000-0000-000000000004',
          false
        );
      end
      $claim$
    $remote$
  );
  perform extensions.dblink_exec(
    'concurrent_two',
    $remote$
      do $claim$
      begin
        perform set_config(
          'request.jwt.claim.sub',
          '10000000-0000-0000-0000-000000000004',
          false
        );
      end
      $claim$
    $remote$
  );
end
$setup$;

select plan(6);

select ok(
  extensions.dblink_send_query(
    'concurrent_one',
    $$select public.alive_test_exposure_with_pause(
      'fact_move_through_craving',
      'cigarette',
      'after_meal',
      '40000000-0000-0000-0000-000000000004'::uuid
    )$$
  ) = 1,
  'first concurrent exposure request started'
);
select ok(
  extensions.dblink_send_query(
    'concurrent_two',
    $$select public.alive_record_awareness_exposure(
      'fact_move_through_craving',
      'cigarette',
      'after_meal',
      '40000000-0000-0000-0000-000000000004'::uuid
    )$$
  ) = 1,
  'second concurrent exposure request started'
);

create temporary table concurrent_exposure_results (
  connection_name text primary key,
  impression_id uuid not null
);

insert into concurrent_exposure_results(connection_name, impression_id)
select 'one', result
from extensions.dblink_get_result('concurrent_one') as response(result uuid);

insert into concurrent_exposure_results(connection_name, impression_id)
select 'two', result
from extensions.dblink_get_result('concurrent_two') as response(result uuid);

select results_eq(
  $$select count(*) from concurrent_exposure_results$$,
  array[2::bigint],
  'both concurrent requests completed'
);
select results_eq(
  $$select count(distinct impression_id) from concurrent_exposure_results$$,
  array[1::bigint],
  'concurrent retries return one canonical impression id'
);
select results_eq(
  $$select count(*) from public.content_impressions
    where user_id = '10000000-0000-0000-0000-000000000004'::uuid
      and content_code = 'fact_move_through_craving'
      and trigger_code = 'after_meal'$$,
  array[1::bigint],
  'concurrent retries create one impression'
);
select results_eq(
  $$select count(*) from public.analytics_events
    where user_id = '10000000-0000-0000-0000-000000000004'::uuid
      and event_type = 'awareness_shown'
      and metadata ->> 'flow_id' = '40000000-0000-0000-0000-000000000004'$$,
  array[1::bigint],
  'concurrent retries create one analytics event'
);

do $cleanup$
begin
  perform extensions.dblink_disconnect('concurrent_one');
  perform extensions.dblink_disconnect('concurrent_two');
  perform extensions.dblink_exec(
    'setup',
    'drop function if exists public.alive_test_exposure_with_pause(text,text,text,uuid)'
  );
  perform extensions.dblink_exec(
    'setup',
    $$delete from auth.users
      where id = '10000000-0000-0000-0000-000000000004'::uuid$$
  );
  perform extensions.dblink_disconnect('setup');
end
$cleanup$;

select * from finish();
rollback;
