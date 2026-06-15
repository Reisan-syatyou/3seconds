-- ============================================================
-- 1. profiles テーブル
-- ============================================================
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  username   text unique not null,
  avatar_url text,
  bio        text default '',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- 2. posts テーブル
-- ============================================================
create table public.posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  video_url  text not null,
  caption    text default '',
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "posts_select" on public.posts
  for select using (true);

create policy "posts_insert" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "posts_delete" on public.posts
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 3. Storage: videos バケット (ダッシュボードで作成後に実行)
-- ============================================================
create policy "videos_select" on storage.objects
  for select using (bucket_id = 'videos');

create policy "videos_insert" on storage.objects
  for insert with check (
    bucket_id = 'videos' and auth.role() = 'authenticated'
  );
