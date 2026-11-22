create table if not exists public.study_tracker_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.study_tracker_data to authenticated;

alter table public.study_tracker_data enable row level security;

drop policy if exists "Only owner can select own data" on public.study_tracker_data;
drop policy if exists "Only owner can insert own data" on public.study_tracker_data;
drop policy if exists "Only owner can update own data" on public.study_tracker_data;
drop policy if exists "Only owner can delete own data" on public.study_tracker_data;

create policy "Only owner can select own data"
  on public.study_tracker_data
  for select
  using (auth.uid() = user_id);

create policy "Only owner can insert own data"
  on public.study_tracker_data
  for insert
  with check (auth.uid() = user_id);

create policy "Only owner can update own data"
  on public.study_tracker_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Only owner can delete own data"
  on public.study_tracker_data
  for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
