-- =====================================================================
-- Collabz · 005: Games (Trivia, Quiz, Solitaire, Classic Card Games, Puzzle) with prizes
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to re-run.
-- Needs schema.sql (and 002–004) to have been run first.
--
-- How it works
--   * Artists create games. Trivia/Quiz questions are readable by everyone, but the
--     correct answers live in game_answers, which only the game's artist can read.
--   * Fans play as often as they like. Trivia and Quiz are graded here on the server.
--     Card games and puzzles report the win when the fan finishes.
--   * Fans who won appear on the Scoreboard; the artist picks prize winners
--     (up to winner_count). A picked fan claims the prize once.
-- =====================================================================

-- 1. Tables -------------------------------------------------------------
create table if not exists public.games (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('trivia', 'quiz', 'solitaire', 'cards', 'puzzle')),
  variant         text check (variant in ('memory', 'hilo', 'blackjack', 'golf')),
  title           text not null check (char_length(title) between 1 and 140),
  description     text not null default '',
  image_url       text not null default '',          -- card back design, or the puzzle image
  puzzle_size     int check (puzzle_size between 3 and 5),
  seconds_per_q   int check (seconds_per_q between 5 and 120),
  pass_mark       int check (pass_mark >= 1),
  target          int check (target between 1 and 20),   -- Higher or Lower streak / Blackjack hands
  prize_type      text not null default 'gold' check (prize_type in ('silver', 'gold', 'green', 'tickets', 'custom')),
  prize_amount    int not null default 1 check (prize_amount between 1 and 1000),
  prize_text      text not null default '',
  prize_image_url text not null default '',
  winner_count    int not null default 1 check (winner_count between 1 and 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (kind <> 'cards' or variant is not null),
  check (kind <> 'puzzle' or (image_url <> '' and puzzle_size is not null)),
  check (prize_type <> 'custom' or prize_text <> '')
);
create index if not exists games_artist_idx on public.games (artist_id);

create table if not exists public.game_questions (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references public.games (id) on delete cascade,
  position  int not null,
  question  text not null check (char_length(question) between 1 and 300),
  options   text[] not null check (coalesce(array_length(options, 1), 0) between 2 and 4),
  unique (game_id, position)
);

-- Correct answers: only the game's artist can read these
create table if not exists public.game_answers (
  question_id uuid primary key references public.game_questions (id) on delete cascade,
  game_id     uuid not null references public.games (id) on delete cascade,
  correct     int not null check (correct between 0 and 3)
);
create index if not exists game_answers_game_idx on public.game_answers (game_id);

create table if not exists public.game_plays (
  game_id         uuid not null references public.games (id) on delete cascade,
  fan_id          uuid not null references public.profiles (id) on delete cascade,
  plays           int not null default 0,
  won             boolean not null default false,
  best_score      int,
  won_at          timestamptz,
  last_played_at  timestamptz not null default now(),
  step            int not null default 0,      -- trivia: current question
  step_started_at timestamptz,                 -- null = no run in progress
  primary key (game_id, fan_id)
);

create table if not exists public.game_prize_winners (
  game_id    uuid not null references public.games (id) on delete cascade,
  fan_id     uuid not null references public.profiles (id) on delete cascade,
  picked_at  timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (game_id, fan_id)
);

drop trigger if exists trg_games_updated on public.games;
create trigger trg_games_updated before update on public.games for each row execute function public.set_updated_at();

-- 2. Security -----------------------------------------------------------
alter table public.games              enable row level security;
alter table public.game_questions     enable row level security;
alter table public.game_answers       enable row level security;
alter table public.game_plays         enable row level security;
alter table public.game_prize_winners enable row level security;

revoke insert, update on public.games from anon, authenticated;
grant insert (artist_id, kind, variant, title, description, image_url, puzzle_size, seconds_per_q, pass_mark, target,
              prize_type, prize_amount, prize_text, prize_image_url, winner_count) on public.games to authenticated;
grant update (title, description, variant, image_url, puzzle_size, seconds_per_q, pass_mark, target,
              prize_type, prize_amount, prize_text, prize_image_url, winner_count) on public.games to authenticated;
revoke insert, update, delete on public.game_questions, public.game_answers from anon, authenticated;   -- use save_game_questions()
revoke insert, update, delete on public.game_plays, public.game_prize_winners from anon, authenticated; -- use the functions below

drop policy if exists games_read on public.games;
create policy games_read on public.games for select to authenticated using (true);
drop policy if exists games_insert_artist on public.games;
create policy games_insert_artist on public.games for insert to authenticated
  with check (artist_id = auth.uid() and public.is_artist(auth.uid()));
drop policy if exists games_update_own on public.games;
create policy games_update_own on public.games for update to authenticated
  using (artist_id = auth.uid()) with check (artist_id = auth.uid());
drop policy if exists games_delete_own on public.games;
create policy games_delete_own on public.games for delete to authenticated using (artist_id = auth.uid());

drop policy if exists game_questions_read on public.game_questions;
create policy game_questions_read on public.game_questions for select to authenticated using (true);
drop policy if exists game_answers_owner on public.game_answers;
create policy game_answers_owner on public.game_answers for select to authenticated
  using (exists (select 1 from public.games g where g.id = game_id and g.artist_id = auth.uid()));
drop policy if exists game_plays_read on public.game_plays;
create policy game_plays_read on public.game_plays for select to authenticated using (true);
drop policy if exists game_prize_winners_read on public.game_prize_winners;
create policy game_prize_winners_read on public.game_prize_winners for select to authenticated using (true);

-- 3. Functions ----------------------------------------------------------
-- Artist replaces all questions of a game in one go.
-- p_questions: [{"q": "...", "opts": ["a","b",...], "ans": 0}, ...]
create or replace function public.save_game_questions(p_game uuid, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games; q jsonb; i int := 0; v_id uuid; v_opts text[]; v_ans int;
begin
  select * into g from public.games where id = p_game;
  if not found or g.artist_id <> auth.uid() then raise exception 'You can only edit your own games'; end if;
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

-- Internal: a fan's first win of a game
create or replace function public.game_record_win(g public.games, p_fan uuid, p_score int)
returns void language plpgsql security definer set search_path = public as $$
declare v_first boolean; v_lower boolean := g.kind in ('solitaire', 'puzzle') or (g.kind = 'cards' and g.variant in ('memory', 'blackjack'));
begin
  select not won into v_first from public.game_plays where game_id = g.id and fan_id = p_fan;
  update public.game_plays set
    won = true, won_at = coalesce(won_at, now()),
    best_score = case when best_score is null then p_score when v_lower then least(best_score, p_score) else greatest(best_score, p_score) end
  where game_id = g.id and fan_id = p_fan;
  if v_first then
    perform public.notify(g.artist_id,
      (select display_name from public.profiles where id = p_fan) || ' won your game "' || g.title || '". Pick prize winners on the Scoreboard.',
      jsonb_build_object('type', 'score', 'id', g.artist_id, 'cat', 'game', 'sel', g.id));
  end if;
end $$;
revoke all on function public.game_record_win(public.games, uuid, int) from public, anon, authenticated;

-- Fan starts a game (counts a play and starts the run)
create or replace function public.start_game(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if public.is_artist(v_uid) then raise exception 'Only fans can play for prizes'; end if;
  if not exists (select 1 from public.games where id = p_game) then raise exception 'Game not found'; end if;
  insert into public.game_plays (game_id, fan_id, plays, last_played_at, step, step_started_at)
  values (p_game, v_uid, 1, now(), 0, now())
  on conflict (game_id, fan_id) do update set plays = game_plays.plays + 1, last_played_at = now(), step = 0, step_started_at = now();
end $$;

-- Trivia: answer the current question. Wrong answer or out of time ends the run.
create or replace function public.answer_trivia(p_game uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.games; p public.game_plays; v_n int; v_correct int; v_ok boolean;
begin
  select * into g from public.games where id = p_game;
  if not found or g.kind <> 'trivia' then raise exception 'Trivia game not found'; end if;
  select * into p from public.game_plays where game_id = p_game and fan_id = v_uid for update;
  if not found or p.step_started_at is null then raise exception 'Start the game again to play'; end if;
  select count(*) into v_n from public.game_questions where game_id = p_game;
  select a.correct into v_correct from public.game_questions q join public.game_answers a on a.question_id = q.id
    where q.game_id = p_game order by q.position offset p.step limit 1;
  v_ok := v_correct is not null and p_choice = v_correct
          and now() - p.step_started_at <= make_interval(secs => coalesce(g.seconds_per_q, 15) + 3);
  if not v_ok then
    update public.game_plays set step_started_at = null where game_id = p_game and fan_id = v_uid;
    return jsonb_build_object('correct', false, 'won', false);
  end if;
  if p.step + 1 >= v_n then
    update public.game_plays set step = p.step + 1, step_started_at = null where game_id = p_game and fan_id = v_uid;
    perform public.game_record_win(g, v_uid, v_n);
    return jsonb_build_object('correct', true, 'won', true);
  end if;
  update public.game_plays set step = p.step + 1, step_started_at = now() where game_id = p_game and fan_id = v_uid;
  return jsonb_build_object('correct', true, 'won', false);
end $$;

-- Quiz: submit all answers at once (index of the chosen option per question, in order)
create or replace function public.submit_quiz(p_game uuid, p_answers int[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.games; p public.game_plays; v_n int; v_score int; v_won boolean;
begin
  select * into g from public.games where id = p_game;
  if not found or g.kind <> 'quiz' then raise exception 'Quiz not found'; end if;
  select * into p from public.game_plays where game_id = p_game and fan_id = v_uid for update;
  if not found or p.step_started_at is null then raise exception 'Start the quiz again to submit'; end if;
  select count(*) into v_n from public.game_questions where game_id = p_game;
  select count(*) into v_score from (
    select a.correct, row_number() over (order by q.position) as rn
    from public.game_questions q join public.game_answers a on a.question_id = q.id where q.game_id = p_game
  ) x where p_answers[x.rn] = x.correct;
  v_won := v_score >= least(coalesce(g.pass_mark, v_n), v_n);
  update public.game_plays set step_started_at = null,
    best_score = case when best_score is null then v_score else greatest(best_score, v_score) end
  where game_id = p_game and fan_id = v_uid;
  if v_won then perform public.game_record_win(g, v_uid, v_score); end if;
  return jsonb_build_object('score', v_score, 'total', v_n, 'won', v_won);
end $$;

-- Card games and puzzles: the fan finished and won (one win per started game)
create or replace function public.finish_game(p_game uuid, p_score int)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.games; p public.game_plays;
begin
  select * into g from public.games where id = p_game;
  if not found or g.kind in ('trivia', 'quiz') then raise exception 'Game not found'; end if;
  select * into p from public.game_plays where game_id = p_game and fan_id = v_uid for update;
  if not found or p.step_started_at is null then raise exception 'Start the game again to play'; end if;
  if now() - p.step_started_at < interval '5 seconds' then raise exception 'That was too fast to count'; end if;
  update public.game_plays set step_started_at = null where game_id = p_game and fan_id = v_uid;
  perform public.game_record_win(g, v_uid, greatest(0, coalesce(p_score, 0)));
end $$;

-- Artist gives a prize to a fan who won (up to winner_count)
create or replace function public.pick_game_winner(p_game uuid, p_fan uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  select * into g from public.games where id = p_game for update;
  if not found or g.artist_id <> auth.uid() then raise exception 'Only the game’s artist can pick prize winners'; end if;
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
  if not found or g.artist_id <> auth.uid() then raise exception 'Only the game’s artist can change prize winners'; end if;
  delete from public.game_prize_winners where game_id = p_game and fan_id = p_fan and claimed_at is null;
  if not found then raise exception 'That prize was already claimed'; end if;
  perform public.notify(p_fan, 'The prize winners for "' || g.title || '" were changed by the artist.', null);
end $$;

-- Fan claims their prize: coins or tickets go straight to the wallet; a custom prize notifies the artist
create or replace function public.claim_game_prize(p_game uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.games;
begin
  select * into g from public.games where id = p_game;
  if not found then raise exception 'Game not found'; end if;
  update public.game_prize_winners set claimed_at = now() where game_id = p_game and fan_id = v_uid and claimed_at is null;
  if not found then raise exception 'Nothing to claim for this game'; end if;
  update public.wallets set
    silver  = silver  + case when g.prize_type = 'silver'  then g.prize_amount else 0 end,
    gold    = gold    + case when g.prize_type = 'gold'    then g.prize_amount else 0 end,
    green   = green   + case when g.prize_type = 'green'   then g.prize_amount else 0 end,
    tickets = tickets + case when g.prize_type = 'tickets' then g.prize_amount else 0 end
  where user_id = v_uid;
  perform public.notify(g.artist_id,
    (select display_name from public.profiles where id = v_uid) || ' claimed the prize for "' || g.title || '"' ||
    case when g.prize_type = 'custom' then ' (' || g.prize_text || '). Contact them at ' || coalesce((select email from auth.users where id = v_uid), 'their email') || ' to arrange it.' else '.' end,
    jsonb_build_object('type', 'profile', 'id', v_uid));
end $$;

do $$
declare f text;
begin
  foreach f in array array['save_game_questions(uuid, jsonb)', 'start_game(uuid)', 'answer_trivia(uuid, int)', 'submit_quiz(uuid, int[])',
    'finish_game(uuid, int)', 'pick_game_winner(uuid, uuid)', 'unpick_game_winner(uuid, uuid)', 'claim_game_prize(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 4. New game → notify the artist's followers -----------------------------
create or replace function public.notify_followers_of_game()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, body, link)
    select f.follower_id, (select display_name from public.profiles where id = new.artist_id) || ' posted a new game: "' || new.title || '"',
           jsonb_build_object('type', 'artist', 'id', new.artist_id, 'tab', 'games')
    from public.follows f where f.following_id = new.artist_id;
  return new;
end $$;
drop trigger if exists trg_games_notify on public.games;
create trigger trg_games_notify after insert on public.games for each row execute function public.notify_followers_of_game();

-- 5. Realtime: live Scoreboard and prize updates ---------------------------
do $$
declare t text;
begin
  foreach t in array array['games', 'game_plays', 'game_prize_winners'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- 6. Small fix: votes only on image and video submissions (not text answers)
drop policy if exists votes_insert_own on public.submission_votes;
create policy votes_insert_own on public.submission_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_artist(auth.uid())
    and exists (
      select 1 from public.submissions s
      join public.challenges c on c.id = s.challenge_id
      where s.id = submission_id and s.fan_id <> auth.uid() and c.type::text in ('image', 'video')
    )
  );
