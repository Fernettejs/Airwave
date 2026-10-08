/*
# Refresh the admin approval API

1. Purpose
- Refresh the hosted database API schema so the already-secured approval function is
  available immediately to the signed-in admin interface.

2. Security
- No tables, columns, or policies are changed.
- The existing approval function continues to require an administrator identity.
- The function remains unavailable to anonymous users.
*/

NOTIFY pgrst, 'reload schema';
