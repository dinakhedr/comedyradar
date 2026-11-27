-- Optional website of a comedian (Dina, 2026-11-27), like comedy_groups.website_url.
-- Edited with the rest of the comedian profile, so the existing RLS policies of
-- comedians already cover it.

alter table public.comedians
  add column if not exists website_url text
    constraint comedians_website_url_check check (
      website_url is null or (website_url ~ '^https?://' and length(website_url) <= 300)
    );

comment on column public.comedians.website_url is 'The comedian''s own website (https://…), optional.';
