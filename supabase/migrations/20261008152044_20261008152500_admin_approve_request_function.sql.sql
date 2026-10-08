/*
# Add server-routed admin approval

1. Purpose
- Provide a stable server endpoint for approving access requests when the browser's
  direct RPC route is unavailable in the hosted API schema.
- Keep authorization in the database function and require the verified admin user ID
  as the caller identity supplied by the protected edge function.

2. Database Changes
- Add `approve_request_for_admin(p_request_id uuid, p_admin_id uuid)` returning the
  newly created invite token.
- The function creates a single-use invite, marks only a pending request as approved,
  and records the verified admin as reviewer.

3. Security
- The function runs with database owner privileges so it can perform the two writes
  without exposing table write access to the browser.
- The function verifies that `p_admin_id` belongs to an administrator before changing
  anything.
- Direct execution is revoked from anonymous and authenticated browser roles and
  granted only to the service role used by the protected edge function.
*/

CREATE OR REPLACE FUNCTION public.approve_request_for_admin(
  p_request_id uuid,
  p_admin_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.access_requests%ROWTYPE;
  v_token text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = p_admin_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_req
  FROM public.access_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.invites (token, email, created_by, max_uses, expires_at, note)
  VALUES (
    v_token,
    lower(v_req.email),
    p_admin_id,
    1,
    now() + interval '14 days',
    'Approved: ' || v_req.full_name
  );

  UPDATE public.access_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id
  WHERE id = p_request_id AND status = 'pending';

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_request_for_admin(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_request_for_admin(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
