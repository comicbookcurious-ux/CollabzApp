-- =====================================================================
-- Collabz · Terms of Use agreement
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
-- New sign-ups must agree before using the app. Every account that already
-- exists when you run this is marked as having agreed ("legacy").
-- =====================================================================

alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;

-- Existing accounts: treat as already accepted
update public.profiles
   set terms_accepted_at = coalesce(created_at, now()),
       terms_version     = 'legacy'
 where terms_accepted_at is null
   and created_at <= now();

-- Let signed-in users record their own agreement
grant update (terms_accepted_at, terms_version) on public.profiles to authenticated;
