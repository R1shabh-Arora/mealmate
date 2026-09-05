-- Per-user daily counter for AI Kitchen calls.
--
-- Every call costs real money, so a runaway loop or a shared link must not be
-- able to run up a bill. The Edge Function checks and increments this with the
-- service-role key, which bypasses Row Level Security.
--
-- Note there are deliberately NO policies below. RLS is enabled and nothing
-- grants access, so `anon` and `authenticated` cannot read or write this table
-- at all — a user can't reset their own counter from the browser. Only the
-- service role (server side, never shipped to the client) can touch it.

create table if not exists public.ai_usage (
  user_id  uuid        not null references auth.users (id) on delete cascade,
  day      date        not null default (now() at time zone 'utc')::date,
  calls    integer     not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Old rows are useless once the day rolls over; keep the table small.
create index if not exists ai_usage_day_idx on public.ai_usage (day);

/**
 * Atomically claim one call against today's quota.
 *
 * Returns the number of calls used *after* this one. The caller compares that
 * against its limit. Doing the read and the increment in one statement means
 * two requests racing can't both see "9 of 10 used" and both proceed.
 */
create or replace function public.claim_ai_call(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
begin
  insert into public.ai_usage (user_id, day, calls)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
    do update set calls = public.ai_usage.calls + 1
  returning calls into used;
  return used;
end;
$$;

revoke all on function public.claim_ai_call(uuid) from public, anon, authenticated;
