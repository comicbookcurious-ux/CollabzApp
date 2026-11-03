-- =====================================================================
-- Collabz · St-ate of Jazz pilot: one-time account setup
-- Run AFTER 008_st_ate_of_jazz_pilot.sql, and after these people have
-- signed up in the app (so their accounts exist):
--   · the St-ate of Jazz creator account (signed up as ARTIST)
--   · Steve and Nate (signed up as FAN with their own emails)
--   · Devin, the pilot facilitator (signed up as FAN)
--
-- 1. Change the emails and the survey link in the "settings" block below.
-- 2. Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again. It prints the invite codes at the end.
-- =====================================================================
do $$
declare
  -- ---------------- settings: change these ----------------
  v_jazz_email   text := 'stateofjazz@example.com';   -- the St-ate of Jazz creator account
  v_steve_email  text := 'steve@example.com';
  v_nate_email   text := 'nate@example.com';
  v_devin_email  text := 'devin@example.com';         -- admin: sees under-13s waiting for parent consent
  v_survey_url   text := '';                          -- e.g. https://forms.gle/xxxx (leave empty to add later)
  v_invite_only  boolean := true;                     -- only people with an invite code can sign up
  -- ---------------------------------------------------------
  v_jazz uuid; v_id uuid;
begin
  select id into v_jazz from public.profiles where lower(email) = lower(v_jazz_email);
  if v_jazz is null then raise exception 'No account with email %. Sign up the St-ate of Jazz account first (as ARTIST).', v_jazz_email; end if;
  if not public.is_artist(v_jazz) then raise exception '% is not a creator (artist) account', v_jazz_email; end if;

  -- Creator profile: name, bio, Music genre (photo, banner and welcome video are uploaded in the app: Edit profile)
  update public.profiles set
    display_name = 'St-ate of Jazz',
    bio = 'Steve & Nate are making their new jazz album with you. Listen to unreleased takes, vote on what makes the record, name the tracks and design the cover.',
    onboarded = true,
    survey_url = nullif(v_survey_url, '')
  where id = v_jazz;
  insert into public.artist_genres (artist_id, genre_id) values (v_jazz, 'music') on conflict do nothing;

  -- Managers: Steve and Nate log in as themselves and run the account
  foreach v_id in array array(select id from public.profiles where lower(email) in (lower(v_steve_email), lower(v_nate_email))) loop
    insert into public.creator_managers (artist_id, manager_id, added_by) values (v_jazz, v_id, v_jazz) on conflict do nothing;
  end loop;
  if (select count(*) from public.creator_managers where artist_id = v_jazz) < 2 then
    raise notice 'Steve and/or Nate have not signed up yet (% / %). Run this again once they have.', v_steve_email, v_nate_email;
  end if;

  -- Admin (facilitator)
  insert into public.app_admins (user_id) select id from public.profiles where lower(email) = lower(v_devin_email) on conflict do nothing;
  if not found and not exists (select 1 from public.app_admins a join public.profiles p on p.id = a.user_id where lower(p.email) = lower(v_devin_email)) then
    raise notice 'Devin (%) has not signed up yet. Run this again once he has.', v_devin_email;
  end if;

  -- Invite codes for the 40 testers (new users follow St-ate of Jazz automatically)
  insert into public.invite_codes (code, artist_id, label, max_uses, expires_at, created_by) values
    ('JAZZ-LISTEN', v_jazz, 'Group A · 30 listener / fan testers', 32, now() + interval '45 days', v_jazz),
    ('JAZZ-ADMIN',  v_jazz, 'Group B · 5 admin testers',            6,  now() + interval '45 days', v_jazz),
    ('JAZZ-LIVE',   v_jazz, 'Group C · 5 live gig testers',          6,  now() + interval '45 days', v_jazz)
  on conflict (code) do nothing;

  update public.app_settings set value = to_jsonb(v_invite_only), updated_at = now() where key = 'invite_only';
end $$;

-- Invite links: <your app address>/?invite=JAZZ-LISTEN (and JAZZ-ADMIN, JAZZ-LIVE)
select code, label, uses || ' of ' || max_uses as used, expires_at from public.invite_codes order by created_at;
