-- ── 1. Fix mutable search_path on all affected functions ─────────────────────
--    Empty search_path prevents search-path-based privilege escalation.
--    All table/schema references are already fully qualified.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_card_limit()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cnt int;
  FREE_CARD_LIMIT constant int := 5;
BEGIN
  SELECT count(*) INTO cnt FROM public.cards WHERE owner_id = NEW.owner_id;
  IF cnt >= FREE_CARD_LIMIT THEN
    RAISE EXCEPTION 'CARD_LIMIT_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_card(p_card_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.cards WHERE id = p_card_id AND owner_id = auth.uid())
$$;


-- ── 2. Revoke direct RPC execution of SECURITY DEFINER functions ──────────────
--    These functions are used only by triggers or RLS policies — never by
--    client code via /rest/v1/rpc. Revoking EXECUTE from anon/authenticated
--    closes the RPC endpoint while leaving trigger/RLS behaviour intact.

REVOKE EXECUTE ON FUNCTION public.handle_new_user()   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin()           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_card(uuid)      FROM anon, authenticated;


-- ── 3. Fix storage bucket SELECT policy (prevents anonymous file listing) ─────
--    The old broad policy let any client LIST every file in card-assets.
--    Public buckets don't need a SELECT policy for URL-based access; replacing
--    it with an owner-scoped policy stops listing while keeping uploads working.

DROP POLICY IF EXISTS "public read card assets" ON storage.objects;

CREATE POLICY "owner read own card assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'card-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
