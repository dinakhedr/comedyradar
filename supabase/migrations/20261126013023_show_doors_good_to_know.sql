-- Show page extras (Dina, 2026-11-26): doors time and a "Good to know" list
-- (seating, parking, refund policy, photo rules...). Both optional.
-- The existing row-level security policies on public.shows cover these columns.
alter table public.shows
  add column doors_at timestamptz,
  add column good_to_know text[] not null default '{}';

alter table public.shows
  add constraint shows_doors_before_start check (doors_at is null or doors_at <= starts_at);

comment on column public.shows.doors_at is 'When doors open (optional). Shown as "Doors 8:30 PM" on the show page.';
comment on column public.shows.good_to_know is 'Short notes for the audience: seating, parking, refunds, photo rules.';
