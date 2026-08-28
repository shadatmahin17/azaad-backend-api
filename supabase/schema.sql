-- ─── 1. Profiles Table ─────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at timestamp trigger
create or replace function public.handle_profiles_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Automatically create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─── 2. Profiles Row Level Security (RLS) ───────────────────────────────────────

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── 3. Storage Buckets Configuration ──────────────────────────────────────────

-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Songs bucket
insert into storage.buckets (id, name, public)
values ('songs', 'songs', true)
on conflict (id) do nothing;

-- ─── 4. Storage Policies: Avatars Bucket ────────────────────────────────────────

drop policy if exists "Anyone can view avatars" on storage.objects;
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload their own avatar" on storage.objects;
create policy "Authenticated users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name)) = auth.uid()::text
  );

drop policy if exists "Authenticated users can update their own avatar" on storage.objects;
create policy "Authenticated users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name)) = auth.uid()::text
  );

drop policy if exists "Authenticated users can delete their own avatar" on storage.objects;
create policy "Authenticated users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name)) = auth.uid()::text
  );

-- ─── 5. Storage Policies: Songs Bucket ──────────────────────────────────────────

drop policy if exists "Anyone can view songs media" on storage.objects;
create policy "Anyone can view songs media"
  on storage.objects for select
  using (bucket_id = 'songs');

drop policy if exists "Authenticated users can upload songs media" on storage.objects;
create policy "Authenticated users can upload songs media"
  on storage.objects for insert
  with check (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Users can update their own songs media" on storage.objects;
create policy "Users can update their own songs media"
  on storage.objects for update
  using (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name)) = auth.uid()::text
      or auth.uid() = owner
    )
  );

drop policy if exists "Users can delete their own songs media" on storage.objects;
create policy "Users can delete their own songs media"
  on storage.objects for delete
  using (
    bucket_id = 'songs'
    and auth.role() = 'authenticated'
    and (
      (storage.foldername(name)) = auth.uid()::text
      or auth.uid() = owner
    )
  );
