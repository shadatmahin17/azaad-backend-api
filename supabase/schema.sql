-- Create a profile table linked to Supabase auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_profiles_updated_at();

alter table public.profiles enable row level security;

-- Allow authenticated users to read/update only their own row
create policy "Read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Bucket used by /api/profile/avatar endpoint
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
