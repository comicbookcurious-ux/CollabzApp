-- =====================================================================
-- Collabz · 008: St-ate of Jazz pilot
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs schema.sql and 002–007 to have been run first.
--
-- Adds:
--   · co-managers: several logins can run one creator account
--   · profile banner image and a feedback survey link per creator
--   · "Listen and vote" challenges with audio clips (MP3 etc. in the
--     submissions bucket)
--   · voting windows (opens / closes) enforced on the server
--   · "Elect winner" for multiple-choice and listen-and-vote challenges
--   · coins for voting on entries (1 silver per entry, once)
--   · exact-duplicate image flag on submissions
--   · quick QR voting for guests (one vote per phone) + live results
--   · Co-Producer badges and public digital liner notes
--   · invite-only sign-up with invite codes, age check at sign-up and
--     parent consent for under-13s (kept out of public feeds until then)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. New challenge type (used as text below, so this file runs in one go)
-- ---------------------------------------------------------------------
alter type public.challenge_type add value if not exists 'listen';

-- ---------------------------------------------------------------------
-- 1. Profiles: banner, survey link, under-13 restriction
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists survey_url text;
alter table public.profiles add column if not exists restricted boolean not null default false;  -- under 13, waiting for parent consent
grant update (banner_url) on public.profiles to authenticated;

-- Private sign-up details. Nobody reads this table directly: only the
-- functions below (the consent link is never shown to the child).
create table if not exists public.profile_private (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  birth_date        date,
  parent_email      text,
  consent_token     uuid not null default gen_random_uuid(),
  parent_name       text,
  parent_consent_at timestamptz,
  created_at        timestamptz not null default now()
);
alter table public.profile_private enable row level security;
revoke all on public.profile_private from anon, authenticated;

-- App admins (e.g. the pilot facilitator). Add with:
--   insert into public.app_admins (user_id) select id from auth.users where email = 'devin@example.com';
create table if not exists public.app_admins (
  user_id  uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke insert, update, delete on public.app_admins from anon, authenticated;
drop policy if exists app_admins_read_own on public.app_admins;
create policy app_admins_read_own on public.app_admins for select to authenticated using (user_id = auth.uid());

-- App-wide settings, e.g. invite_only
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
revoke insert, update, delete on public.app_settings from anon, authenticated;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using (true);
insert into public.app_settings (key, value) values ('invite_only', 'false') on conflict (key) do nothing;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = uid);
$$;

-- ---------------------------------------------------------------------
-- 2. Co-managers: Steve and Nate each log in as themselves and manage
--    the one "St-ate of Jazz" creator account
-- ---------------------------------------------------------------------
create table if not exists public.creator_managers (
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid not null references public.profiles (id) on delete cascade,
  added_by   uuid references public.profiles (id) on delete set null,
  added_at   timestamptz not null default now(),
  primary key (artist_id, manager_id),
  check (artist_id <> manager_id)
);
create index if not exists creator_managers_manager_idx on public.creator_managers (manager_id);
alter table public.creator_managers enable row level security;
revoke insert, update, delete on public.creator_managers from anon, authenticated;
drop policy if exists creator_managers_read on public.creator_managers;
create policy creator_managers_read on public.creator_managers for select to authenticated using (true);

-- The account itself, or one of its managers
create or replace function public.can_manage(p_artist uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    auth.uid() = p_artist
    or exists (select 1 from public.creator_managers where artist_id = p_artist and manager_id = auth.uid())
  );
$$;

-- Owner (or an admin) adds a manager by the email they signed up with
create or replace function public.add_manager(p_artist uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (auth.uid() = p_artist or public.is_admin()) then raise exception 'Only the account owner can add managers'; end if;
  if not public.is_artist(p_artist) then raise exception 'Managers can only be added to a creator account'; end if;
  select id into v_id from public.profiles where lower(email) = lower(btrim(p_email));
  if v_id is null then raise exception 'No Collabz account uses %. Ask them to sign up first.', btrim(p_email); end if;
  if v_id = p_artist then raise exception 'That is the account itself'; end if;
  insert into public.creator_managers (artist_id, manager_id, added_by) values (p_artist, v_id, auth.uid()) on conflict do nothing;
  perform public.notify(v_id, 'You can now manage ' || (select display_name from public.profiles where id = p_artist) || ' on Collabz.',
    jsonb_build_object('type', 'artist', 'id', p_artist, 'tab', 'challenges'));
  return v_id;
end $$;

create or replace function public.remove_manager(p_artist uuid, p_manager uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (auth.uid() = p_artist or auth.uid() = p_manager or public.is_admin()) then raise exception 'Only the account owner can remove managers'; end if;
  delete from public.creator_managers where artist_id = p_artist and manager_id = p_manager;
end $$;

-- Managers also get the account's notifications (new submissions, claims…)
create or replace function public.copy_notification_to_managers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, body, link)
  select m.manager_id, '[' || p.display_name || '] ' || new.body, new.link
  from public.creator_managers m join public.profiles p on p.id = m.artist_id
  where m.artist_id = new.user_id
    and not exists (select 1 from public.creator_managers x where x.artist_id = m.manager_id);  -- no chains
  return new;
end $$;
drop trigger if exists trg_notifications_managers on public.notifications;
create trigger trg_notifications_managers after insert on public.notifications
  for each row execute function public.copy_notification_to_managers();

-- Managers can write the account's content (the account must be a creator)
create or replace function pg_temp.pol(p_name text, p_table text, p_cmd text, p_using text, p_check text default null)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', p_name, p_table);
  execute format('create policy %I on public.%I for %s to authenticated %s %s', p_name, p_table, p_cmd,
    case when p_using is not null then 'using (' || p_using || ')' else '' end,
    case when p_check is not null then 'with check (' || p_check || ')' else '' end);
end $$;

do $$
begin
  perform pg_temp.pol('events_insert_artist', 'showday_events', 'insert', null, 'public.can_manage(artist_id) and public.is_artist(artist_id)');
  perform pg_temp.pol('events_update_own',    'showday_events', 'update', 'public.can_manage(artist_id)', 'public.can_manage(artist_id)');
  perform pg_temp.pol('events_delete_own',    'showday_events', 'delete', 'public.can_manage(artist_id)');

  perform pg_temp.pol('challenges_insert_artist', 'challenges', 'insert', null,
    'public.can_manage(artist_id) and public.is_artist(artist_id) and (event_id is null or exists (select 1 from public.showday_events e where e.id = event_id and e.artist_id = challenges.artist_id))');
  perform pg_temp.pol('challenges_update_own', 'challenges', 'update', 'public.can_manage(artist_id)',
    'public.can_manage(artist_id) and (event_id is null or exists (select 1 from public.showday_events e where e.id = event_id and e.artist_id = challenges.artist_id))');
  perform pg_temp.pol('challenges_delete_own', 'challenges', 'delete', 'public.can_manage(artist_id)');

  perform pg_temp.pol('lotteries_insert_artist', 'lotteries', 'insert', null, 'public.can_manage(artist_id) and public.is_artist(artist_id)');
  perform pg_temp.pol('lotteries_update_own',    'lotteries', 'update', 'public.can_manage(artist_id)', 'public.can_manage(artist_id)');
  perform pg_temp.pol('lotteries_delete_own',    'lotteries', 'delete', 'public.can_manage(artist_id)');

  perform pg_temp.pol('games_insert_artist', 'games', 'insert', null, 'public.can_manage(artist_id) and public.is_artist(artist_id)');
  perform pg_temp.pol('games_update_own',    'games', 'update', 'public.can_manage(artist_id)', 'public.can_manage(artist_id)');
  perform pg_temp.pol('games_delete_own',    'games', 'delete', 'public.can_manage(artist_id)');
  perform pg_temp.pol('game_answers_owner',  'game_answers', 'select', 'exists (select 1 from public.games g where g.id = game_id and public.can_manage(g.artist_id))');
end $$;

-- Same owner checks inside the existing functions, now "owner or manager"
create or replace function public.pick_winner(p_challenge_id uuid, p_fan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; v_link jsonb;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or not public.can_manage(c.artist_id) then raise exception 'Only the artist can pick a winner'; end if;
  if c.winner_claimed then raise exception 'The prize was already claimed, so the winner can''t change'; end if;
  if not exists (select 1 from public.submissions where challenge_id = c.id and fan_id = p_fan_id) then
    raise exception 'That fan has no submission for this challenge';
  end if;
  v_link := jsonb_build_object('type', 'artist', 'id', c.artist_id, 'tab', case when c.event_id is null then 'challenges' else 'showday' end, 'open', c.id);
  if c.winner_id is not null and c.winner_id <> p_fan_id then
    perform public.notify(c.winner_id, 'The winner for "' || c.title || '" was changed by the artist.', v_link);
  end if;
  update public.challenges set winner_id = p_fan_id where id = c.id;
  perform public.notify(p_fan_id, 'YOU WON "' || c.title || '"! Claim your prize now.', v_link);
end $$;

create or replace function public.clear_winner(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or not public.can_manage(c.artist_id) then raise exception 'Only the artist can change the winner'; end if;
  if c.winner_claimed then raise exception 'The prize was already claimed'; end if;
  if c.winner_id is not null then
    perform public.notify(c.winner_id, 'The winner for "' || c.title || '" was changed by the artist.', null);
  end if;
  update public.challenges set winner_id = null where id = c.id;
end $$;

create or replace function public.draw_lottery(p_lottery_id uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare l public.lotteries; e record; v_link jsonb;
begin
  select * into l from public.lotteries where id = p_lottery_id for update;
  if not found or not public.can_manage(l.artist_id) then raise exception 'Only the artist can draw this lottery'; end if;
  if exists (select 1 from public.lottery_winners where lottery_id = l.id and claimed_at is not null) then
    raise exception 'A winner already claimed, so the lottery can''t be redrawn';
  end if;
  if not exists (select 1 from public.lottery_entries where lottery_id = l.id and entries > 0) then
    raise exception 'There are no entries yet';
  end if;
  delete from public.lottery_winners where lottery_id = l.id;
  insert into public.lottery_winners (lottery_id, fan_id)
  select l.id, fan_id from public.lottery_entries
  where lottery_id = l.id and entries > 0
  order by -ln(1 - random()) / entries
  limit l.winner_count;
  update public.lotteries set drawn_at = now() where id = l.id;
  v_link := jsonb_build_object('type', 'artist', 'id', l.artist_id, 'tab', 'lottery', 'open', l.id);
  for e in select le.fan_id, (w.fan_id is not null) as won
           from public.lottery_entries le
           left join public.lottery_winners w on w.lottery_id = le.lottery_id and w.fan_id = le.fan_id
           where le.lottery_id = l.id loop
    perform public.notify(e.fan_id,
      case when e.won then 'YOU WON the lottery "' || l.title || '"! Management will email you about claiming it.'
           else 'The "' || l.title || '" draw is done. Not this time, thanks for entering!' end, v_link);
  end loop;
  return query select fan_id from public.lottery_winners where lottery_id = l.id;
end $$;

create or replace function public.save_game_questions(p_game uuid, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; q jsonb; i int := 0; v_id uuid; v_opts text[]; v_ans int;
begin
  select * into g from public.games where id = p_game;
  if not found or not public.can_manage(g.artist_id) then raise exception 'You can only edit your own games'; end if;
  if g.kind not in ('trivia', 'quiz') then raise exception 'Only Trivia and Quiz games have questions'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 1 and 20 then raise exception 'Add 1 to 20 questions'; end if;
  delete from public.game_questions where game_id = p_game;
  for q in select * from jsonb_array_elements(p_questions) loop
    v_opts := array(select jsonb_array_elements_text(q -> 'opts'));
    v_ans := (q ->> 'ans')::int;
    if v_ans is null or v_ans < 0 or v_ans >= coalesce(array_length(v_opts, 1), 0) then raise exception 'Question % needs a correct answer', i + 1; end if;
    insert into public.game_questions (game_id, position, question, options) values (p_game, i, btrim(q ->> 'q'), v_opts) returning id into v_id;
    insert into public.game_answers (question_id, game_id, correct) values (v_id, p_game, v_ans);
    i := i + 1;
  end loop;
  if g.kind = 'quiz' and g.pass_mark > i then update public.games set pass_mark = i where id = p_game; end if;
end $$;

create or replace function public.pick_game_winner(p_game uuid, p_fan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or not public.can_manage(g.artist_id) then raise exception 'Only the game’s artist can pick prize winners'; end if;
  if not exists (select 1 from public.game_plays where game_id = p_game and fan_id = p_fan and won) then raise exception 'That fan hasn’t won this game'; end if;
  if (select count(*) from public.game_prize_winners where game_id = p_game) >= g.winner_count then raise exception 'All % prizes have been given', g.winner_count; end if;
  insert into public.game_prize_winners (game_id, fan_id) values (p_game, p_fan) on conflict do nothing;
  perform public.notify(p_fan, 'YOU WON the prize for "' || g.title || '"! Claim it on the Games tab.',
    jsonb_build_object('type', 'artist', 'id', g.artist_id, 'tab', 'games'));
end $$;

create or replace function public.unpick_game_winner(p_game uuid, p_fan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game;
  if not found or not public.can_manage(g.artist_id) then raise exception 'Only the game’s artist can change prize winners'; end if;
  delete from public.game_prize_winners where game_id = p_game and fan_id = p_fan and claimed_at is null;
  if not found then raise exception 'That prize was already claimed'; end if;
  perform public.notify(p_fan, 'The prize winners for "' || g.title || '" were changed by the artist.', null);
end $$;

-- ---------------------------------------------------------------------
-- 3. Challenges: listen-and-vote audio, voting windows, elected option,
--    quick QR voting
-- ---------------------------------------------------------------------
alter table public.challenges add column if not exists option_audio text[] not null default '{}';  -- audio clip per option ('' = none)
alter table public.challenges add column if not exists opens_at timestamptz;                       -- null = open now
alter table public.challenges add column if not exists closes_at timestamptz;                      -- null = no closing time
alter table public.challenges add column if not exists allow_guest boolean not null default false; -- quick QR voting without sign-up
alter table public.challenges add column if not exists elected_option text;
alter table public.challenges add column if not exists elected_at timestamptz;

alter table public.challenges drop constraint if exists challenges_option_audio_check;
alter table public.challenges add constraint challenges_option_audio_check check (coalesce(array_length(option_audio, 1), 0) <= 4);
alter table public.challenges drop constraint if exists challenges_listen_check;
alter table public.challenges add constraint challenges_listen_check
  check (type::text <> 'listen' or coalesce(array_length(options, 1), 0) between 2 and 4);
alter table public.challenges drop constraint if exists challenges_window_check;
alter table public.challenges add constraint challenges_window_check
  check (opens_at is null or closes_at is null or closes_at > opens_at);

grant insert (option_audio, opens_at, closes_at, allow_guest) on public.challenges to authenticated;
grant update (option_audio, opens_at, closes_at, allow_guest) on public.challenges to authenticated;

create or replace function public.challenge_window_error(c public.challenges)
returns text language sql stable as $$
  select case
    when c.elected_option is not null then 'Voting has closed: the winner has been elected'
    when c.opens_at is not null and now() < c.opens_at then 'Voting opens ' || to_char(c.opens_at at time zone 'UTC', 'DD Mon HH24:MI') || ' UTC'
    when c.closes_at is not null and now() >= c.closes_at then 'Voting has closed'
  end;
$$;

-- Submissions: exact-duplicate image flag
alter table public.submissions add column if not exists media_hash text;     -- SHA-256 of the uploaded file
alter table public.submissions add column if not exists duplicate_of uuid references public.submissions (id) on delete set null;
create index if not exists submissions_media_hash_idx on public.submissions (media_hash) where media_hash is not null;

-- Fan submits (also the vote in Listen and vote / multiple choice)
drop function if exists public.submit_challenge(uuid, text, text);
create or replace function public.submit_challenge(p_challenge_id uuid, p_answer text default null, p_media_url text default null, p_media_hash text default null)
returns public.submissions language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c public.challenges;
  s public.submissions;
  v_type text;
  v_choice boolean;
  v_err text;
  v_dup uuid;
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if public.is_artist(v_uid) then raise exception 'Only fans can take part in challenges'; end if;

  select * into c from public.challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found'; end if;
  if public.can_manage(c.artist_id) then raise exception 'You manage this account, so you can''t take part in its challenges'; end if;
  v_type := c.type::text;
  v_choice := v_type in ('mc', 'listen');
  v_err := public.challenge_window_error(c);
  if v_err is not null then raise exception '%', v_err; end if;
  if exists (select 1 from public.submissions where challenge_id = c.id and fan_id = v_uid) then
    raise exception 'You already took part in this challenge';
  end if;
  if (select count(*) from public.submissions where challenge_id = c.id) >= c.max_submissions then
    raise exception 'This challenge has reached its submission limit';
  end if;
  if v_choice then
    if p_answer is null or not (p_answer = any (c.options)) then raise exception 'Pick one of the answer options'; end if;
  elsif v_type = 'text' then
    p_answer := btrim(coalesce(p_answer, ''));
    if p_answer = '' then raise exception 'Type your answer first'; end if;
    if char_length(p_answer) > 500 then raise exception 'Keep your answer to 500 characters or fewer'; end if;
  elsif coalesce(p_media_url, '') = '' then
    raise exception 'Upload your % first', v_type;
  end if;

  if not v_choice and v_type <> 'text' and p_media_hash ~ '^[0-9a-f]{64}$' then
    select s2.id into v_dup from public.submissions s2 join public.challenges c2 on c2.id = s2.challenge_id
    where s2.media_hash = p_media_hash and c2.artist_id = c.artist_id
    order by s2.created_at limit 1;
  else
    p_media_hash := null;
  end if;

  insert into public.submissions (challenge_id, fan_id, answer, media_url, media_hash, duplicate_of)
  values (c.id, v_uid,
          case when v_choice or v_type = 'text' then p_answer end,
          case when not v_choice and v_type <> 'text' then p_media_url end,
          p_media_hash, v_dup)
  returning * into s;

  update public.wallets set
    silver = silver + case when c.reward_coin = 'silver' then c.reward_amount else 0 end,
    gold   = gold   + case when c.reward_coin = 'gold'   then c.reward_amount else 0 end
  where user_id = v_uid;

  perform public.notify(c.artist_id,
    (select display_name from public.profiles where id = v_uid) || case when v_choice then ' voted in "' else ' submitted to "' end || c.title || '".'
      || case when v_dup is not null then ' (Same image as an earlier entry.)' else '' end,
    jsonb_build_object('type', 'score', 'id', c.artist_id, 'cat', case when c.event_id is null then 'challenge' else 'showday' end, 'sel', c.id));
  return s;
end $$;

-- Cancelling is not allowed once voting has closed
create or replace function public.cancel_submission(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found'; end if;
  if c.winner_id = v_uid then raise exception 'Winning entries can''t be cancelled'; end if;
  if c.elected_option is not null or (c.closes_at is not null and now() >= c.closes_at) then raise exception 'Voting has closed, so this can''t be changed'; end if;
  delete from public.submissions where challenge_id = c.id and fan_id = v_uid;
  if not found then raise exception 'You have no submission for this challenge'; end if;
  update public.wallets set
    silver = greatest(0, silver - case when c.reward_coin = 'silver' then c.reward_amount else 0 end),
    gold   = greatest(0, gold   - case when c.reward_coin = 'gold'   then c.reward_amount else 0 end)
  where user_id = v_uid;
end $$;

-- Producer elects the winning option (locks it and announces it)
create or replace function public.elect_option(p_challenge_id uuid, p_option text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; v_link jsonb;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or not public.can_manage(c.artist_id) then raise exception 'Only the artist can elect the winner'; end if;
  if c.type::text not in ('mc', 'listen') then raise exception 'Use "Elect winner" on an entry for this challenge'; end if;
  if c.elected_option is not null then raise exception 'The winner is already elected and locked'; end if;
  if p_option is null or not (p_option = any (c.options)) then raise exception 'Pick one of the options'; end if;
  update public.challenges set elected_option = p_option, elected_at = now(),
    closes_at = case when closes_at is null or closes_at > now() then now() else closes_at end,
    opens_at = case when opens_at is not null and opens_at > now() then null else opens_at end
  where id = c.id;
  v_link := jsonb_build_object('type', 'artist', 'id', c.artist_id, 'tab', case when c.event_id is null then 'challenges' else 'showday' end, 'open', c.id);
  insert into public.notifications (user_id, body, link)
  select s.fan_id, 'The votes are in! "' || p_option || '" won "' || c.title || '".', v_link
  from public.submissions s where s.challenge_id = c.id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Votes on entries (text, image, video): net score + coins for voting
-- ---------------------------------------------------------------------
create table if not exists public.vote_rewards (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (submission_id, user_id)
);
alter table public.vote_rewards enable row level security;
revoke all on public.vote_rewards from anon, authenticated;

-- p_value 1 = up, -1 = down. Voting the same way again removes the vote.
-- The first vote on each entry earns 1 silver coin (once, even if changed later).
create or replace function public.cast_vote(p_submission_id uuid, p_value int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); s public.submissions; c public.challenges; v_cur smallint; v_new int; v_coin int := 0; v_err text;
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if p_value not in (-1, 1) then raise exception 'Vote up or down'; end if;
  if public.is_artist(v_uid) then raise exception 'Only fans can vote'; end if;
  select * into s from public.submissions where id = p_submission_id;
  if not found then raise exception 'Entry not found'; end if;
  select * into c from public.challenges where id = s.challenge_id;
  if c.type::text not in ('text', 'image', 'video') then raise exception 'This entry can''t be voted on'; end if;
  if s.fan_id = v_uid then raise exception 'You can''t vote on your own entry'; end if;
  if public.can_manage(c.artist_id) then raise exception 'You manage this account, so you can''t vote'; end if;
  v_err := public.challenge_window_error(c);
  if v_err is not null and v_err not like 'Voting has closed: the winner%' then raise exception '%', v_err; end if;
  if c.winner_claimed then raise exception 'Voting has closed'; end if;
  select value into v_cur from public.submission_votes where submission_id = s.id and user_id = v_uid;
  delete from public.submission_votes where submission_id = s.id and user_id = v_uid;
  if v_cur is distinct from p_value then
    insert into public.submission_votes (submission_id, user_id, value) values (s.id, v_uid, p_value);
    v_new := p_value;
    insert into public.vote_rewards (submission_id, user_id) values (s.id, v_uid) on conflict do nothing;
    if found then
      update public.wallets set silver = silver + 1 where user_id = v_uid;
      v_coin := 1;
    end if;
  else
    v_new := 0;
  end if;
  return jsonb_build_object('value', v_new, 'coins', v_coin);
end $$;

-- Direct votes (older app versions) now also allowed on text answers
drop policy if exists votes_insert_own on public.submission_votes;
create policy votes_insert_own on public.submission_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_artist(auth.uid())
    and exists (
      select 1 from public.submissions s
      join public.challenges c on c.id = s.challenge_id
      where s.id = submission_id and s.fan_id <> auth.uid() and c.type::text in ('text', 'image', 'video')
    )
  );

-- ---------------------------------------------------------------------
-- 5. Quick QR voting at the gig (no sign-up, one vote per phone)
-- ---------------------------------------------------------------------
create table if not exists public.guest_votes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  device_token text not null check (char_length(device_token) between 16 and 100),
  answer       text not null,
  created_at   timestamptz not null default now(),
  primary key (challenge_id, device_token)
);
alter table public.guest_votes enable row level security;
revoke insert, update, delete on public.guest_votes from anon, authenticated;
drop policy if exists guest_votes_read_manager on public.guest_votes;
create policy guest_votes_read_manager on public.guest_votes for select to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id and public.can_manage(c.artist_id)));

-- Everything the QR vote page and the stage screen need (works logged out)
create or replace function public.live_vote_info(p_challenge_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.challenges; a public.profiles; v_tally jsonb; v_total int;
begin
  select * into c from public.challenges where id = p_challenge_id;
  if not found or c.type::text not in ('mc', 'listen') then raise exception 'This live vote was not found'; end if;
  select * into a from public.profiles where id = c.artist_id;
  select coalesce(jsonb_agg(jsonb_build_object('option', o.opt, 'count', o.n) order by o.i), '[]'::jsonb), coalesce(sum(o.n), 0)
  into v_tally, v_total
  from (
    select u.i, u.opt,
      (select count(*) from public.submissions s where s.challenge_id = c.id and s.answer = u.opt)
      + (select count(*) from public.guest_votes g where g.challenge_id = c.id and g.answer = u.opt) as n
    from unnest(c.options) with ordinality as u(opt, i)
  ) o;
  return jsonb_build_object(
    'id', c.id, 'title', c.title, 'description', c.description, 'type', c.type::text,
    'options', to_jsonb(c.options), 'option_images', to_jsonb(c.option_images), 'option_audio', to_jsonb(c.option_audio),
    'opens_at', c.opens_at, 'closes_at', c.closes_at, 'now', now(), 'allow_guest', c.allow_guest,
    'elected_option', c.elected_option, 'artist_id', a.id, 'artist_name', a.display_name, 'artist_avatar', a.avatar_url,
    'theme', a.theme, 'tally', v_tally, 'total', v_total, 'window_error', public.challenge_window_error(c),
    'guests', (select count(*) from public.guest_votes g where g.challenge_id = c.id));
end $$;

create or replace function public.guest_vote(p_challenge_id uuid, p_device text, p_answer text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.challenges; v_err text;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.type::text not in ('mc', 'listen') then raise exception 'This live vote was not found'; end if;
  if not c.allow_guest then raise exception 'Quick voting is not switched on for this vote. Log in to vote.'; end if;
  v_err := public.challenge_window_error(c);
  if v_err is not null then raise exception '%', v_err; end if;
  if p_answer is null or not (p_answer = any (c.options)) then raise exception 'Pick one of the options'; end if;
  if p_device is null or char_length(p_device) not between 16 and 100 then raise exception 'This phone could not be identified. Reload the page and try again.'; end if;
  insert into public.guest_votes (challenge_id, device_token, answer) values (c.id, p_device, p_answer) on conflict do nothing;
  if not found then raise exception 'This phone has already voted'; end if;
  return public.live_vote_info(c.id);
end $$;

-- ---------------------------------------------------------------------
-- 6. Co-Producer badges and digital liner notes
-- ---------------------------------------------------------------------
create table if not exists public.badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 80),
  awarded_by uuid references public.profiles (id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, artist_id, label)
);
alter table public.badges enable row level security;
revoke insert, update, delete on public.badges from anon, authenticated;
drop policy if exists badges_read on public.badges;
create policy badges_read on public.badges for select to authenticated using (true);

create or replace function public.award_badge(p_artist uuid, p_fan uuid, p_label text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if not public.can_manage(p_artist) then raise exception 'Only the artist can give badges'; end if;
  if public.is_artist(p_fan) then raise exception 'Badges are for fans'; end if;
  v_label := coalesce(nullif(btrim(p_label), ''), (select display_name from public.profiles where id = p_artist) || ' Co-Producer');
  insert into public.badges (user_id, artist_id, label, awarded_by) values (p_fan, p_artist, left(v_label, 80), auth.uid())
  on conflict (user_id, artist_id, label) do nothing;
  if found then
    perform public.notify(p_fan, 'You earned the "' || v_label || '" badge! It''s on your profile now.', jsonb_build_object('type', 'profile', 'id', p_fan));
  end if;
end $$;

create or replace function public.revoke_badge(p_artist uuid, p_fan uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage(p_artist) then raise exception 'Only the artist can change badges'; end if;
  delete from public.badges where artist_id = p_artist and user_id = p_fan;
end $$;

-- Public liner notes (shareable link, works logged out). Fans waiting for
-- parent consent are left out.
create or replace function public.liner_notes(p_artist uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.profiles;
begin
  select * into a from public.profiles where id = p_artist and role = 'artist';
  if not found then raise exception 'Creator not found'; end if;
  return jsonb_build_object(
    'artist', jsonb_build_object('id', a.id, 'name', a.display_name, 'bio', a.bio, 'avatar', a.avatar_url, 'banner', a.banner_url, 'theme', a.theme),
    'producers', coalesce((
      select jsonb_agg(p.display_name order by m.added_at)
      from public.creator_managers m join public.profiles p on p.id = m.manager_id where m.artist_id = a.id), '[]'::jsonb),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object('title', c.title, 'type', c.type::text,
        'winner', coalesce(c.elected_option, w.display_name), 'by', case when c.elected_option is null then w.display_name end,
        'answer', case when c.elected_option is null and c.type::text = 'text' then ws.answer end) order by c.created_at)
      from public.challenges c
      left join public.profiles w on w.id = c.winner_id and not w.restricted
      left join public.submissions ws on ws.challenge_id = c.id and ws.fan_id = c.winner_id
      where c.artist_id = a.id and (c.elected_option is not null or w.id is not null)), '[]'::jsonb),
    'coproducers', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'avatar', p.avatar_url) order by b.awarded_at)
      from public.badges b join public.profiles p on p.id = b.user_id
      where b.artist_id = a.id and not p.restricted), '[]'::jsonb),
    'contributors', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.display_name, 'avatar', x.avatar_url, 'count', x.n) order by x.n desc, x.display_name)
      from (
        select p.id, p.display_name, p.avatar_url, count(*) as n
        from (
          select s.fan_id as uid from public.submissions s join public.challenges c on c.id = s.challenge_id where c.artist_id = a.id
          union all
          select v.user_id from public.submission_votes v join public.submissions s on s.id = v.submission_id join public.challenges c on c.id = s.challenge_id where c.artist_id = a.id
        ) acts join public.profiles p on p.id = acts.uid
        where not p.restricted and p.role = 'fan'
        group by p.id, p.display_name, p.avatar_url
      ) x), '[]'::jsonb),
    'guest_votes', (select count(*) from public.guest_votes g join public.challenges c on c.id = g.challenge_id where c.artist_id = a.id)
  );
end $$;

-- ---------------------------------------------------------------------
-- 7. Survey link (set by the owner or a manager)
-- ---------------------------------------------------------------------
create or replace function public.set_survey_url(p_artist uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage(p_artist) then raise exception 'Only the artist can change the survey link'; end if;
  p_url := nullif(btrim(coalesce(p_url, '')), '');
  if p_url is not null and p_url !~* '^https://[^\s]+$' then raise exception 'The survey link needs to start with https://'; end if;
  update public.profiles set survey_url = p_url where id = p_artist;
end $$;

-- ---------------------------------------------------------------------
-- 8. Invite-only access
-- ---------------------------------------------------------------------
create table if not exists public.invite_codes (
  code       text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  artist_id  uuid references public.profiles (id) on delete cascade,  -- new users follow this creator
  label      text not null default '',
  max_uses   int not null default 50 check (max_uses >= 1),
  uses       int not null default 0,
  expires_at timestamptz,
  active     boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
revoke insert, update, delete on public.invite_codes from anon, authenticated;
drop policy if exists invite_codes_read_manager on public.invite_codes;
create policy invite_codes_read_manager on public.invite_codes for select to authenticated
  using (public.can_manage(artist_id) or public.is_admin());

create table if not exists public.invite_redemptions (
  code    text not null references public.invite_codes (code) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at      timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.invite_redemptions enable row level security;
revoke all on public.invite_redemptions from anon, authenticated;

create or replace function public.create_invite(p_artist uuid, p_label text default '', p_max_uses int default 50, p_days int default 30)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not (public.can_manage(p_artist) or public.is_admin()) then raise exception 'Only the artist can create invite links'; end if;
  if coalesce(p_max_uses, 0) < 1 or p_max_uses > 1000 then raise exception 'An invite can be used 1 to 1000 times'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.invite_codes where code = v_code);
  end loop;
  insert into public.invite_codes (code, artist_id, label, max_uses, expires_at, created_by)
  values (v_code, p_artist, left(coalesce(p_label, ''), 80), p_max_uses,
          case when coalesce(p_days, 0) > 0 then now() + make_interval(days => p_days) end, auth.uid());
  return v_code;
end $$;

create or replace function public.set_invite_active(p_code text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare i public.invite_codes;
begin
  select * into i from public.invite_codes where code = upper(btrim(p_code));
  if not found or not (public.can_manage(i.artist_id) or public.is_admin()) then raise exception 'Invite not found'; end if;
  update public.invite_codes set active = p_active where code = i.code;
end $$;

create or replace function public.invite_error(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when i.code is null then 'That invite code isn''t valid. Check the link you were sent.'
    when not i.active then 'That invite has been switched off.'
    when i.expires_at is not null and now() > i.expires_at then 'That invite has expired.'
    when i.uses >= i.max_uses then 'That invite has been used the maximum number of times.'
  end
  from (select 1) one left join public.invite_codes i on i.code = upper(btrim(coalesce(p_code, '')));
$$;

-- Sign-up screen asks this first (works logged out)
create or replace function public.signup_settings(p_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_only boolean := coalesce((select (value)::text = 'true' from public.app_settings where key = 'invite_only'), false);
        i public.invite_codes;
begin
  select * into i from public.invite_codes where code = upper(btrim(coalesce(p_code, '')));
  return jsonb_build_object('invite_only', v_only,
    'code_error', case when coalesce(btrim(p_code), '') = '' then null else public.invite_error(p_code) end,
    'artist_id', i.artist_id, 'artist_name', (select display_name from public.profiles where id = i.artist_id));
end $$;

-- ---------------------------------------------------------------------
-- 9. Sign-up: invite code + age check (under 13 → parent consent)
--    Sign up from the app with options.data = { role, display_name,
--    birth_date: 'YYYY-MM-DD', parent_email, invite_code }
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role public.user_role := case when m ->> 'role' = 'artist' then 'artist' else 'fan' end;
  v_name text := coalesce(nullif(trim(m ->> 'display_name'), ''), split_part(new.email, '@', 1));
  v_code text := upper(btrim(coalesce(m ->> 'invite_code', '')));
  v_only boolean := coalesce((select (value)::text = 'true' from public.app_settings where key = 'invite_only'), false);
  v_bd date;
  v_age int;
  v_parent text := nullif(lower(btrim(coalesce(m ->> 'parent_email', ''))), '');
  v_err text;
  i public.invite_codes;
begin
  begin v_bd := nullif(m ->> 'birth_date', '')::date; exception when others then v_bd := null; end;
  if v_bd is not null then
    if v_bd > current_date or v_bd < date '1900-01-01' then raise exception 'Enter a real date of birth'; end if;
    v_age := extract(year from age(current_date, v_bd))::int;
  end if;
  if v_age is not null and v_age < 13 and (v_parent is null or v_parent !~ '^\S+@\S+\.\S+$') then
    raise exception 'Under 13s need a parent or guardian''s email address';
  end if;
  if v_code <> '' or v_only then
    v_err := public.invite_error(v_code);
    if v_err is not null then raise exception '%', v_err; end if;
    select * into i from public.invite_codes where code = v_code for update;
  end if;

  insert into public.profiles (id, role, display_name, email, restricted)
  values (new.id, v_role, left(v_name, 80), new.email, coalesce(v_age < 13, false));
  insert into public.profile_private (user_id, birth_date, parent_email) values (new.id, v_bd, v_parent);
  if v_role = 'artist' then
    insert into public.wallets (user_id, silver, gold, green, tickets) values (new.id, 50, 20, 10, 0);
    perform public.notify(new.id, 'Welcome to Collabz! Your starter balance is 50 silver, 20 gold and 10 green coins.');
  else
    insert into public.wallets (user_id, silver, gold, green, tickets) values (new.id, 10, 10, 0, 10);
    perform public.notify(new.id, 'Welcome to Collabz! You start with 10 silver, 10 gold and 10 tickets.');
  end if;
  if v_age is not null and v_age < 13 then
    perform public.notify(new.id, 'We''ve asked your parent or guardian (' || v_parent || ') to say it''s OK for you to use Collabz. Until they do, your posts stay private.');
  end if;
  if i.code is not null then
    update public.invite_codes set uses = uses + 1 where code = i.code;
    insert into public.invite_redemptions (code, user_id) values (i.code, new.id) on conflict do nothing;
    if i.artist_id is not null and i.artist_id <> new.id then
      insert into public.follows (follower_id, following_id) values (new.id, i.artist_id) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 10. Parent consent for under-13s
-- ---------------------------------------------------------------------
create or replace function public.my_age_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('restricted', p.restricted, 'parent_email', pp.parent_email, 'consented', pp.parent_consent_at is not null)
  from public.profiles p left join public.profile_private pp on pp.user_id = p.id where p.id = auth.uid();
$$;

-- Admin list: who is waiting, and the consent link to email their parent
create or replace function public.pending_parent_consents()
returns table (user_id uuid, display_name text, email text, parent_email text, consent_token uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can see this'; end if;
  return query
    select p.id, p.display_name, p.email, pp.parent_email, pp.consent_token, p.created_at
    from public.profiles p join public.profile_private pp on pp.user_id = p.id
    where p.restricted and pp.parent_consent_at is null order by p.created_at;
end $$;

-- The consent page (opened by the parent from the emailed link)
create or replace function public.consent_info(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', p.display_name, 'done', pp.parent_consent_at is not null)
  from public.profile_private pp join public.profiles p on p.id = pp.user_id where pp.consent_token = p_token;
$$;

create or replace function public.give_parent_consent(p_token uuid, p_parent_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if char_length(btrim(coalesce(p_parent_name, ''))) < 2 then raise exception 'Type your full name to give consent'; end if;
  update public.profile_private set parent_consent_at = now(), parent_name = left(btrim(p_parent_name), 120)
  where consent_token = p_token and parent_consent_at is null returning user_id into v_uid;
  if v_uid is null then
    if exists (select 1 from public.profile_private where consent_token = p_token) then return public.consent_info(p_token); end if;
    raise exception 'This consent link isn''t valid';
  end if;
  update public.profiles set restricted = false where id = v_uid;
  perform public.notify(v_uid, 'Your parent or guardian said yes. Welcome to Collabz! Your posts can now be seen by others.');
  return public.consent_info(p_token);
end $$;

-- Under-13s waiting for consent are kept out of public feeds:
-- their entries, topics and replies are only visible to themselves
-- (and to the creator's producers, so votes still count), and they can't
-- send or receive direct messages.
create or replace function public.is_restricted(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select restricted from public.profiles where id = uid), false);
$$;

do $$
begin
  perform pg_temp.pol('submissions_read', 'submissions', 'select',
    'fan_id = auth.uid() or not public.is_restricted(fan_id) or exists (select 1 from public.challenges c where c.id = challenge_id and public.can_manage(c.artist_id))');
  perform pg_temp.pol('threads_read', 'forum_threads', 'select', 'author_id = auth.uid() or not public.is_restricted(author_id)');
  perform pg_temp.pol('replies_read', 'forum_replies', 'select', 'author_id = auth.uid() or not public.is_restricted(author_id)');
  perform pg_temp.pol('messages_send', 'messages', 'insert', null,
    'sender_id = auth.uid() and not public.is_restricted(sender_id) and not public.is_restricted(recipient_id)');
end $$;

-- ---------------------------------------------------------------------
-- 11. Storage: audio clips in the submissions bucket
-- ---------------------------------------------------------------------
update storage.buckets set allowed_mime_types = array[
  'image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/quicktime',
  'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/wave','audio/ogg','audio/webm']
where id = 'submissions';

-- ---------------------------------------------------------------------
-- 12. Function permissions
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'add_manager(uuid, text)', 'remove_manager(uuid, uuid)', 'submit_challenge(uuid, text, text, text)', 'cancel_submission(uuid)',
    'elect_option(uuid, text)', 'cast_vote(uuid, int)', 'award_badge(uuid, uuid, text)', 'revoke_badge(uuid, uuid)',
    'set_survey_url(uuid, text)', 'create_invite(uuid, text, int, int)', 'set_invite_active(text, boolean)',
    'my_age_status()', 'pending_parent_consents()', 'pick_winner(uuid, uuid)', 'clear_winner(uuid)', 'draw_lottery(uuid)',
    'save_game_questions(uuid, jsonb)', 'pick_game_winner(uuid, uuid)', 'unpick_game_winner(uuid, uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- logged-out pages: QR vote, stage screen, liner notes, sign-up, parent consent
  foreach f in array array[
    'live_vote_info(uuid)', 'guest_vote(uuid, text, text)', 'liner_notes(uuid)', 'signup_settings(text)',
    'consent_info(uuid)', 'give_parent_consent(uuid, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  -- helpers used inside policies
  foreach f in array array['can_manage(uuid)', 'is_admin(uuid)', 'is_restricted(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- internal only
  foreach f in array array['copy_notification_to_managers()', 'invite_error(text)', 'challenge_window_error(public.challenges)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 13. Realtime: live tallies for producers, badges, managers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['guest_votes', 'badges', 'creator_managers', 'invite_codes', 'submission_votes'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Done. Quick check: select public.signup_settings();
