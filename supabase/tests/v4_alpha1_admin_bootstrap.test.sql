begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select ok(
  not has_table_privilege('authenticated', 'private.alive_admin_allowlist', 'SELECT'),
  'authenticated cannot read the private admin allowlist'
);
select ok(
  not has_table_privilege('anon', 'private.alive_admin_allowlist', 'SELECT'),
  'anonymous cannot read the private admin allowlist'
);
select ok(
  not has_function_privilege('authenticated', 'private.alive_sync_admin_allowlist()', 'EXECUTE'),
  'authenticated cannot execute controlled admin sync'
);
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'EXECUTE'),
  'authenticated cannot execute the auth trigger function'
);

insert into auth.users(id, email)
values ('10000000-0000-0000-0000-000000000031', 'wd7b3k@gmail.com');

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000031'::uuid$actual$,
  array['admin'::text],
  'future owner OAuth user receives admin role from the private allowlist'
);

insert into auth.users(id, email)
values ('10000000-0000-0000-0000-000000000032', 'ordinary-participant@example.test');

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000032'::uuid$actual$,
  array['participant'::text],
  'ordinary authenticated user remains a participant'
);

insert into auth.users(id, email)
values ('10000000-0000-0000-0000-000000000033', 'existing-owner@example.test');

insert into private.alive_admin_allowlist(email)
values ('existing-owner@example.test');

select results_eq(
  $actual$select private.alive_sync_admin_allowlist()$actual$,
  array[1],
  'controlled sync updates the newly allowlisted existing profile'
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000033'::uuid$actual$,
  array['admin'::text],
  'existing allowlisted profile is admin after controlled sync'
);

select results_eq(
  $actual$select private.alive_sync_admin_allowlist()$actual$,
  array[0],
  'controlled admin sync is idempotent'
);

select results_eq(
  $actual$select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'email'$actual$,
  array[0::bigint],
  'generic analytics schema does not expose admin email'
);

select * from finish();
rollback;
