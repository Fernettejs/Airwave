# CardStand

Self-serve digital business card platform. Anyone signs up free, builds their own cards, and shares them as a link, a QR code, or a tap card. Each card is live at `yourdomain.com/slug` the moment it's saved — no rebuilds.

Stack: React 18 + Vite + TypeScript + Tailwind v4 + Supabase (database, auth, storage).

## How it works

- **Public landing** at `/` with a signup call to action.
- **Free signup** at `/signup`, sign in at `/login`. Email + password. No public-admin model — every user is their own admin.
- **Dashboard** at `/dashboard`: a user sees and manages only their own cards. Create from a template, edit, duplicate, activate/deactivate, delete, copy URL, download QR. Shows usage against the free card limit.
- **Card editor** at `/dashboard/cards/:id`: every field, image upload, color pickers, reorderable link lists, and a live phone-frame preview.
- **Public card** at `/:slug`: the card itself — Save Contact (vCard), call/text/email/website, business links, extra buttons, lead form (POSTs to that card's webhook), video, share, socials, footer. Empty sections are skipped.

## Security model (read this)

This is a public-signup app, so Row Level Security is doing the heavy lifting. The `001_init.sql` migration sets it up:

- Every card has an `owner_id` that defaults to the signed-in user.
- **Anyone** can read a card only if `is_active = true` (the public pages).
- A signed-in user can read, edit, and delete **only their own** cards.
- Storage files live in a per-user folder (`<user-id>/...`); a user can only write inside their own folder. Everyone can read images (cards are public).
- A database trigger caps each account at **5 cards** (the free limit). Change `FREE_CARD_LIMIT` in `001_init.sql` and the matching `FREE_CARD_LIMIT` in `src/admin/CardList.tsx` to adjust.
- Reserved words (`login`, `signup`, `dashboard`, etc.) can never be claimed as a slug, enforced both in the app and in the table's check constraint.

After deploying, verify in an incognito window: you should be able to view an active card by slug, but not reach `/dashboard` or write anything without signing in. Sign up a second test account and confirm it cannot see the first account's cards.

## Setup (one time, ~15 minutes)

### 1. Supabase project
1. Create a project at supabase.com.
2. **SQL Editor** → paste all of `supabase/migrations/001_init.sql` → run. This creates the table, RLS, storage bucket and policies, the card-limit trigger, and reserved-slug guard.

### 2. Auth settings
In **Authentication → Sign In / Up → Email**:
- Leave signup **enabled** (this is the whole point — public self-serve).
- **Confirm email**: your choice. ON is safer against junk signups but adds a confirm-email step. OFF is the fastest onboarding (users land in the dashboard immediately). The signup screen handles both — if confirmation is on, it tells the user to check their email.
- Set the **Site URL** (and any redirect URLs) to your deployed domain so confirmation links point to the right place.

### 3. Environment variables
Copy `.env.example` to `.env`, fill from Supabase **Settings → API**:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
The anon key is safe in the frontend — RLS is what protects the data.

### 4. Run locally
```
npm install
npm run dev
```
Open http://localhost:5173 → sign up → make a card → open `/:slug` in another tab.

## Deploy

### Netlify (simplest)
1. Push to a GitHub repo.
2. Netlify → New site from Git. Build `npm run build`, publish `dist`.
3. Add the two `VITE_` env vars under Environment variables.
4. `netlify.toml` and `public/_redirects` already make `/:slug` work on refresh.
5. Point your domain at the site and set it as the Supabase Site URL.

Vercel (`vercel.json`) and Bolt import both work the same way.

## The fast-creation flow

A new user's path is built to be quick: sign up → land on an empty dashboard → pick a template (Home services pro, Realtor, Minimal, or Blank) → editor opens pre-filled → fill in details, upload a photo, save → copy the URL or download the QR. Templates live in `src/lib/templates.ts`; add your own by appending to that array.

## Leads

Each card carries its own webhook URL. Submissions POST JSON:
`{ full_name, business_name, email, phone, consent, card_slug, source }`.
Users paste their own GoHighLevel (or Zapier, Make, etc.) inbound webhook into the card's Lead form section. Nothing about leads is stored in CardStand — it's a pass-through.

## Known limit and the fix path

Texted card links show a generic preview instead of the person's photo, because iMessage and Facebook don't run JavaScript and this is a static SPA. The card works fine; only the preview thumbnail is affected. Fix when it matters: a Netlify or Supabase Edge Function that intercepts `/:slug`, reads the row, and injects per-card Open Graph tags. ~40 lines. Worth doing before promoting the product heavily; not required to launch.

## Project map
```
supabase/migrations/001_init.sql   schema, RLS, storage, limits — run in SQL Editor
src/pages/Landing.tsx              public marketing page
src/pages/PublicCard.tsx           /:slug loader
src/admin/Auth.tsx                 login + signup
src/admin/Protected.tsx            route guard
src/admin/CardList.tsx             user dashboard
src/admin/CardEditor.tsx           create/edit + live preview
src/admin/fields.tsx               form building blocks (per-user image upload, repeater, colors)
src/components/CardView.tsx        the card (shared by public page + preview)
src/lib/templates.ts               starter templates
src/lib/vcard.ts                   vCard generation
```
