-- Break the RLS cycle:
-- cards → card_members (owner manage policy) → cards → infinite loop
--
-- Fix: replace the direct subquery with a SECURITY DEFINER function that
-- bypasses RLS when checking card ownership from within card_members policies.

DROP POLICY IF EXISTS "owner manage card_members" ON public.card_members;

CREATE OR REPLACE FUNCTION public.owns_card(p_card_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.cards WHERE id = p_card_id AND owner_id = auth.uid())
$$;

CREATE POLICY "owner manage card_members" ON public.card_members
  FOR ALL TO authenticated
  USING (public.owns_card(card_id))
  WITH CHECK (public.owns_card(card_id));