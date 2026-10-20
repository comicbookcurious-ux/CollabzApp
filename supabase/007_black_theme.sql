-- Collabz · 007: adds the Black page theme for artists
-- Run once in Supabase → SQL Editor (safe to run again).
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('default','black','midnight','ember','forest','lavender','peach','sky'));
