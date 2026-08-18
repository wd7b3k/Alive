begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

select ok(
  not has_table_privilege('authenticated', 'private.alive_admin_allowlist', 'SELECT'),
  'authenticated cannot read the private admin allowlist'
);
select ok(
  not has_table_privilege('anon', 'private.alive_admin_allowlist', 'SELECT'),
  'anonymous cannot read the private admin allowlist'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.alive_is_allowlisted_google_admin(text,timestamp with time zone,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute the trusted identity predicate'
);
select ok(
  not has_function_privilege('authenticated', 'private.alive_sync_admin_allowlist()', 'EXECUTE'),
  'authenticated cannot execute controlled admin sync'
);
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_auth_user()', 'EXECUTE'),
  'authenticated cannot execute the auth trigger function'
);

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
values (
  '10000000-0000-0000-0000-000000000031',
  'wd7b3k@gmail.com',
  now(),
  '{"provider":"google","providers":["google"]}'::jsonb
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000031'::uuid$actual$,
  array['admin'::text],
  'confirmed Google owner receives admin role from the private allowlist'
);

insert into private.alive_admin_allowlist(email)
values
  ('unconfirmed-owner@example.test'),
  ('nongoogle-owner@example.test'),
  ('spoofed-owner@example.test');

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
values (
  '10000000-0000-0000-0000-000000000034',
  'unconfirmed-owner@example.test',
  null,
  '{"provider":"google","providers":["google"]}'::jsonb
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000034'::uuid$actual$,
  array['participant'::text],
  'unconfirmed allowlisted email remains a participant'
);

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
values (
  '10000000-0000-0000-0000-000000000035',
  'nongoogle-owner@example.test',
  now(),
  '{"provider":"github","providers":["github"]}'::jsonb
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000035'::uuid$actual$,
  array['participant'::text],
  'confirmed non-Google allowlisted identity remains a participant'
);

insert into auth.users(
  id,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values (
  '10000000-0000-0000-0000-000000000036',
  'spoofed-owner@example.test',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"provider":"google","role":"admin"}'::jsonb
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000036'::uuid$actual$,
  array['participant'::text],
  'user-editable metadata cannot spoof Google admin authority'
);

insert into auth.users(id, email)
values ('10000000-0000-0000-0000-000000000032', 'ordinary-participant@example.test');

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000032'::uuid$actual$,
  array['participant'::text],
  'ordinary authenticated user remains a participant'
);

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
values (
  '10000000-0000-0000-0000-000000000033',
  'existing-owner@example.test',
  now(),
  '{"provider":"google","providers":["google"]}'::jsonb
);

insert into private.alive_admin_allowlist(email)
values ('existing-owner@example.test');

select results_eq(
  $actual$select private.alive_sync_admin_allowlist()$actual$,
  array[1],
  'controlled sync updates the newly allowlisted confirmed Google profile'
);

select results_eq(
  $actual$select role from public.profiles
    where id = '10000000-0000-0000-0000-000000000033'::uuid$actual$,
  array['admin'::text],
  'existing allowlisted confirmed Google profile is admin after controlled sync'
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

select results_eq(
  $actual$select count(*)
    from public.analytics_events
    where metadata::text ilike '%wd7b3k@gmail.com%'$actual$,
  array[0::bigint],
  'generic analytics metadata does not contain the admin email'
);

select * from finish();
rollback;
