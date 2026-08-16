# Preview deployments and OAuth

## Problem

Cloudflare Pages creates branch and commit preview origins such as:

- `https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev`
- `https://<deployment-hash>.alive-aw2.pages.dev`

ALIVE starts Google OAuth with:

`redirectTo: window.location.origin + '/'`

Supabase Auth accepts this redirect only when the origin is present in **Authentication → URL Configuration → Redirect URLs**. If the requested preview origin is not allowed, Supabase falls back to the configured Site URL. For ALIVE that is production `https://alive-aw2.pages.dev`, which makes a successful preview login appear to “open the old deployment”.

Official reference: https://supabase.com/docs/guides/auth/redirect-urls

## Canonical QA setup

Keep production Site URL exact:

`https://alive-aw2.pages.dev`

For the active v3.1 QA branch add this Additional Redirect URL:

`https://agent-v3-1-behavioral-depth.alive-aw2.pages.dev/**`

Use the stable **Branch Preview URL** for authenticated QA. Do not use per-commit hash preview URLs for OAuth testing unless their origin is also explicitly allowlisted.

For future multi-branch QA choose one of two policies deliberately:

1. safer/default — add the exact stable branch-preview origin for each branch under active QA;
2. broader developer convenience — allow `https://*.alive-aw2.pages.dev/**`, understanding that this authorizes every single-label Cloudflare Pages preview subdomain for this project.

Prefer exact branch preview origins while the cohort is small. A dedicated staging hostname is preferable before broader team development.

## Google Console

No extra Google OAuth redirect URI is needed for each Cloudflare preview. Google continues to return to the Supabase provider callback. The application-level redirect back to ALIVE is controlled by Supabase Auth Redirect URLs.

## Visual QA guard

Non-production `*.alive-aw2.pages.dev` builds display a small `Preview v3.1` badge. If the badge disappears after Google login and the browser hostname becomes `alive-aw2.pages.dev`, OAuth has fallen back to production and the preview redirect allowlist is not configured correctly.
