-- =====================================================================
-- Collabz · Upvotes / downvotes on image and video submissions
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- (Safe to re-run. Needs schema.sql to have been run first.)
-- Rules: fans only, one vote per submission, not on your own entry,
-- and only on image/video challenges.
-- =====================================================================

create table if not exists public.submission_votes (
  submission_id uuid not null references public.submissions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  value         smallint not null check (value in (-1, 1)),
  created_at    timestamptz not null default now(),
  primary key (submission_id, user_id)
);
create index if not exists submission_votes_sub_idx on public.submission_votes (submission_id);

alter table public.submission_votes enable row level security;
revoke update on public.submission_votes from anon, authenticated;   -- change a vote = delete + insert

drop policy if exists votes_read on public.submission_votes;
create policy votes_read on public.submission_votes for select to authenticated using (true);

drop policy if exists votes_insert_own on public.submission_votes;
create policy votes_insert_own on public.submission_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_artist(auth.uid())
    and exists (
      select 1 from public.submissions s
      join public.challenges c on c.id = s.challenge_id
      where s.id = submission_id and s.fan_id <> auth.uid() and c.type <> 'mc'
    )
  );

drop policy if exists votes_delete_own on public.submission_votes;
create policy votes_delete_own on public.submission_votes for delete to authenticated
  using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.submission_votes;
exception when duplicate_object then null;
end $$;
