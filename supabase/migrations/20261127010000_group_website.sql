-- Optional website of a comedy group (Dina, 2026-11-27).
-- Edited with the rest of the group profile, so the existing RLS policies of
-- comedy_groups already cover it.

alter table public.comedy_groups
  add column if not exists website_url text
    constraint comedy_groups_website_url_check check (
      website_url is null or (website_url ~ '^https?://' and length(website_url) <= 300)
    );

comment on column public.comedy_groups.website_url is 'The group''s own website (https://…), optional.';
