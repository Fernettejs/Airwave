-- CardStand — multi-tenant digital business card platform
-- Public signup. Each user owns and manages only their own cards.
-- Run this entire file in the Supabase SQL Editor on a fresh project.

-- ============================================================
-- CARDS TABLE
-- ============================================================
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    check (slug not in ('login','signup','dashboard','admin','api','assets','auth','app','account','settings','new')),
  is_active boolean not null default true,

  full_name text not null default '',
  title text not null default '',
  company text not null default '',
  tagline text not null default '',

  phone text not null default '',
  sms_number text not null default '',
  email text not null default '',
  website_url text not null default '',

  profile_photo_url text not null default '',
  banner_photo_url text not null default '',
  logo_url text not null default '',
  youtube_id text not null default '',
  video_heading text not null default '',

  primary_color text not null default '#EA580C',
  secondary_color text not null default '#1E3A8A',
  background_color text not null default '#EFF6FF',

  links_heading text not null default '',
  business_links jsonb not null default '[]'::jsonb,
  extra_buttons jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  review_links jsonb not null default '[]'::jsonb,

  calendar_url text not null default '',
  resources_url text not null default '',

  form_enabled boolean not null default false,
  form_heading text not null default '',
  form_subtext text not null default '',
  form_consent_text text not null default '',
  webhook_url text not null default '',
  form_success_message text not null default 'Sent. Check your messages.',

  footer_text text not null default ''
);

create index if not exists cards_slug_idx on public.cards (slug);
create index if not exists cards_owner_idx on public.cards (owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ============================================================
-- FREE-TIER CARD LIMIT  (change FREE_CARD_LIMIT to adjust)
-- ============================================================
create or replace function public.enforce_card_limit()
returns trigger language plpgsql as $$
declare
  cnt int;
  FREE_CARD_LIMIT constant int := 5;
begin
  select count(*) into cnt from public.cards where owner_id = new.owner_id;
  if cnt >= FREE_CARD_LIMIT then
    raise exception 'CARD_LIMIT_REACHED';
  end if;
  return new;
end $$;

drop trigger if exists cards_enforce_limit on public.cards;
create trigger cards_enforce_limit
  before insert on public.cards
  for each row execute function public.enforce_card_limit();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.cards enable row level security;

drop policy if exists "public read active cards" on public.cards;
create policy "public read active cards"
  on public.cards for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "owner read own cards" on public.cards;
create policy "owner read own cards"
  on public.cards for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "owner insert cards" on public.cards;
create policy "owner insert cards"
  on public.cards for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "owner update cards" on public.cards;
create policy "owner update cards"
  on public.cards for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owner delete cards" on public.cards;
create policy "owner delete cards"
  on public.cards for delete
  to authenticated
  using (owner_id = auth.uid());

-- ============================================================
-- STORAGE: public bucket, per-user folders (<user-id>/...)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('card-assets', 'card-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read card assets" on storage.objects;
create policy "public read card assets"
  on storage.objects for select
  using (bucket_id = 'card-assets');

drop policy if exists "owner upload card assets" on storage.objects;
create policy "owner upload card assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner update card assets" on storage.objects;
create policy "owner update card assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'card-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owner delete card assets" on storage.objects;
create policy "owner delete card assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
