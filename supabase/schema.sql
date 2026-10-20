-- =====================================================================
-- Collabz · Supabase database setup
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run on an empty project. Creates:
--   tables, row level security (RLS), coin/ticket/winner logic as
--   server-side functions, notifications, storage buckets and realtime.
-- Coins, tickets and winners can ONLY change through the functions below,
-- so nobody can edit their own balance from the browser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('fan', 'artist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.challenge_type as enum ('mc', 'text', 'image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coin_type as enum ('silver', 'gold');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 1. Genres
-- ---------------------------------------------------------------------
create table if not exists public.genres (
  id    text primary key,
  label text not null,
  sort  int  not null default 0
);

insert into public.genres (id, label, sort) values
  ('books', 'Books', 1),
  ('business', 'Business Products', 2),
  ('comics', 'Comic Books', 3),
  ('cosplay', 'Cosplay', 4),
  ('film', 'Film', 5),
  ('music', 'Music', 6),
  ('podcast', 'Podcast', 7),
  ('social', 'Social Media', 8),
  ('theatre', 'Theatre', 9),
  ('tv', 'TV', 10),
  ('games', 'Video Games', 11)
on conflict (id) do update set label = excluded.label, sort = excluded.sort;

-- ---------------------------------------------------------------------
-- 2. Profiles (one per auth user) and wallets
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  role              public.user_role not null default 'fan',
  display_name      text not null check (char_length(display_name) between 1 and 80),
  email             text,
  bio               text not null default '' check (char_length(bio) <= 2000),
  location          text not null default '' check (char_length(location) <= 120),
  avatar_url        text,
  welcome_video_url text,
  browse_genre      text references public.genres (id),          -- fan's current genre
  theme             text not null default 'default'
                    check (theme in ('default','black','midnight','ember','forest','lavender','peach','sky')),
  facebook_url      text,
  instagram_url     text,
  x_url             text,
  tiktok_url        text,
  youtube_url       text,
  onboarded         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Artists pick 1–3 genres
create table if not exists public.artist_genres (
  artist_id  uuid not null references public.profiles (id) on delete cascade,
  genre_id   text not null references public.genres (id),
  created_at timestamptz not null default now(),
  primary key (artist_id, genre_id)
);
create index if not exists artist_genres_genre_idx on public.artist_genres (genre_id);

-- Balances are private to the owner and only change through functions
create table if not exists public.wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  silver     int not null default 0 check (silver >= 0),
  gold       int not null default 0 check (gold >= 0),
  green      int not null default 0 check (green >= 0),
  tickets    int not null default 0 check (tickets >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------
-- 3. Showday events, challenges, submissions
-- ---------------------------------------------------------------------
create table if not exists public.showday_events (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references public.profiles (id) on delete cascade,
  tag         text not null default 'Premiere' check (tag in ('Premiere','Concert','Meet & Greet','Signing','Livestream','Other')),
  title       text not null check (char_length(title) between 1 and 140),
  description text not null default '',
  event_date  date not null,
  event_time  time,
  venue       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists showday_events_artist_idx on public.showday_events (artist_id);

create table if not exists public.challenges (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete cascade,
  event_id        uuid references public.showday_events (id) on delete cascade,  -- null = regular challenge
  title           text not null check (char_length(title) between 1 and 140),
  description     text not null default '',
  type            public.challenge_type not null,
  options         text[] not null default '{}',
  option_images   text[] not null default '{}',   -- optional image per option ('' = none)
  thumbnail_url   text not null default '',     -- optional thumbnail shown when the challenge is opened
  reward_coin     public.coin_type not null default 'gold',
  reward_amount   int not null default 1 check (reward_amount between 1 and 1000),
  max_submissions int not null default 100 check (max_submissions >= 1),
  winner_id       uuid references public.profiles (id) on delete set null,
  winner_claimed  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (type <> 'mc' or coalesce(array_length(options, 1), 0) between 2 and 4),
  constraint challenges_option_images_check check (coalesce(array_length(option_images, 1), 0) <= 4)
);
create index if not exists challenges_artist_idx on public.challenges (artist_id);
create index if not exists challenges_event_idx on public.challenges (event_id);

create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  fan_id       uuid not null references public.profiles (id) on delete cascade,
  answer       text,          -- multiple choice or text answer
  media_url    text,          -- image or video (storage bucket "submissions")
  created_at   timestamptz not null default now(),
  unique (challenge_id, fan_id)
);
create index if not exists submissions_fan_idx on public.submissions (fan_id);

-- "Remove card" after a fan claims a prize
create table if not exists public.hidden_challenge_cards (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  primary key (user_id, challenge_id)
);

-- ---------------------------------------------------------------------
-- 4. Lotteries
-- ---------------------------------------------------------------------
create table if not exists public.lotteries (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 140),
  description       text not null default '',
  tickets_per_entry int not null default 1 check (tickets_per_entry >= 1),
  winner_count      int not null default 1 check (winner_count >= 1),
  draw_date         date,
  drawn_at          timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists lotteries_artist_idx on public.lotteries (artist_id);

create table if not exists public.lottery_entries (
  lottery_id uuid not null references public.lotteries (id) on delete cascade,
  fan_id     uuid not null references public.profiles (id) on delete cascade,
  entries    int not null default 0 check (entries >= 0),
  updated_at timestamptz not null default now(),
  primary key (lottery_id, fan_id)
);

create table if not exists public.lottery_winners (
  lottery_id uuid not null references public.lotteries (id) on delete cascade,
  fan_id     uuid not null references public.profiles (id) on delete cascade,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (lottery_id, fan_id)
);

-- ---------------------------------------------------------------------
-- 5. Community, chat, notifications
-- ---------------------------------------------------------------------
create table if not exists public.forum_threads (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_replies (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.forum_threads (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists forum_replies_thread_idx on public.forum_replies (thread_id);

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 4000),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, read_at);

-- link matches the app, e.g. {"type":"artist","id":"<uuid>","tab":"showday","open":"<uuid>"}
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  link       jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Helpers and triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','wallets','showday_events','challenges','lotteries','forum_threads'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create or replace function public.is_artist(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and role = 'artist');
$$;

create or replace function public.notify(p_user uuid, p_body text, p_link jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, body, link) values (p_user, p_body, p_link);
$$;

-- New auth user → profile + wallet + welcome notification.
-- Sign up from the app with: supabase.auth.signUp({ email, password,
--   options: { data: { role: 'fan' | 'artist', display_name: 'Name' } } })
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := case when new.raw_user_meta_data ->> 'role' = 'artist' then 'artist' else 'fan' end;
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, role, display_name, email) values (new.id, v_role, left(v_name, 80), new.email);
  if v_role = 'artist' then
    insert into public.wallets (user_id, silver, gold, green, tickets) values (new.id, 50, 20, 10, 0);
    perform public.notify(new.id, 'Welcome to Collabz! Your starter balance is 50 silver, 20 gold and 10 green coins.');
  else
    insert into public.wallets (user_id, silver, gold, green, tickets) values (new.id, 10, 10, 0, 10);
    perform public.notify(new.id, 'Welcome to Collabz! You start with 10 silver, 10 gold and 10 tickets.');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when a user changes it in Auth
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Artists only, max 3 genres
create or replace function public.enforce_artist_genres()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_artist(new.artist_id) then
    raise exception 'Only artists can have genres';
  end if;
  if (select count(*) from public.artist_genres where artist_id = new.artist_id) >= 3 then
    raise exception 'An artist can choose up to 3 genres';
  end if;
  return new;
end $$;

drop trigger if exists trg_artist_genres_limit on public.artist_genres;
create trigger trg_artist_genres_limit before insert on public.artist_genres
  for each row execute function public.enforce_artist_genres();

-- Follow → notify
create or replace function public.on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.following_id,
    (select display_name from public.profiles where id = new.follower_id) || ' started following you.',
    jsonb_build_object('type', 'profile', 'id', new.follower_id));
  return new;
end $$;

drop trigger if exists trg_on_follow on public.follows;
create trigger trg_on_follow after insert on public.follows
  for each row execute function public.on_follow();

-- New challenge / event / lottery → notify the artist's followers
create or replace function public.notify_followers_of_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb := to_jsonb(new);
  v_artist uuid := (r ->> 'artist_id')::uuid;
  v_name text := (select display_name from public.profiles where id = v_artist);
  v_body text;
  v_link jsonb;
begin
  if tg_table_name = 'challenges' then
    v_body := v_name || ' posted a new ' || case when r ->> 'event_id' is null then 'challenge' else 'Showday challenge' end || ': "' || (r ->> 'title') || '"';
    v_link := jsonb_build_object('type', 'artist', 'id', v_artist, 'tab', case when r ->> 'event_id' is null then 'challenges' else 'showday' end, 'open', r ->> 'id');
  elsif tg_table_name = 'showday_events' then
    v_body := v_name || ' announced a Showday event: "' || (r ->> 'title') || '"';
    v_link := jsonb_build_object('type', 'artist', 'id', v_artist, 'tab', 'showday');
  else
    v_body := v_name || ' opened a lottery: "' || (r ->> 'title') || '"';
    v_link := jsonb_build_object('type', 'artist', 'id', v_artist, 'tab', 'lottery', 'open', r ->> 'id');
  end if;
  insert into public.notifications (user_id, body, link)
    select f.follower_id, v_body, v_link from public.follows f where f.following_id = v_artist;
  return new;
end $$;

drop trigger if exists trg_challenges_notify on public.challenges;
create trigger trg_challenges_notify after insert on public.challenges
  for each row execute function public.notify_followers_of_post();
drop trigger if exists trg_events_notify on public.showday_events;
create trigger trg_events_notify after insert on public.showday_events
  for each row execute function public.notify_followers_of_post();
drop trigger if exists trg_lotteries_notify on public.lotteries;
create trigger trg_lotteries_notify after insert on public.lotteries
  for each row execute function public.notify_followers_of_post();

-- Forum reply → notify thread author
create or replace function public.on_forum_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare t public.forum_threads;
begin
  select * into t from public.forum_threads where id = new.thread_id;
  if t.author_id <> new.author_id then
    perform public.notify(t.author_id,
      (select display_name from public.profiles where id = new.author_id) || ' replied to "' || t.title || '".',
      jsonb_build_object('type', 'forum', 'id', t.id));
  end if;
  return new;
end $$;

drop trigger if exists trg_on_forum_reply on public.forum_replies;
create trigger trg_on_forum_reply after insert on public.forum_replies
  for each row execute function public.on_forum_reply();

-- ---------------------------------------------------------------------
-- 7. Game logic (the only way coins, tickets and winners change)
-- ---------------------------------------------------------------------

-- Fan submits to a challenge → gets the coin reward
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

-- Fan cancels their submission → reward is taken back (not allowed once they've won)
create or replace function public.cancel_submission(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c public.challenges;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found then raise exception 'Challenge not found'; end if;
  if c.winner_id = v_uid then raise exception 'Winning entries can''t be cancelled'; end if;
  delete from public.submissions where challenge_id = c.id and fan_id = v_uid;
  if not found then raise exception 'You have no submission for this challenge'; end if;
  update public.wallets set
    silver = greatest(0, silver - case when c.reward_coin = 'silver' then c.reward_amount else 0 end),
    gold   = greatest(0, gold   - case when c.reward_coin = 'gold'   then c.reward_amount else 0 end)
  where user_id = v_uid;
end $$;

-- Artist picks (or changes) a winner — allowed until the winner claims
create or replace function public.pick_winner(p_challenge_id uuid, p_fan_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.challenges;
  v_link jsonb;
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.artist_id <> auth.uid() then raise exception 'Only the artist can pick a winner'; end if;
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
  if not found or c.artist_id <> auth.uid() then raise exception 'Only the artist can change the winner'; end if;
  if c.winner_claimed then raise exception 'The prize was already claimed'; end if;
  if c.winner_id is not null then
    perform public.notify(c.winner_id, 'The winner for "' || c.title || '" was changed by the artist.', null);
  end if;
  update public.challenges set winner_id = null where id = c.id;
end $$;

-- Winner claims → 1 green coin
create or replace function public.claim_challenge_prize(p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; v_uid uuid := auth.uid();
begin
  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.winner_id is distinct from v_uid then raise exception 'You are not the winner of this challenge'; end if;
  if c.winner_claimed then raise exception 'Prize already claimed'; end if;
  update public.challenges set winner_claimed = true where id = c.id;
  update public.wallets set green = green + 1 where user_id = v_uid;
  perform public.notify(c.artist_id,
    (select display_name from public.profiles where id = v_uid) || ' claimed the prize for "' || c.title || '".',
    jsonb_build_object('type', 'profile', 'id', v_uid));
end $$;

-- Fan buys one lottery entry with tickets (no refunds). Returns the fan's entry count.
create or replace function public.enter_lottery(p_lottery_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  l public.lotteries;
  v_uid uuid := auth.uid();
  v_entries int;
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if public.is_artist(v_uid) then raise exception 'Only fans can enter lotteries'; end if;
  select * into l from public.lotteries where id = p_lottery_id for update;
  if not found then raise exception 'Lottery not found'; end if;
  if l.drawn_at is not null then raise exception 'This lottery has already been drawn'; end if;

  update public.wallets set tickets = tickets - l.tickets_per_entry
  where user_id = v_uid and tickets >= l.tickets_per_entry;
  if not found then raise exception 'You need % tickets for an entry', l.tickets_per_entry; end if;

  insert into public.lottery_entries (lottery_id, fan_id, entries) values (l.id, v_uid, 1)
  on conflict (lottery_id, fan_id) do update set entries = public.lottery_entries.entries + 1, updated_at = now()
  returning entries into v_entries;
  return v_entries;
end $$;

-- Artist draws (or redraws, while nobody has claimed) — weighted by entries
create or replace function public.draw_lottery(p_lottery_id uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare
  l public.lotteries;
  e record;
  v_link jsonb;
begin
  select * into l from public.lotteries where id = p_lottery_id for update;
  if not found or l.artist_id <> auth.uid() then raise exception 'Only the artist can draw this lottery'; end if;
  if exists (select 1 from public.lottery_winners where lottery_id = l.id and claimed_at is not null) then
    raise exception 'A winner already claimed, so the lottery can''t be redrawn';
  end if;
  if not exists (select 1 from public.lottery_entries where lottery_id = l.id and entries > 0) then
    raise exception 'There are no entries yet';
  end if;

  delete from public.lottery_winners where lottery_id = l.id;
  -- Weighted sampling without replacement: each entry is one chance
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
           else 'The "' || l.title || '" draw is done. Not this time, thanks for entering!' end,
      v_link);
  end loop;

  return query select fan_id from public.lottery_winners where lottery_id = l.id;
end $$;

-- Lottery winner claims → 1 green coin (management follows up by email)
create or replace function public.claim_lottery_prize(p_lottery_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); l public.lotteries;
begin
  select * into l from public.lotteries where id = p_lottery_id;
  update public.lottery_winners set claimed_at = now()
  where lottery_id = p_lottery_id and fan_id = v_uid and claimed_at is null;
  if not found then raise exception 'Nothing to claim for this lottery'; end if;
  update public.wallets set green = green + 1 where user_id = v_uid;
  perform public.notify(l.artist_id,
    (select display_name from public.profiles where id = v_uid) || ' claimed their lottery win for "' || l.title || '".',
    jsonb_build_object('type', 'profile', 'id', v_uid));
end $$;

-- Artist replaces their genres (1–3) in one call
create or replace function public.set_my_genres(p_genres text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g text;
begin
  if not public.is_artist(v_uid) then raise exception 'Only artists have genres'; end if;
  if coalesce(array_length(p_genres, 1), 0) not between 1 and 3 then raise exception 'Choose 1 to 3 genres'; end if;
  delete from public.artist_genres where artist_id = v_uid;
  foreach g in array p_genres loop
    insert into public.artist_genres (artist_id, genre_id) values (v_uid, g) on conflict do nothing;
  end loop;
end $$;

-- Delete my account (removes the auth user; everything else cascades)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Only signed-in users may call the functions
do $$
declare f text;
begin
  foreach f in array array[
    'submit_challenge(uuid, text, text)', 'cancel_submission(uuid)', 'pick_winner(uuid, uuid)',
    'clear_winner(uuid)', 'claim_challenge_prize(uuid)', 'enter_lottery(uuid)', 'draw_lottery(uuid)',
    'claim_lottery_prize(uuid)', 'set_my_genres(text[])', 'delete_my_account()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- internal helpers: not callable from the app
  revoke all on function public.notify(uuid, text, jsonb) from public, anon, authenticated;
  revoke all on function public.handle_new_user() from public, anon, authenticated;
end $$;

-- ---------------------------------------------------------------------
-- 8. Column-level protection (what the browser may write directly)
-- ---------------------------------------------------------------------
revoke insert, update, delete on public.genres from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, location, avatar_url, welcome_video_url, browse_genre, theme,
              facebook_url, instagram_url, x_url, tiktok_url, youtube_url, onboarded)
  on public.profiles to authenticated;

revoke insert, update, delete on public.wallets from anon, authenticated;
revoke insert, update on public.artist_genres from anon, authenticated;   -- use set_my_genres()

revoke insert, update on public.challenges from anon, authenticated;
grant insert (artist_id, event_id, title, description, type, options, option_images, thumbnail_url, reward_coin, reward_amount, max_submissions)
  on public.challenges to authenticated;
grant update (event_id, title, description, type, options, option_images, thumbnail_url, reward_coin, reward_amount, max_submissions)
  on public.challenges to authenticated;

revoke insert, update, delete on public.submissions from anon, authenticated;   -- use submit/cancel functions

revoke insert, update on public.lotteries from anon, authenticated;
grant insert (artist_id, title, description, tickets_per_entry, winner_count, draw_date) on public.lotteries to authenticated;
grant update (title, description, tickets_per_entry, winner_count, draw_date) on public.lotteries to authenticated;
revoke insert, update, delete on public.lottery_entries from anon, authenticated;
revoke insert, update, delete on public.lottery_winners from anon, authenticated;

revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- 9. Row level security
-- ---------------------------------------------------------------------
alter table public.genres                 enable row level security;
alter table public.profiles               enable row level security;
alter table public.artist_genres          enable row level security;
alter table public.wallets                enable row level security;
alter table public.follows                enable row level security;
alter table public.showday_events         enable row level security;
alter table public.challenges             enable row level security;
alter table public.submissions            enable row level security;
alter table public.hidden_challenge_cards enable row level security;
alter table public.lotteries              enable row level security;
alter table public.lottery_entries        enable row level security;
alter table public.lottery_winners        enable row level security;
alter table public.forum_threads          enable row level security;
alter table public.forum_replies          enable row level security;
alter table public.messages               enable row level security;
alter table public.notifications          enable row level security;

-- helper to (re)create a policy
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
  perform pg_temp.pol('genres_read',            'genres',                 'select', 'true');

  perform pg_temp.pol('profiles_read',          'profiles',               'select', 'true');
  perform pg_temp.pol('profiles_update_own',    'profiles',               'update', 'id = auth.uid()', 'id = auth.uid()');

  perform pg_temp.pol('artist_genres_read',     'artist_genres',          'select', 'true');
  perform pg_temp.pol('artist_genres_del_own',  'artist_genres',          'delete', 'artist_id = auth.uid()');

  perform pg_temp.pol('wallets_read_own',       'wallets',                'select', 'user_id = auth.uid()');

  perform pg_temp.pol('follows_read',           'follows',                'select', 'true');
  perform pg_temp.pol('follows_insert_own',     'follows',                'insert', null, 'follower_id = auth.uid()');
  perform pg_temp.pol('follows_delete_own',     'follows',                'delete', 'follower_id = auth.uid()');

  perform pg_temp.pol('events_read',            'showday_events',         'select', 'true');
  perform pg_temp.pol('events_insert_artist',   'showday_events',         'insert', null, 'artist_id = auth.uid() and public.is_artist(auth.uid())');
  perform pg_temp.pol('events_update_own',      'showday_events',         'update', 'artist_id = auth.uid()', 'artist_id = auth.uid()');
  perform pg_temp.pol('events_delete_own',      'showday_events',         'delete', 'artist_id = auth.uid()');

  perform pg_temp.pol('challenges_read',        'challenges',             'select', 'true');
  perform pg_temp.pol('challenges_insert_artist','challenges',            'insert', null,
  'artist_id = auth.uid() and public.is_artist(auth.uid()) and (event_id is null or exists (select 1 from public.showday_events e where e.id = event_id and e.artist_id = auth.uid()))');
  perform pg_temp.pol('challenges_update_own',  'challenges',             'update', 'artist_id = auth.uid()',
  'artist_id = auth.uid() and (event_id is null or exists (select 1 from public.showday_events e where e.id = event_id and e.artist_id = auth.uid()))');
  perform pg_temp.pol('challenges_delete_own',  'challenges',             'delete', 'artist_id = auth.uid()');

-- Submissions are visible to signed-in users (Showday gallery and Scoreboard)
  perform pg_temp.pol('submissions_read',       'submissions',            'select', 'true');

  perform pg_temp.pol('hidden_cards_own',       'hidden_challenge_cards', 'all',    'user_id = auth.uid()', 'user_id = auth.uid()');

  perform pg_temp.pol('lotteries_read',         'lotteries',              'select', 'true');
  perform pg_temp.pol('lotteries_insert_artist','lotteries',              'insert', null, 'artist_id = auth.uid() and public.is_artist(auth.uid())');
  perform pg_temp.pol('lotteries_update_own',   'lotteries',              'update', 'artist_id = auth.uid()', 'artist_id = auth.uid()');
  perform pg_temp.pol('lotteries_delete_own',   'lotteries',              'delete', 'artist_id = auth.uid()');
  perform pg_temp.pol('lottery_entries_read',   'lottery_entries',        'select', 'true');
  perform pg_temp.pol('lottery_winners_read',   'lottery_winners',        'select', 'true');

  perform pg_temp.pol('threads_read',           'forum_threads',          'select', 'true');
  perform pg_temp.pol('threads_insert_own',     'forum_threads',          'insert', null, 'author_id = auth.uid()');
  perform pg_temp.pol('threads_update_own',     'forum_threads',          'update', 'author_id = auth.uid()', 'author_id = auth.uid()');
  perform pg_temp.pol('threads_delete_own',     'forum_threads',          'delete', 'author_id = auth.uid()');
  perform pg_temp.pol('replies_read',           'forum_replies',          'select', 'true');
  perform pg_temp.pol('replies_insert_own',     'forum_replies',          'insert', null, 'author_id = auth.uid()');
  perform pg_temp.pol('replies_delete_own',     'forum_replies',          'delete', 'author_id = auth.uid()');

  perform pg_temp.pol('messages_read_mine',     'messages',               'select', 'sender_id = auth.uid() or recipient_id = auth.uid()');
  perform pg_temp.pol('messages_send',          'messages',               'insert', null, 'sender_id = auth.uid()');
  perform pg_temp.pol('messages_mark_read',     'messages',               'update', 'recipient_id = auth.uid()', 'recipient_id = auth.uid()');

  perform pg_temp.pol('notifications_read_own', 'notifications',          'select', 'user_id = auth.uid()');
  perform pg_temp.pol('notifications_mark_read','notifications',          'update', 'user_id = auth.uid()', 'user_id = auth.uid()');
  perform pg_temp.pol('notifications_delete_own','notifications',         'delete', 'user_id = auth.uid()');
end $$;

-- ---------------------------------------------------------------------
-- 10. Storage buckets (files go in a folder named after the user's id:
--     <bucket>/<user-id>/<file-name>)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true, 5242880,  array['image/png','image/jpeg','image/webp','image/gif']),
  ('welcome-videos', 'welcome-videos', true, 52428800, array['video/mp4','video/webm','video/quicktime']),
  ('submissions',    'submissions',    true, 52428800, array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "collabz_upload_own_folder" on storage.objects;
create policy "collabz_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','welcome-videos','submissions') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "collabz_update_own_files" on storage.objects;
create policy "collabz_update_own_files" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','welcome-videos','submissions') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "collabz_delete_own_files" on storage.objects;
create policy "collabz_delete_own_files" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','welcome-videos','submissions') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 11. Realtime (live chat, notifications, scoreboard updates)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['messages','notifications','submissions','challenges','lottery_winners','forum_replies'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Done. Quick check: select * from public.genres order by sort;
