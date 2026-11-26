-- Comedy Radar: core schema (docs/website-spec.md, section 10).
-- Tables, types and indexes. Security rules (RLS) are in later migrations.

create extension if not exists pg_trgm with schema extensions;

-- Private schema for helper functions. It is not exposed through the Data API.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.content_status as enum ('draft', 'pending', 'published', 'archived');
create type public.show_zone      as enum ('local', 'outbound', 'inbound');
create type public.show_status    as enum ('draft', 'pending', 'published', 'sold_out', 'cancelled');
create type public.show_signal    as enum ('none', 'new', 'strong', 'fading');
create type public.profile_role   as enum ('admin', 'moderator');

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'EG', 'AE'
  name text not null,
  region text,                        -- 'Egypt', 'Gulf', 'Levant', 'Europe', 'North America'
  is_market boolean not null default false
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id),
  name text not null,
  slug text not null,
  unique (country_id, slug)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  name text not null,
  name_ar text,
  slug text unique not null,
  address text,
  map_url text,
  capacity int,
  status public.content_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null
);
create index on public.venues (city_id);
create index on public.venues (created_by);

-- ---------------------------------------------------------------------------
-- Performers
-- ---------------------------------------------------------------------------
create table public.comedians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  slug text unique not null,
  bio text,
  photo_url text,
  home_country_id uuid references public.countries(id),
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  facebook_url text,
  status public.content_status not null default 'draft',
  verified boolean not null default false,
  seeded boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.comedians (status);
create index on public.comedians (home_country_id);
create index on public.comedians (created_by);
create index comedians_name_trgm on public.comedians using gin (name extensions.gin_trgm_ops);
create index comedians_name_ar_trgm on public.comedians using gin (name_ar extensions.gin_trgm_ops);

create table public.comedy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  slug text unique not null,
  bio text,
  photo_url text,
  home_country_id uuid references public.countries(id),
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  facebook_url text,
  status public.content_status not null default 'draft',
  verified boolean not null default false,
  seeded boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.comedy_groups (status);
create index on public.comedy_groups (home_country_id);
create index on public.comedy_groups (created_by);
create index comedy_groups_name_trgm on public.comedy_groups using gin (name extensions.gin_trgm_ops);
create index comedy_groups_name_ar_trgm on public.comedy_groups using gin (name_ar extensions.gin_trgm_ops);

create table public.group_members (
  group_id uuid references public.comedy_groups(id) on delete cascade,
  comedian_id uuid references public.comedians(id) on delete cascade,
  display_order int not null default 1,
  joined_on date,
  left_on date,                       -- null = current member
  link_status text not null default 'accepted' check (link_status in ('pending', 'accepted', 'declined')),
  primary key (group_id, comedian_id)
);
create index on public.group_members (comedian_id);

-- ---------------------------------------------------------------------------
-- Tours (owned by one comedian OR one group)
-- ---------------------------------------------------------------------------
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  poster_url text,
  comedian_id uuid references public.comedians(id),
  group_id uuid references public.comedy_groups(id),
  status public.content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((comedian_id is null) <> (group_id is null))
);
create index on public.tours (comedian_id);
create index on public.tours (group_id);
create index on public.tours (created_by);

-- ---------------------------------------------------------------------------
-- Shows
-- ---------------------------------------------------------------------------
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_id uuid references public.venues(id),
  city_id uuid not null references public.cities(id),
  zone public.show_zone not null,
  market_country_id uuid not null references public.countries(id),
  tour_id uuid references public.tours(id),
  price_min numeric,
  price_max numeric,
  currency text not null default 'EGP',
  ticket_url text,
  poster_url text,
  language text,
  age_rating text,
  source_type text not null default 'aggregated' check (source_type in ('aggregated', 'creator')),
  source_url text,
  status public.show_status not null default 'draft',
  signal public.show_signal not null default 'new',
  signal_request public.show_signal,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.shows (starts_at);
create index on public.shows (zone, status, starts_at);
create index on public.shows (status, starts_at);
create index on public.shows (tour_id);
create index on public.shows (city_id);
create index on public.shows (venue_id);
create index on public.shows (market_country_id);
create index on public.shows (created_by);
create index on public.shows (updated_by);
create index shows_title_trgm on public.shows using gin (title extensions.gin_trgm_ops);

create table public.show_performers (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  comedian_id uuid references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  billing_order int not null default 1,
  link_status text not null default 'accepted' check (link_status in ('pending', 'accepted', 'declined')),
  check ((comedian_id is null) <> (group_id is null))
);
create index on public.show_performers (show_id);
create index on public.show_performers (comedian_id);
create index on public.show_performers (group_id);

-- ---------------------------------------------------------------------------
-- Podcasts (hosted by individual comedians only)
-- ---------------------------------------------------------------------------
create table public.podcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  cover_url text,
  apple_podcasts_url text,
  spotify_url text,
  anghami_url text,
  podu_url text,
  youtube_url text,
  is_active boolean not null default true,
  status public.content_status not null default 'published',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.podcasts (created_by);

create table public.podcast_hosts (
  podcast_id uuid references public.podcasts(id) on delete cascade,
  comedian_id uuid references public.comedians(id) on delete cascade,
  display_order int not null default 1,
  link_status text not null default 'accepted' check (link_status in ('pending', 'accepted', 'declined')),
  primary key (podcast_id, comedian_id)
);
create index on public.podcast_hosts (comedian_id);

-- ---------------------------------------------------------------------------
-- Spotlight
-- ---------------------------------------------------------------------------
create table public.spotlight_placements (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  priority int not null default 0,
  is_paid boolean not null default false,
  amount numeric,
  currency text not null default 'EGP',
  client_name text,
  notes text,
  preferred_slide int check (preferred_slide between 1 and 5),
  impressions int not null default 0,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.spotlight_placements (show_id);
create index on public.spotlight_placements (starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- Site settings (one row per key)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on public.site_settings (updated_by);

-- ---------------------------------------------------------------------------
-- Audience
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  city_id uuid references public.cities(id),
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.newsletter_subscribers (city_id);

-- ---------------------------------------------------------------------------
-- Accounts and access
-- ---------------------------------------------------------------------------
create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  account_type text not null default 'comedian' check (account_type in ('comedian', 'manager')),
  is_super_admin boolean not null default false,   -- set ONLY directly in the database
  is_suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.dashboard_members (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null references public.accounts(id) on delete cascade,
  member_account_id uuid references public.accounts(id) on delete cascade,
  invite_email text,
  scope text not null default 'selected' check (scope in ('all', 'selected')),
  all_role public.profile_role,
  status text not null default 'invited' check (status in ('invited', 'active', 'removed', 'expired')),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  unique (owner_account_id, member_account_id),
  check (scope <> 'all' or all_role is not null)
);
create index on public.dashboard_members (member_account_id);

create table public.profile_access (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  comedian_id uuid references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  role public.profile_role not null,
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  invited_by uuid references public.accounts(id) on delete set null,
  via_dashboard_member_id uuid references public.dashboard_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((comedian_id is null) <> (group_id is null)),
  unique (account_id, comedian_id),
  unique (account_id, group_id)
);
create index on public.profile_access (comedian_id);
create index on public.profile_access (group_id);
create index on public.profile_access (invited_by);
create index on public.profile_access (via_dashboard_member_id);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('claim', 'invite')),
  account_id uuid references public.accounts(id) on delete cascade,
  invite_email text,
  comedian_id uuid references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  role public.profile_role not null default 'admin',
  relation text,
  proof_method text check (proof_method in ('official_dm', 'comedian_confirms', 'business_email', 'document', 'call')),
  proof_value text,
  proof_file_path text,
  confirmed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  decided_by uuid references public.accounts(id) on delete set null,
  decision_reason text,
  admin_note text,                    -- internal, super admins only
  created_at timestamptz not null default now(),
  check ((comedian_id is null) <> (group_id is null))
);
create index on public.access_requests (account_id);
create index on public.access_requests (comedian_id);
create index on public.access_requests (group_id);
create index on public.access_requests (decided_by);
create index on public.access_requests (status, created_at);

create table public.link_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('group_member', 'lineup_tag', 'podcast_cohost')),
  from_account_id uuid not null references public.accounts(id) on delete cascade,
  target_comedian_id uuid not null references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  show_id uuid references public.shows(id) on delete cascade,
  podcast_id uuid references public.podcasts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  decided_by uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.link_requests (from_account_id);
create index on public.link_requests (target_comedian_id);
create index on public.link_requests (group_id);
create index on public.link_requests (show_id);
create index on public.link_requests (podcast_id);
create index on public.link_requests (decided_by);

create table public.activity_log (
  id bigint generated always as identity primary key,
  account_id uuid references public.accounts(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log (account_id);
create index on public.activity_log (entity_type, entity_id);
create index on public.activity_log (created_at);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  sender_type text check (sender_type in ('fan', 'comedian', 'manager', 'venue', 'press', 'other')),
  topic text check (topic in ('wrong_detail', 'cancelled', 'update_or_remove', 'claim_help', 'partnership', 'other')),
  page_url text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  comedian_id uuid references public.comedians(id) on delete cascade,
  group_id uuid references public.comedy_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((comedian_id is null) <> (group_id is null)),
  unique (user_id, comedian_id),
  unique (user_id, group_id)
);
create index on public.tracks (comedian_id);
create index on public.tracks (group_id);

-- ---------------------------------------------------------------------------
-- Row Level Security on every table (policies follow in the next migrations).
-- ---------------------------------------------------------------------------
alter table public.countries              enable row level security;
alter table public.cities                 enable row level security;
alter table public.venues                 enable row level security;
alter table public.comedians              enable row level security;
alter table public.comedy_groups          enable row level security;
alter table public.group_members          enable row level security;
alter table public.tours                  enable row level security;
alter table public.shows                  enable row level security;
alter table public.show_performers        enable row level security;
alter table public.podcasts               enable row level security;
alter table public.podcast_hosts          enable row level security;
alter table public.spotlight_placements   enable row level security;
alter table public.site_settings          enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.accounts               enable row level security;
alter table public.dashboard_members      enable row level security;
alter table public.profile_access         enable row level security;
alter table public.access_requests        enable row level security;
alter table public.link_requests          enable row level security;
alter table public.activity_log           enable row level security;
alter table public.contact_messages       enable row level security;
alter table public.tracks                 enable row level security;
