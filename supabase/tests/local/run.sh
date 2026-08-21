#!/usr/bin/env bash
# Runs the RLS cross-tenant isolation test against a disposable local Postgres database
# using the project's real, versioned migrations from supabase/migrations/.
#
# Scope and limitations (read before trusting this as "the" RLS gate):
# - This runs against plain local PostgreSQL with a minimal `auth` schema/role shim
#   (00_auth_shim.sql), not the actual Supabase-hosted stack (no PostgREST, no GoTrue,
#   no real JWT verification, no Supabase-managed extensions beyond pgcrypto). It proves
#   the RLS policies defined in the migrations correctly isolate tenants at the SQL
#   level. It does NOT prove the hosted Supabase project is configured identically, and
#   it does NOT exercise the real Google OAuth -> JWT -> PostgREST request path.
# - Treat a PASS here as strong evidence the migration SQL is correct, not as a
#   replacement for the "two real Google users, real Cloudflare Pages deployment"
#   smoke test still required by releases/v3.0-platform/VALIDATION.md.
#
# Requires: a local PostgreSQL server reachable via `psql` with permission to
# create/drop databases (matches what GitHub Actions' postgres service provides).
#
# Usage: PGHOST=... PGUSER=... ./run.sh   (defaults assume a local trust-auth Postgres,
# e.g. `sudo -u postgres ./run.sh` or the GitHub Actions postgres service container).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

DB_NAME="${ALIVE_RLS_TEST_DB:-alive_rls_test}"
PSQL="psql -v ON_ERROR_STOP=1"

echo "==> Dropping/creating disposable test database: $DB_NAME"
$PSQL -c "DROP DATABASE IF EXISTS ${DB_NAME};"
$PSQL -c "CREATE DATABASE ${DB_NAME};"

echo "==> Installing minimal auth shim (mirrors Supabase auth.uid()/auth.users contract)"
$PSQL -d "$DB_NAME" -f 00_auth_shim.sql

echo "==> Applying real project migrations from supabase/migrations/"
for f in ../../migrations/*.sql; do
  echo "    -> $f"
  $PSQL -d "$DB_NAME" -f "$f"
done

echo "==> Seeding two test users (triggers real handle_new_auth_user())"
$PSQL -d "$DB_NAME" -f 01_seed_users.sql

echo "==> Seeding one private row per RLS-protected table for each user"
$PSQL -d "$DB_NAME" -f 02_seed_private_data.sql

echo "==> Running RLS cross-tenant isolation assertions"
$PSQL -d "$DB_NAME" -f 03_rls_isolation_test.sql

echo "==> Cleaning up disposable test database"
$PSQL -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "==> RLS isolation test: ALL PASS"
