-- Admins table
CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own admin row" ON public.admins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- is_admin() helper — SECURITY DEFINER so it bypasses admins RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
$$;

-- Profiles table (email cache so admin can see card owners)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO UPDATE SET email = new.email;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Card members table (admin can grant access to a card by email)
CREATE TABLE public.card_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, email)
);
ALTER TABLE public.card_members ENABLE ROW LEVEL SECURITY;

-- Admin has full access to card_members
CREATE POLICY "admin manage card_members" ON public.card_members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Card owner can manage members of their own cards
CREATE POLICY "owner manage card_members" ON public.card_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards WHERE id = card_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards WHERE id = card_id AND owner_id = auth.uid()));

-- Members can see their own membership record
CREATE POLICY "member read own membership" ON public.card_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ── Cards RLS: add admin full access ─────────────────────────────────────────
CREATE POLICY "admin full access on cards" ON public.cards
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Cards RLS: card members can read cards they're added to
CREATE POLICY "card member select" ON public.cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (
          cm.user_id = auth.uid()
          OR cm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- Cards RLS: card members can update cards they're added to
CREATE POLICY "card member update" ON public.cards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (
          cm.user_id = auth.uid()
          OR cm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.card_members cm
      WHERE cm.card_id = id
        AND (
          cm.user_id = auth.uid()
          OR cm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    )
  );

-- Seed: make team@landlocalleads.com an admin
INSERT INTO public.admins (user_id)
VALUES ('7bc0ce8a-09e4-4396-98d4-4bdaf90c6b43')
ON CONFLICT DO NOTHING;
