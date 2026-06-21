-- Fix: replace (SELECT email FROM auth.users WHERE id = auth.uid())
-- with auth.email() which is accessible to all authenticated users.

DROP POLICY IF EXISTS "card member select" ON public.cards;
DROP POLICY IF EXISTS "card member update" ON public.cards;
DROP POLICY IF EXISTS "member read own membership" ON public.card_members;

CREATE POLICY "card member select" ON public.cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (cm.user_id = auth.uid() OR cm.email = auth.email())
    )
  );

CREATE POLICY "card member update" ON public.cards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (cm.user_id = auth.uid() OR cm.email = auth.email())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (cm.user_id = auth.uid() OR cm.email = auth.email())
    )
  );

CREATE POLICY "member read own membership" ON public.card_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR email = auth.email());