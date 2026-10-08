/*
# Route admin approval through the private server connection

1. Purpose
- Restore the intended execution model for the protected approval edge function.
- The edge function validates the signed-in user's access token before calling this
  database function through the private service connection.

2. Security
- Anonymous and normal authenticated browser clients cannot execute this function.
- Only the service role can execute it.
- The function still verifies that the supplied administrator ID belongs to an
  administrator record before creating an invite or changing a request.
- The request is locked while it is approved so a double click cannot create two
  approval invites.
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
