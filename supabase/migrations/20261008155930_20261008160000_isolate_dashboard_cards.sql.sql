/*
# Isolate private card management from public card viewing

1. Purpose
- Stop authenticated users from listing every active card through the cards table.
- Keep public cards available by their exact public slug.

2. Database changes
- Replace the broad active-card SELECT policy with an anonymous-only policy removed from the table.
- Add `get_public_card(p_slug)` which returns one active card for a requested slug.

3. Security
- Authenticated dashboard access remains limited to administrators, card owners, and valid card members.
- Public card lookup is intentionally available to anonymous and authenticated callers by slug only.
- The public lookup function uses a fixed search path and does not accept a caller-supplied SQL fragment.
*/

DROP POLICY IF EXISTS "public read active cards" ON public.cards;

CREATE OR REPLACE FUNCTION public.get_public_card(p_slug text)
RETURNS SETOF public.cards
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.cards AS c
  WHERE c.slug = p_slug
    AND c.is_active = true
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_card(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_card(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_card(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
