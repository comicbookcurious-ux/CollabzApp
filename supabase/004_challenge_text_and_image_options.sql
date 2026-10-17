-- Collabz · 004: image answer options for multiple-choice challenges, and text-answer challenges
-- Run once in Supabase → SQL Editor (safe to run again).

-- 1. New challenge type: fans type their own answer
alter type public.challenge_type add value if not exists 'text';

-- 2. Optional image for each multiple-choice option (same order as "options"; '' = no image)
alter table public.challenges add column if not exists option_images text[] not null default '{}';
alter table public.challenges drop constraint if exists challenges_option_images_check;
alter table public.challenges add constraint challenges_option_images_check
  check (coalesce(array_length(option_images, 1), 0) <= 4);

grant insert (option_images) on public.challenges to authenticated;
grant update (option_images) on public.challenges to authenticated;

-- 3. Submitting: text answers are stored in "answer" (1–500 characters)
create or replace function public.submit_challenge(p_challenge_id uuid, p_answer text default null, p_media_url text default null)
returns public.submissions language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c public.challenges;
  s public.submissions;
  v_text boolean;
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if public.is_artist(v_uid) then raise exception 'Only fans can take part in challenges'; end if;

  select * into c from public.challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found'; end if;
  v_text := c.type::text = 'text';
  if exists (select 1 from public.submissions where challenge_id = c.id and fan_id = v_uid) then
    raise exception 'You already took part in this challenge';
  end if;
  if (select count(*) from public.submissions where challenge_id = c.id) >= c.max_submissions then
    raise exception 'This challenge has reached its submission limit';
  end if;
  if c.type = 'mc' then
    if p_answer is null or not (p_answer = any (c.options)) then raise exception 'Pick one of the answer options'; end if;
  elsif v_text then
    p_answer := btrim(coalesce(p_answer, ''));
    if p_answer = '' then raise exception 'Type your answer first'; end if;
    if char_length(p_answer) > 500 then raise exception 'Keep your answer to 500 characters or fewer'; end if;
  elsif coalesce(p_media_url, '') = '' then
    raise exception 'Upload your % first', c.type;
  end if;

  insert into public.submissions (challenge_id, fan_id, answer, media_url)
  values (c.id, v_uid,
          case when c.type = 'mc' or v_text then p_answer end,
          case when c.type <> 'mc' and not v_text then p_media_url end)
  returning * into s;

  update public.wallets set
    silver = silver + case when c.reward_coin = 'silver' then c.reward_amount else 0 end,
    gold   = gold   + case when c.reward_coin = 'gold'   then c.reward_amount else 0 end
  where user_id = v_uid;

  perform public.notify(c.artist_id,
    (select display_name from public.profiles where id = v_uid) || ' submitted to "' || c.title || '".',
    jsonb_build_object('type', 'score', 'id', c.artist_id, 'cat', case when c.event_id is null then 'challenge' else 'showday' end, 'sel', c.id));
  return s;
end $$;
