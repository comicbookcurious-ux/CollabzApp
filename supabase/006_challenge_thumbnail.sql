-- Collabz · 006: optional thumbnail image on challenges (shown when a challenge is opened)
-- Run once in Supabase → SQL Editor (safe to run again).
alter table public.challenges add column if not exists thumbnail_url text not null default '';
grant insert (thumbnail_url) on public.challenges to authenticated;
grant update (thumbnail_url) on public.challenges to authenticated;
