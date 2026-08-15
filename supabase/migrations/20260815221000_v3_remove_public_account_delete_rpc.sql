-- ALIVE v3.0 security hardening.
-- Account deletion will be implemented via an authenticated Edge Function rather than
-- exposing a SECURITY DEFINER function through PostgREST public RPC.

drop function if exists public.delete_my_alive_account();
