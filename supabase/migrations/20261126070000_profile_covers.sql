-- Cover photo for comedian and group profiles (Dina, 2026-11-26).
-- The group page header uses it as its wide photo; comedian pages don't show it yet.
alter table public.comedians add column cover_url text;
alter table public.comedy_groups add column cover_url text;

comment on column public.comedians.cover_url is 'Wide cover photo (not shown on the comedian page yet).';
comment on column public.comedy_groups.cover_url is 'Wide cover photo: the group page header photo (falls back to photo_url).';
