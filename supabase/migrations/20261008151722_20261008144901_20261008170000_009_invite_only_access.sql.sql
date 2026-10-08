/*
# Refresh the Supabase API schema cache for invite administration

1. Purpose
- The approval function already exists in the public schema with the expected
  `approve_request(uuid)` signature and authenticated execution permission.
- This migration refreshes PostgREST's schema cache so the browser can resolve
  the RPC endpoint after the invite-only access migration.

2. Security
- No tables, columns, policies, or permissions are changed.
- Existing admin-only authorization remains enforced inside the function.
*/

NOTIFY pgrst, 'reload schema';
