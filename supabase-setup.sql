-- K4N Website Builder settings table
-- Run this in Supabase Dashboard > SQL Editor.
-- This table is separate from your existing articles table.

create table if not exists public.site_settings (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.site_settings enable row level security;

-- Public visitors can read the published homepage settings.
drop policy if exists "Public can read K4N site settings" on public.site_settings;
create policy "Public can read K4N site settings"
on public.site_settings for select
to anon, authenticated
using (true);

-- Only signed-in users can create or change site settings.
-- Keep Supabase public sign-ups disabled so only your two existing admin
-- accounts can authenticate. If other authenticated accounts exist, add an
-- explicit email allow-list policy instead of relying on this policy alone.
drop policy if exists "Authenticated admins can insert K4N site settings" on public.site_settings;
create policy "Authenticated admins can insert K4N site settings"
on public.site_settings for insert
to authenticated
with check (auth.uid() = updated_by);

drop policy if exists "Authenticated admins can update K4N site settings" on public.site_settings;
create policy "Authenticated admins can update K4N site settings"
on public.site_settings for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() = updated_by);

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- Optional initial row. The website can also display its built-in defaults
-- until the first Save & publish action from the Admin Dashboard.
insert into public.site_settings (id, settings)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
