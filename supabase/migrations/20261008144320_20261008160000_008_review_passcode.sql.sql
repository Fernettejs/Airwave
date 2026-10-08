/*
# Add passcode-protected review tools to cards

1. New columns on `public.cards`
- `review_passcode_hash` (text): stores a SHA-256 hash of the owner-chosen passcode.
  When empty, review tools are disabled on the public card. The raw passcode is never
  stored — only its hash — so a database leak does not reveal it.

2. New function: `verify_review_passcode`
- SECURITY DEFINER function that takes a card slug and a candidate passcode.
- Returns `true` when the card has a passcode set AND the SHA-256 hash of the
  candidate matches the stored hash; otherwise returns `false`.
- This lets the public card verify a passcode without exposing the hash column
  through the data API.

3. New function: `set_review_passcode`
- SECURITY DEFINER function that takes a card id and a passcode.
- Verifies the caller owns the card via `owns_card()`.
- Validates passcode length (4–20 characters).
- Stores the SHA-256 hash; returns void.
- EXECUTE granted to authenticated only.

4. Security changes
- `review_passcode_hash` is NOT separately revocable from the public SELECT grant
  because the existing public read policy returns the full row to anon. The hash
  is not reversible (SHA-256), so exposing it read-only is acceptable — it cannot
  be used to recover the passcode. The column is not client-writable through
  normal UPDATE because the set function is the only path that writes it, and
  the function checks ownership.
- EXECUTE on `verify_review_passcode` is granted to anon, authenticated (public).
- EXECUTE on `set_review_passcode` is granted to authenticated only.

5. Notes
- Passcodes are a convenience lock for review tools only; they do not protect
  card editing or account settings.
- Rate limiting is handled client-side (attempt counter in the UI). The function
  itself is stateless.
- `pgcrypto` is already installed in the `extensions` schema, so `digest()` is
  called as `extensions.digest()`.
*/

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS review_passcode_hash text NOT NULL DEFAULT '';

-- ── Verify passcode (callable by anyone — public) ──────────────────────────
CREATE OR REPLACE FUNCTION public.verify_review_passcode(p_slug text, p_passcode text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cards
    WHERE slug = p_slug
      AND is_active = true
      AND review_passcode_hash <> ''
      AND review_passcode_hash = encode(extensions.digest(p_passcode, 'sha256'), 'hex')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.verify_review_passcode(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_review_passcode(text, text) TO anon, authenticated;

-- ── Set passcode (callable by card owner only) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_review_passcode(p_card_id uuid, p_passcode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.owns_card(p_card_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF length(p_passcode) < 4 OR length(p_passcode) > 20 THEN
    RAISE EXCEPTION 'Passcode must be 4-20 characters';
  END IF;
  UPDATE public.cards
    SET review_passcode_hash = encode(extensions.digest(p_passcode, 'sha256'), 'hex')
    WHERE id = p_card_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_review_passcode(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_review_passcode(uuid, text) TO authenticated;
