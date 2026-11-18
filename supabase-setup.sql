-- K4N Newsroom database setup
-- Run this entire script in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text default '',
  content_html text not null,
  category text not null default 'National',
  author text not null default 'K4N News Desk',
  image_url text default '',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists articles_status_published_at_idx
on public.articles(status, published_at desc);

alter table public.articles enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
on public.articles for select
using (status = 'published');

drop policy if exists "Authenticated admins can read all articles" on public.articles;
create policy "Authenticated admins can read all articles"
on public.articles for select to authenticated
using (true);

drop policy if exists "Authenticated admins can insert articles" on public.articles;
create policy "Authenticated admins can insert articles"
on public.articles for insert to authenticated
with check (true);

drop policy if exists "Authenticated admins can update articles" on public.articles;
create policy "Authenticated admins can update articles"
on public.articles for update to authenticated
using (true) with check (true);

drop policy if exists "Authenticated admins can delete articles" on public.articles;
create policy "Authenticated admins can delete articles"
on public.articles for delete to authenticated
using (true);

-- Public image bucket. Only signed-in newsroom users may upload/change/delete images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images','article-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view K4N article images" on storage.objects;
create policy "Public can view K4N article images"
on storage.objects for select
using (bucket_id = 'article-images');

drop policy if exists "Admins can upload K4N article images" on storage.objects;
create policy "Admins can upload K4N article images"
on storage.objects for insert to authenticated
with check (bucket_id = 'article-images');

drop policy if exists "Admins can update K4N article images" on storage.objects;
create policy "Admins can update K4N article images"
on storage.objects for update to authenticated
using (bucket_id = 'article-images') with check (bucket_id = 'article-images');

drop policy if exists "Admins can delete K4N article images" on storage.objects;
create policy "Admins can delete K4N article images"
on storage.objects for delete to authenticated
using (bucket_id = 'article-images');
