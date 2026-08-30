-- Minimal Supabase-compatible auth shim for local RLS testing without Docker/Supabase CLI.
-- Mirrors the real Supabase auth.uid() contract closely enough that migrations written
-- against auth.uid()/auth.users run unmodified. NOT a substitute for testing against the
-- actual Supabase project — see supabase/tests/local/README.md for scope/limitations.

create schema if not exists auth;

-- Колонки повторяют реальную auth.users в той части, которую читают миграции.
-- email_confirmed_at и raw_app_meta_data добавлены 2026-08-25: без них
-- 20260817182500_v4_alpha1_admin_allowlist не применяется, а это ровно тот файл, где
-- решается, кто становится администратором. Проверять его на шиме, где нет полей,
-- по которым он принимает решение, было бы проверкой ни о чём.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Реальная auth.uid() читает два имени настройки, а не одно: старое `request.jwt.claim.sub`
-- и то, что кладёт нынешний PostgREST, — весь набор claims одним JSON в `request.jwt.claims`.
-- Шим знал только первое, и тест, написанный против настоящего контракта, молча получал
-- NULL вместо пользователя: 04_admin_views_test.sql делал тестового пользователя
-- администратором и всё равно получал отказ витрины, потому что для is_alive_admin()
-- пользователя не было вовсе. Ошибка выглядела как сломанная витрина, а сломан был шим.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
