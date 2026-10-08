/*
# Invite-only access: access_requests, invites tables, profile columns

## Overview
Converts AirWave from open signup to invite-only. New users can only get an account
via an approved access request or an admin-generated invite link. Existing users and
cards keep working unchanged.

## 1. New Tables

### invites
- id (uuid, PK)
- token (text, unique, unguessable — 32-char hex)
- email (text, nullable — null means open link)
- created_by (uuid, required, references auth.users)
- max_uses (int, default 1)
- use_count (int, default 0)
- expires_at (timestamptz, default now() + 14 days)
- revoked (bool, default false)
- note (text, default '')
- created_at (timestamptz, default now())
- RLS: only admins can SELECT, INSERT, UPDATE.

### access_requests
- id (uuid, PK)
- full_name, business_name, trade, city, email, phone (required)
- referral_source (optional)
- status (pending / approved / declined)
- created_at, reviewed_at, reviewed_by
- RLS: public can INSERT only. Admins can SELECT and UPDATE.

## 2. Modified Tables

### profiles
- Added invite_id (uuid, nullable, references invites.id)
- Added is_admin (boolean, default false)
- team@landlocalleads.com set as admin

## 3. Functions
- is_admin() updated to also check profiles.is_admin
- create_invite() — admin-only, creates invite, returns token
- approve_request() — admin-only, approves + creates single-use invite
- decline_request() — admin-only
- validate_invite() — public, checks if token is valid
- increment_invite_use() — service-role only, atomically increments use_count

## 4. Security
- access_requests: public INSERT only, admin SELECT/UPDATE
- invites: admin-only SELECT/INSERT/UPDATE
- profiles: admin can update, user can update own row
*/

-- ── invites table (must come before profiles.invite_id FK) ─────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  email text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses int NOT NULL DEFAULT 1,
  use_count int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  revoked boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin select invites" ON public.invites;
CREATE POLICY "admin select invites" ON public.invites
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin insert invites" ON public.invites;
CREATE POLICY "admin insert invites" ON public.invites
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin update invites" ON public.invites;
CREATE POLICY "admin update invites" ON public.invites
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── profiles: add invite_id and is_admin columns ──────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES public.invites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set team@landlocalleads.com as admin
UPDATE public.profiles SET is_admin = true
  WHERE email = 'team@landlocalleads.com';

-- ── access_requests table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  business_name text NOT NULL,
  trade text NOT NULL,
  city text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  referral_source text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert access_requests" ON public.access_requests;
CREATE POLICY "public insert access_requests" ON public.access_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    full_name <> '' AND business_name <> '' AND trade <> ''
    AND city <> '' AND email <> '' AND phone <> ''
  );

DROP POLICY IF EXISTS "admin select access_requests" ON public.access_requests;
CREATE POLICY "admin select access_requests" ON public.access_requests
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin update access_requests" ON public.access_requests;
CREATE POLICY "admin update access_requests" ON public.access_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Update is_admin() to also check profiles.is_admin ─────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
$$;

-- ── create_invite function (admin-only) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_invite(
  p_email text,
  p_max_uses int DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL,
  p_note text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_max_uses < 1 OR p_max_uses > 100 THEN
    RAISE EXCEPTION 'max_uses must be 1-100';
  END IF;
  v_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.invites (token, email, created_by, max_uses, expires_at, note)
  VALUES (v_token, NULLIF(p_email, ''), auth.uid(), p_max_uses, COALESCE(p_expires_at, now() + interval '14 days'), p_note);
  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invite(text, int, timestamptz, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invite(text, int, timestamptz, text) TO authenticated;

-- ── approve_request function (admin-only) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_request(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req access_requests%ROWTYPE;
  v_token text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_req FROM public.access_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;
  v_token := encode(gen_random_bytes(16), 'hex');
  INSERT INTO public.invites (token, email, created_by, max_uses, expires_at, note)
  VALUES (v_token, lower(v_req.email), auth.uid(), 1, now() + interval '14 days', 'Approved: ' || v_req.full_name);
  UPDATE public.access_requests
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_request_id;
  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_request(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_request(uuid) TO authenticated;

-- ── decline_request function (admin-only) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.decline_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.access_requests
    SET status = 'declined', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_request_id AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decline_request(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_request(uuid) TO authenticated;

-- ── validate_invite function (public, read-only check) ─────────────────────
CREATE OR REPLACE FUNCTION public.validate_invite(p_token text)
RETURNS TABLE(id uuid, email text, max_uses int, use_count int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, max_uses, use_count
  FROM public.invites
  WHERE token = p_token
    AND revoked = false
    AND expires_at > now()
    AND use_count < max_uses
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_invite(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon, authenticated;

-- ── increment_invite_use function (service-role only) ──────────────────────
CREATE OR REPLACE FUNCTION public.increment_invite_use(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.invites
    SET use_count = use_count + 1
    WHERE token = p_token
      AND revoked = false
      AND expires_at > now()
      AND use_count < max_uses
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_invite_use(text) FROM anon, authenticated;

-- ── Profile update policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin update profiles" ON public.profiles;
CREATE POLICY "admin update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Allow admin to read all profile columns (already has SELECT policy, but make sure)
-- Existing: "own profile" and "admin reads all profiles" — these are sufficient.
