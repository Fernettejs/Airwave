/*
# Authorize admin approval from the verified session

1. Purpose
- Make the approval function callable through the signed-in admin session used by
  the protected edge function.
- Avoid relying on a separate privileged API client for this action.

2. Security
- The function requires `p_admin_id` to exactly match `auth.uid()`.
- It then verifies that the signed-in user is an admin through the admins table or
  the profiles administrator flag.
- Authenticated users receive only this narrowly authorized function; anonymous users
  remain blocked.
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
  IF auth.uid() IS NULL OR auth.uid() <> p_admin_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
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
    auth.uid(),
    1,
    now() + interval '14 days',
    'Approved: ' || v_req.full_name
  );

  UPDATE public.access_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_request_id AND status = 'pending';

  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_request_for_admin(uuid, uuid) FROM anon, service_role;
GRANT EXECUTE ON FUNCTION public.approve_request_for_admin(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
