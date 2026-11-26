# Comedy Radar — Show Aggregator Agent (spec)

Version 1.0 · 26 November 2026 · Owner: Dina Khedr
Part of the Comedy Radar build. Read together with `docs/website-spec.md` (data model, section 10; admin panel, section 11.5).

---

## 1. Purpose

A background agent that finds **upcoming stand-up comedy shows** on the internet, turns each announcement into a structured show, and puts it in the **super admin review queue**. Nothing the agent finds is published automatically: Dina approves, edits or rejects every item.

Coverage follows the three zones: shows in Egypt, Egyptian comedians abroad, visiting comedians in Egypt.

## 2. Principles

1. **Human in the loop:** agent output is always saved as `pending` and appears in the admin review queue (tab "From the agent").
2. **Official and allowed sources only:** Instagram through Meta's official API; websites only where their terms and `robots.txt` allow it. No scraping of Instagram pages, no logging in as a user, no bypassing limits.
3. **Always keep the source:** every show stores `source_type = 'aggregated'` and `source_url` (the post or page), and the poster credit (e.g. "Poster: @handle").
4. **Never invent data:** if a field is not in the source (time, price, venue), leave it empty. Store a confidence score per item.
5. **Idempotent:** running twice never creates duplicates.

## 3. Sources

| Source | How | Notes |
|---|---|---|
| **A. Instagram professional accounts** (comedians, groups, venues, promoters on the watch list) | Instagram Graph API **Business Discovery** (`/{ig-user-id}?fields=business_discovery.username(<handle>){media{caption,media_type,media_url,permalink,timestamp,children{media_url}}}`) using the **@comedy_radar** professional account | Works only for Business / Creator accounts; personal and age-gated accounts return nothing. Respect the app rate limits; spread calls over the run. |
| **B. Websites** (ticketing sites, venue "what's on" pages) | Server-side fetch of listed URLs, parse HTML / JSON-LD `Event` data | Only URLs marked `allowed = true` in the watch list after checking terms and `robots.txt`. Identify with a clear user agent. |
| **C. Web search** | Claude API with the web search tool, using saved queries (e.g. "stand up comedy Cairo this week", "[comedian] tour 2027") | Results go through the same extraction; always keep the result URL as source. |
| **D. Manual "Add from link"** | Admin pastes a post URL, caption text and/or uploads a poster image | Covers personal Instagram accounts and anything else; same extraction and review flow. **Build this first** — it works before Meta approval. |

## 4. Pipeline (each run)

1. **Collect:** for each active source, fetch new items since `last_checked_at`; store each raw item once in `ingest_items` (unique on `source_id + external_id`).
2. **Filter:** skip items older than 60 days or with no future date signal.
3. **Extract (Claude API):** send caption text + poster image(s) and the run date; ask for structured JSON (tool use / JSON schema):
   - `is_show_announcement` (bool), `is_cancellation_or_change` (bool)
   - `title`, `performers[]` (name, Instagram handle if tagged), `is_group_show`, `tour_name`
   - `dates[]` — one item per date: `date`, `doors_time`, `show_time`, `city`, `country`, `venue_name`, `ticket_url`, `sold_out`
   - `price_min`, `price_max`, `currency`, `language`, `age_rating`
   - `confidence` (0–1) and `notes` (what was unclear)
   Rules: understand Arabic and English (including Egyptian Arabic and Arabic numerals); dates without a year = next occurrence after the post date; times in `Africa/Cairo` unless another city is clear; one post with several dates = several shows (and a tour if a tour name appears).
4. **Match:** performers → `comedians` / `comedy_groups` by Instagram handle, then `name` / `name_ar` with `pg_trgm` similarity; venues → `venues` the same way; cities → `cities`. Unknown performer or venue → create a **pending** profile / venue suggestion (marked `seeded = true`) for review, never a published one.
5. **De-duplicate:** an item is a duplicate if a show already exists with the same performer(s) and the same `starts_at` date (± 3 hours) in the same city, or the same `ticket_url`. If the duplicate is missing data the new item has (ticket link, price, poster), create an **update suggestion** instead of a new show.
6. **Save for review:** create the show(s) with `status = 'pending'`, `source_type = 'aggregated'`, `source_url`, `zone` worked out from city country vs performer home country, poster copied into the `posters` bucket (Instagram media URLs expire), and link the `ingest_item`. Cancellations and changes become update suggestions on the existing show.
7. **Log:** write counts and errors to `ingest_runs`; record each decision on `ingest_items.status`.

## 5. Data model additions (migration)

```sql
create table ingest_sources (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- 'instagram' | 'website' | 'search' 
  handle text,                        -- Instagram username (no @)
  url text,                           -- website page
  query text,                         -- saved web search query
  comedian_id uuid references comedians(id),
  group_id uuid references comedy_groups(id),
  venue_id uuid references venues(id),
  allowed boolean default true,       -- websites: terms / robots.txt checked
  active boolean default true,
  last_checked_at timestamptz,
  last_error text,
  notes text,
  created_at timestamptz default now()
);

create table ingest_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null,              -- 'schedule' | 'manual' | 'single_source'
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text default 'running',      -- 'running' | 'done' | 'failed'
  items_found int default 0,
  shows_created int default 0,
  updates_suggested int default 0,
  duplicates int default 0,
  errors int default 0,
  log jsonb
);

create table ingest_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references ingest_sources(id),
  run_id uuid references ingest_runs(id),
  external_id text not null,          -- Instagram media id, or hash of the URL / text
  permalink text,
  caption text,
  media_urls text[],
  posted_at timestamptz,
  raw jsonb,
  extracted jsonb,                    -- the structured output from Claude
  confidence numeric,
  status text default 'new',          -- 'new' | 'not_a_show' | 'duplicate' | 'queued' | 'update_suggested' | 'error'
  show_ids uuid[],                    -- shows created or updated from this item
  error text,
  created_at timestamptz default now(),
  unique (source_id, external_id)
);

create table show_update_suggestions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references shows(id) on delete cascade not null,
  ingest_item_id uuid references ingest_items(id),
  changes jsonb not null,             -- { field: { from, to } }, e.g. ticket_url, status 'cancelled'
  status text default 'pending',      -- 'pending' | 'applied' | 'dismissed'
  created_at timestamptz default now()
);
```

RLS: all four tables are readable and writable **only by the super admin and the server (service role)**.

## 6. Admin panel additions (super admin)

Add an **Agent** item to the admin sidebar (style from `docs/website-spec.md`, section 11.5):
1. **Review queue → new tab "From the agent":** each card shows the source preview (post image, caption, link to the original), the extracted fields in an editable form, confidence, matched performers / venue (or "new — will be created as pending"), duplicate warnings, and actions **Approve and publish**, **Save changes**, **Not a show**, **Reject**. Update suggestions show a before / after table with **Apply** / **Dismiss**.
2. **Agent → Sources:** the watch list (type, handle / URL / query, linked profile or venue, active, allowed, last checked, last error), add / edit / pause, "Check now".
3. **Agent → Runs:** list of runs with counts and errors, "Run now", and a **dry run** option (extract and show results without saving shows).
4. **Add from link:** paste a URL and/or caption, optional poster upload → extract → review card.

## 7. Schedule and endpoints

- `POST /api/agent/run` — runs the pipeline; protected by `CRON_SECRET` (schedule) or a super admin session (manual).
- `POST /api/agent/extract` — single item (Add from link); super admin only.
- Schedule: **once a day at 10:00 Cairo time** via Vercel Cron (or Vercel Schedules); runs must finish within the function time limit — process sources in batches and continue in the next invocation if needed.
- All Claude and Meta calls run **server-side only**.

## 8. Environment variables

`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (current Claude model for extraction), `META_APP_ID`, `META_APP_SECRET`, `IG_BUSINESS_ACCOUNT_ID` (the @comedy_radar IG user id), `IG_ACCESS_TOKEN` (long-lived; plan a refresh before it expires), `CRON_SECRET`. Add to `.env.local` and Vercel; never commit.

## 9. Meta setup (Dina, before source A works)

1. Switch Instagram **@comedy_radar** to a professional (Business or Creator) account.
2. Create a Facebook Page for Comedy Radar and link @comedy_radar to it.
3. Create a Meta developer app (comedyradarnetwork@gmail.com), add the Instagram product (Instagram API with Facebook Login), and request the permissions listed in Meta's Business Discovery reference.
4. Generate a long-lived access token and the IG business account id; give them to Claude Code via `.env.local` (never paste them in chat or commit them).
Until this is done, use sources B, C and D.

## 10. Build order

1. Foundation: Next.js + Supabase client, and the migrations from `docs/website-spec.md` section 10 (at least countries, cities, venues, comedians, comedy_groups, group_members, tours, shows, show_performers, accounts, activity_log) + this file's section 5 tables, with RLS.
2. Extraction module (Claude API, JSON schema) with **tests** on sample captions in Arabic and English (single date, several dates / tour, no year, cancellation, not a show).
3. Matching and de-duplication with tests.
4. Source D "Add from link" + minimal admin review screen (super admin only) — usable end-to-end.
5. Sources C (web search) and B (allowed websites).
6. Source A (Instagram Business Discovery) once Meta credentials exist.
7. Runs log, Sources page, schedule, dry run.

## 11. Definition of done

- Pasting a real show post creates a correct pending show (or several for a tour) with source link and poster, matched to existing profiles, in the review queue.
- Running twice on the same sources creates no duplicates.
- A cancellation post creates an update suggestion on the existing show.
- Every run is logged; errors on one source do not stop the others.
- No agent data is public until approved.
