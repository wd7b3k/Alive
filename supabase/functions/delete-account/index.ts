// Habitoff — authenticated account deletion Edge Function.
//
// Replaces the public SECURITY DEFINER RPC `delete_my_alive_account` that was removed
// in supabase/migrations/20260815221000_v3_remove_public_account_delete_rpc.sql after
// Supabase Security Advisor flagged it as an exposed PostgREST RPC surface — any
// authenticated caller could invoke a privileged, security-definer function directly.
//
// This Edge Function replaces that surface with the pattern CURRENT_STATE.md calls
// for: identity is verified with the caller's own JWT against the anon/publishable
// client (never trust a client-supplied user id), then the deletion itself runs
// through a *separate* admin client authenticated with the service-role key, which
// only ever lives in this server-side Edge Function runtime — never in the frontend
// bundle, never in git (PRIVACY_AND_DATA.md §11, RISK-V3-002).
//
// Deploy (owner-run, not done by this session — no live Supabase credentials here):
//   npx supabase functions deploy delete-account
// The function reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the Edge
// Function's own environment, which Supabase provisions automatically for every
// deployed function in a linked project — nothing to hardcode.
//
// `public.profiles` and every other user-owned row cascades from `auth.users` via
// `on delete cascade` (see supabase/migrations/20260815170000_v3_platform_initial.sql),
// so deleting the auth.users row is sufficient — matches the semantics of the
// removed RPC exactly, just reachable only through this authenticated, non-public path.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'authentication_required' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    // Missing configuration must fail closed, never fall back to an unauthenticated path.
    console.error('delete-account: missing SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY in function env');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  // Step 1 — verify the caller's own identity using their own JWT against the
  // anon/publishable client. Never derive the user id from anything the client sent
  // in the request body; only from a verified session.
  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'invalid_session' }, 401);
  }
  const userId = userData.user.id;

  // Step 2 — perform the deletion with a separate, service-role-authenticated admin
  // client. This client is constructed fresh per request from server-side env only;
  // the service-role key never touches the response and is never logged.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error('delete-account: admin.deleteUser failed', deleteError.message);
    return jsonResponse({ error: 'delete_failed' }, 500);
  }

  return jsonResponse({ ok: true }, 200);
});
