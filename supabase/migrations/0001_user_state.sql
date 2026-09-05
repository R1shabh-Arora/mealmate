-- MealMate: one JSON document per signed-in user.
--
-- Row Level Security means the database itself refuses to return, insert or
-- change any row whose user_id isn't the caller's — whatever the app does.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "read own kitchen"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "create own kitchen"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "update own kitchen"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own kitchen"
  on public.user_state for delete
  using (auth.uid() = user_id);
