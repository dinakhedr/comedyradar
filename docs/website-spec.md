# Comedy Radar — Website Specification

Version 1.5 · 26 November 2026 · Owner: Dina Khedr

This file is the build brief for the Comedy Radar website. It is written so it can be handed to Claude Code (on desktop) to build the real site with **GitHub + Supabase + Vercel**. Brand source of truth: *Comedy Radar — Brand Guidelines* (https://claude.ai/artifact/5f4tp38iM7CDuHHFzhyk3Q). Visual reference: *Comedy Radar — Design Canvas*, page "Website pages" — Homepage v2, All shows, Show page, All tours, Tour page, All comedians, Comedian page, All groups, Group page and Search results, each in desktop and mobile; row 2 = account and creator dashboard pages; row 3 = super admin panel; row 4 = supporting and system pages (https://claude.ai/artifact/FGmAJHWJCxMmPbURr9CnbZ).

**Changes in 1.5:** supporting pages (About, FAQ, Contact, Privacy, Terms) and system pages (404, error, cancelled show, profile unavailable, account screens) — section 7.5–7.6; **content sourcing** rule (shows aggregated from public accounts, plus creators); contact email **comedyradarnetwork@gmail.com**; updated footer; build setup for the existing GitHub repo `comedyradar` and Supabase account (section 15).

**Changes in 1.4:** dashboard pages Add a tour, Shows list and Tours list; the complete **super admin panel** (Overview, Review queue, Profiles, Shows and tours, Accounts, Spotlight, Activity log, Settings), designed on the canvas (row 3); decisions: **English only at launch**, **Instagram @comedy_radar** is the only social account, domain on hold.

**Changes in 1.3:** sign up with email + password (stored only as a hash) or Google; account types simplified to Comedian / Manager or agent; claim proof without bio codes (message from the official account, confirmation by the comedian, business email, document, call); **Team and access moved to the dashboard level** — each team member gets all profiles or selected profiles, with a role per profile (table `dashboard_members`).

**Changes in 1.2:** accounts for comedians and managers with **per-profile roles (Admin / Moderator)**, super admin (Dina), profile creation and claiming, consent for links between profiles, creator dashboard pages (section 11), updated routes, data model and RLS. The public "Submit a show" form is replaced by free accounts.

**Changes in 1.1:** homepage v2 (this month, full-width search, Spotlight carousel, 8 Coming up cards, tours only, groups in Comedians to track, no prices on cards, "Get tickets" CTA); new **comedian groups**, **tours** and **podcasts** in the structure, routes and data model.

---

## 1. What the website is

Comedy Radar lists live stand-up comedy in one place:

| Coverage zone | Meaning | Example |
|---|---|---|
| **Local Range** | Every stand-up show in the launch country | A show in Cairo, Alexandria, Sheikh Zayed |
| **Outbound Range** | That country's comedians performing abroad | An Egyptian comedian in Dubai or London |
| **Inbound Range** | International and Arab comedians performing in the country | A visiting act in Cairo |

- **Launch market:** Egypt. The structure must allow new countries later without redesign (country and city are data, not hard-coded pages).
- **Tagline:** If it's live and it's funny, it's on the radar.
- **Primary goal of the homepage:** get visitors to this month's shows fast.
- **Content sourcing:** Comedy Radar gathers show details from comedians', groups' and venues' **public accounts** (mainly Instagram) and from creators who list their shows on Comedy Radar. Every show keeps a link to its source and to the official ticket seller. Comedians can ask for a correction or removal at any time through the Contact page. Profiles created this way are marked "seeded by Comedy Radar" until they are claimed.
- **Contact:** comedyradarnetwork@gmail.com · Instagram @comedy_radar.
- **Revenue stream (phase 2):** paid Spotlight placements. At launch, the admin (Dina) chooses Spotlight shows manually, free of charge.

### Core entities

| Entity | What it is | Has its own page |
|---|---|---|
| **Comedian** | One individual performer | Yes — `/comedians/[slug]` |
| **Comedy group** | A fixed act of several comedians performing together, e.g. **HighFive** = Badr Nour, Gamal Ramzy, Abdelrahman Mohamed, Pola Samuel, Fikry Tarek | Yes — `/groups/[slug]` |
| **Show** | One performance on one date at one venue, by a comedian, several comedians, or a group | Yes — `/shows/[slug]` |
| **Tour** | A named series of shows by one comedian or one group across cities/countries | Yes — `/tours/[slug]` (lists a card for each show) |
| **Podcast** | An audio show hosted by one or more comedians, e.g. **Estry Mni** (Badr Nour, Gamal Ramzy, Abdelrahman Mohamed). Not the same as a comedy group | No own page — shown on each host's **individual comedian page** only |
| **Venue** | A place where shows happen | Yes — `/venues/[slug]` (phase 2) |
| **Account** | A person who signs in: a comedian, a manager or an assistant. Gets access to one or more comedian/group profiles with a role (section 11) | No public page — uses the creator dashboard `/dashboard` |

Rules:
- A comedian can belong to one or more groups and still perform solo shows. Each comedian and each group has a separate page.
- A group show is linked to the group (and through it to its members). A solo show is linked to the comedian. A show can also have a lineup of several individual comedians.
- Podcast hosts are always individual comedians. A podcast appears on every host's comedian page, never on group pages.

### Radar vocabulary (use in the UI)

| Term | Used for |
|---|---|
| On the Radar | Upcoming shows |
| New Signal | Newly added show (badge) |
| Strong Signal | Trending / high demand (badge) |
| Fading Signal | Last tickets (badge) |
| Track | Follow a comedian or a group |
| Within Range | Near you / in your city |
| New Territory | A newly launched country |
| Spotlight | The featured (future paid) carousel |

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Code | **GitHub** repository `comedyradar` | `main` = production, feature branches → pull requests |
| Framework | **Next.js (App Router) + TypeScript** | Server components for listings; good SEO |
| Styling | **Tailwind CSS** with brand tokens (section 3) | Fonts via `next/font/google`: Luckiest Guy, Nunito |
| Database, auth, files | **Supabase** | Postgres, Row Level Security, Auth (email + password, Google; magic link for password reset), Storage for posters and photos |
| Hosting | **Vercel** | Connected to the GitHub repo; preview deploy per pull request |
| Time zone | `Africa/Cairo` for display | Store all times as `timestamptz` (UTC) |
| Analytics | Vercel Analytics (start), add GA4 later if needed | Track clicks on "Get tickets", Spotlight slides, podcast platform links |

**Environment variables (Vercel and `.env.local`):**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the new publishable key, `sb_publishable_…`, safe in the browser), `SUPABASE_SECRET_KEY` (the new secret key, `sb_secret_…`, server only, never exposed to the browser), `NEXT_PUBLIC_SITE_URL`.
The project uses Supabase's new API keys; the legacy anon and service role keys are not used.

---

## 3. Brand tokens (from the Brand Guidelines)

```css
--radar-purple:      #2B0B4F; /* primary background */
--spotlight-yellow:  #FFD60A; /* accent, primary buttons, RADAR on dark */
--laugh-pink:        #FF4D8D; /* waves, tags, badges */
--laugh-pink-deep:   #E63E7A; /* RADAR on light, 24px+ text only */
--radar-plum:        #4A1470; /* cards and panels on purple */
--plum-deep:         #3D1470; /* image placeholders, tour band background */
--plum-line:         #5A2A86; /* outlines of secondary buttons and chips */
--stage-black:       #121212; /* alternative dark background */
--lavender:          #F1EAFB; /* soft light background */
--lavender-text:     #CDBEE6; /* secondary text on purple */
--white:             #FFFFFF;
```

- **Rules:** never yellow text on white; never white text on yellow. Proportions ≈ 60% purple, 25% white/lavender, 10% yellow, 5% pink.
- **Type:** Display = Luckiest Guy (uppercase, short headlines only). Text = Nunito 400 / 700 / 800.
- **Scale (px):** display-xl 64 · display-lg 48 · display-md 32 · heading 22 · body 16 · small 14 · label 13.
- **Shapes:** cards radius 20px (Spotlight 28px), buttons radius 12px, filter chips fully rounded (pill).
- **Patterns:** purple base, Radar Plum cards, yellow primary buttons, pill filter chips, yellow newsletter band.
- **Primary CTA wording:** **"Get tickets"** on every show card and show page. Tour cards use **"View tour"**. Sold-out shows use **"Join waitlist"** (outline button).
- **No prices on any card** (Spotlight, Coming up, tour, listing cards). Price appears only on the show page.
- **Logo:** COMEDY (white) stacked over RADAR (yellow) in Luckiest Guy, with the retro mic icon and volume waves (yellow, pink, pink 55%). Export the SVG files from the Brand Guidelines into `/public/brand/`.

---

## 4. Sitemap and routes

| Section | Route | Purpose |
|---|---|---|
| Homepage | `/` | This month's shows, Spotlight carousel, tours, comedians and groups to track, newsletter |
| Shows | `/shows` | All upcoming shows (all zones), filters: date, city, zone, comedian/group |
| Shows by city | `/shows/city/[city]` | e.g. `/shows/city/cairo` |
| Show page | `/shows/[slug]` | One template for solo, lineup, group and tour shows |
| Tours | `/tours` | All current and upcoming tours (comedians and groups) |
| Tour page | `/tours/[slug]` | Tour header + a card for each show on the tour |
| Comedians | `/comedians` | Directory of individual comedians, search, filter |
| Comedian page | `/comedians/[slug]` | Bio, groups they belong to, upcoming shows, tours, **podcasts** |
| Groups | `/groups` | Directory of comedy groups |
| Search | `/search?q=` | Results across groups, comedians, shows, tours and venues |
| Group page | `/groups/[slug]` | Group bio, member cards (link to each comedian), group shows, group tours |
| Venues | `/venues`, `/venues/[slug]` | All venues with city chips and square logos; venue page with logo, area, links and upcoming shows. In the top menu after Groups (2026-11-26) |
| List your shows | `/for-comedians` | Free accounts for comedians and managers (replaces the old "Submit a show" form) → sign up |
| Sign up / Sign in | `/signup`, `/signin`, `/reset-password` | Email + password or Google; one account for comedians, managers and their team members |
| Creator dashboard | `/dashboard` | Profile switcher, overview of all managed profiles, upcoming shows, pending items |
| Create or claim a profile | `/dashboard/profiles/new` | Create a new comedian/group profile, or claim one that already exists |
| Shows and tours | `/dashboard/shows`, `/dashboard/shows/new`, `/dashboard/tours`, `/dashboard/tours/new` | Lists, add, edit, mark sold out or cancel |
| Edit profile | `/dashboard/p/[slug]/edit` | Bio, photos, links, group members, podcasts |
| Team and access | `/dashboard/team` (filter by profile; also linked from each profile as `/dashboard/team?profile=[slug]`) | Invite team members to all profiles in the dashboard or to selected profiles, with a role per profile |
| Requests | `/dashboard/requests` | Group invitations, lineup tags, podcast co-host requests |
| My Radar | `/my-radar` | Tracked comedians and groups, alerts (phase 2, public members) |
| Super admin panel | `/admin`, `/admin/review`, `/admin/comedians`, `/admin/groups`, `/admin/shows`, `/admin/accounts`, `/admin/spotlight`, `/admin/activity`, `/admin/settings` | Dina only — see section 11.5 (designed on the canvas) |
| About | `/about`, `/faq`, `/contact` | Brand story, FAQ, contact form (section 7.5) |
| Legal | `/privacy`, `/terms` | Required pages (section 7.5) |
| Account screens | `/signup/check-email`, `/reset-password`, `/reset-password/new`, `/invite/[token]` | Short auth screens (section 7.6) |
| System | `not-found`, `error` | 404 and error pages (section 7.6) |

**Main navigation:** Shows · Tours · Comedians · Groups · (city selector) · Sign in (signed in: avatar menu → Dashboard, Sign out).
**Footer:** logo and tagline, Instagram **@comedy_radar**, **comedyradarnetwork@gmail.com**; Explore (Shows, Tours, Comedians, Groups); For comedians (List your shows, Claim your profile, Sign in); Comedy Radar (About, FAQ, Contact, Privacy, Terms); bottom line "© Comedy Radar · Show details come from comedians' and venues' public accounts and from creators on Comedy Radar. Tickets are sold by the official sellers."

---

## 5. Homepage specification (v2 — build this first)

Section order, top to bottom. Header, hero and the Spotlight must fit on the first screen on desktop.

### 5.1 Header
- Logo (left), main navigation, city selector ("Cairo, Egypt"), yellow "Sign in" button.
- Mobile: logo + menu button; navigation opens as a full-width panel.

### 5.2 Hero — "On the Radar this month"
- Headline (Luckiest Guy): **ON THE RADAR THIS MONTH** (yellow on "THIS MONTH"). No "Now live in Egypt" tag.
- One short supporting line in Nunito.
- **Full-width search bar** (same width as the content container): placeholder "Search a comedian, group, show or venue" + purple "Scan the radar" button (icon-only on mobile). Searches shows, comedians, groups and venues.
- Filter chips (pill): **Tonight · This weekend · This month (default, selected) · Within range** + city dropdown. Chips filter "Coming up" (URL query string, e.g. `/?when=month&city=cairo`).

### 5.3 Spotlight — carousel (future revenue slot)
- Title **SPOTLIGHT** with the subtitle **"This month"**. No "Featured" label on the cards.
- **One full-width slide at a time**: image left (~58%), details right on desktop; image on top, details below on mobile.
- Slide content: signal badge + type badge (e.g. GROUP SHOW), show title, comedian or group name, date · time, venue and city, yellow **"Get tickets"** + outline "Show details". No price.
- **Pagination:** counter "1 / 5", previous / next arrow buttons, dot indicators; swipe on mobile.
- **Auto-advance enabled:** next slide every 6 seconds; pauses on hover, on keyboard focus and when the tab is hidden; stops when the visitor uses the arrows/dots; no auto-advance when the visitor has "reduced motion" turned on.
- Up to 5 slides (setting in admin). Data rules: section 9.

### 5.4 Coming up
- Title **COMING UP** + link "See all shows".
- **8 cards, no date sections**: the next 8 upcoming published shows ordered by start date/time (soonest first), after the hero filters are applied.
- Desktop: 4 × 2 grid. Mobile: 8 compact rows (image, date · time, title, comedian/group · city, button).
- Card: image, badge (New / Strong / Fading Signal, Group show, Visiting, Sold out), **date · time line in yellow** (e.g. "TONIGHT · 8:30 PM", "FRI 28 NOV · 9:00 PM"), show title, comedian or group (links to its page), venue and city, **"Get tickets"**. No price.
- Button below: "See all upcoming shows" → `/shows`.

### 5.5 On tour (tours only)
- Title **ON TOUR** + line "Comedians and comedy groups on tour. Open a tour to see every date." + link "All tours".
- **One card per tour** (not per show). The card belongs to a **comedian** or a **group** (badge COMEDIAN / GROUP).
- Card: photo, badge, comedian or group name (Luckiest Guy), tour name, "[N] shows · [Month] – [Month]", up to 3 city chips + "+N", yellow **"View tour"** → `/tours/[slug]`.
- Desktop: 3 cards in a row. Mobile: horizontal swipe row.
- Shows: tours with at least one upcoming show, ordered by the next show date.

### 5.6 Comedians to track
- Title **COMEDIANS TO TRACK** + links "All comedians" and "All groups".
- Mixed row of **individual comedians and groups**. Groups carry a small yellow **GROUP** badge and the line "[N] comedians". Each item opens its own page (`/comedians/[slug]` or `/groups/[slug]`).
- Sub-line per item: e.g. "2 upcoming shows", "On tour", "New podcast episode", "New on the radar".
- Desktop: 6 in a row. Mobile: 3 × 2 grid.

### 5.7 Newsletter band (yellow)
- Title **GET EVERY NEW SIGNAL**; text "New shows and tours in your inbox, every Thursday."; email field + Subscribe (purple button).

### 5.8 Footer
- Logo, tagline, links (section 4), social icons, copyright.

### 5.9 Empty and edge states
- Fewer than 8 upcoming shows for the filter → show what exists; none → message "Nothing on the radar for this filter yet" + button "Show all upcoming".
- No active tours → hide the On tour section.
- Sold-out show → badge SOLD OUT, button "Join waitlist" (or hidden if no waitlist).
- Cancelled show → removed from listings, show page shows CANCELLED.

---

## 6. Detail pages

### 6.1 Show page (`/shows/[slug]`) — designed on the canvas
Desktop: two columns (poster left ~55%, details right). Mobile: poster on top, then details, plus a **sticky bottom bar** (date · time + "Get tickets") that appears once the main ticket button scrolls out of view.
1. **Breadcrumb:** Home › Shows › [City] › [Show title].
2. **Poster** (4:5).
3. **Badges:** signal (e.g. FADING SIGNAL · LAST TICKETS), type (GROUP SHOW / SOLO / LINEUP / OPEN MIC), zone (IN EGYPT / ON TOUR / VISITING).
4. **Title** (Luckiest Guy).
5. **Performer row:** avatar, group or comedian name (link to its page), "Comedy group · [N] comedians" or "Comedian", **Track** button.
6. **Tour link** (only if part of a tour): "Part of [Tour name] · see all dates ›".
7. **Details panel:** date; doors time, show time and duration; venue and address with "Get directions"; language and age; **ticket price range "EGP [MIN] – [MAX]" (the only place prices appear)**; big yellow **"Get tickets"** (external link, new tab, `rel="noopener sponsored"` when paid) with the line "You will buy tickets on [Ticketing site]".
8. **Actions:** Add to calendar (.ics), Share (copy link), WhatsApp.
9. **About the show** (organiser description) + **Good to know** (seating, parking, refund policy, photo rules).
10. **On stage:** for a group show, the group card (photo, name, "View group page") and a circle for each member performing (link to each comedian page). For solo/lineup shows, the comedians only.
11. **The venue:** map, venue name, address, capacity, "Get directions", "All shows at this venue".
12. **More from [Group / Comedian]:** 4 cards (group shows and members' solo shows).
13. **More in [City]:** 4 cards.
14. Newsletter band and footer.
- Sold out: badge SOLD OUT, ticket button becomes "Join waitlist". Cancelled: banner "This show was cancelled", no ticket button.
- SEO: `Event` JSON-LD.

### 6.2 Tour page (`/tours/[slug]`) — designed on the canvas
1. **Breadcrumb:** Home › Tours › [Tour name].
2. **Tour header card:** poster (left on desktop, top on mobile); badges (GROUP TOUR / COMEDIAN TOUR, signal, zone e.g. ON TOUR ABROAD); tour name (Luckiest Guy); performer row (avatar, group or comedian name linked to its page, "Comedy group · [N] comedians", **Track**); three stat tiles — **[N] shows · [N] countries · [Month] – [Month] [Year]**; short description; "See all dates" (jumps to dates) + "Share tour".
3. **Tour dates:** title + **country filter chips with counts** ("All (8) · UAE (2) · Saudi Arabia (2) …"). **A card for each show** in date order: yellow date tile (day + month), city, country, weekday · time, venue, badge (Strong / Fading Signal, Sold out), **"Get tickets"** → that show's ticket link (the card also opens the show page). Sold out → grey date tile + "Join waitlist". Desktop 3 columns; mobile one compact row per date.
4. **Past dates:** collapsed list "Past dates (N)".
5. **On this tour:** for a group tour, the group card ("View group page") + a circle for each member (links to each comedian page). For a comedian tour, the comedian card only.
6. **More tours:** 3 tour cards ("View tour").
7. Newsletter band ("New shows and tour dates…") and footer.
- Tour stats (count, countries, date range) are computed from its shows (view `v_tours`).
- SEO: `EventSeries` with each show as `Event`.

### 6.3 Group page (`/groups/[slug]`) — designed on the canvas (example: HighFive)
1. **Breadcrumb:** Home › Groups › [Group name].
2. **Group header card:** wide group photo on top; badges (COMEDY GROUP, FROM [COUNTRY], ON TOUR when a tour is active); group name (Luckiest Guy); short bio; yellow **Track group** + Share; social links; three stat tiles — **[N] comedians · [N] upcoming shows · [N] tours**.
3. **Section links** with counts: Members (N) · Group shows (N) · Tours (N) · Members' solo shows.
4. **The members:** a card per current member (round photo, name, "[N] solo shows · podcast" when they host one, "View profile ›") — each opens the individual comedian page. Example: HighFive → Badr Nour, Gamal Ramzy, Abdelrahman Mohamed, Pola Samuel, Fikry Tarek. Desktop 5 in a row; mobile one row per member.
5. **Group shows:** upcoming shows where the group performs (badges, date · time, venue, "Get tickets" / "Join waitlist").
6. **On tour:** the group's tours (wide tour card with city chips, next date, "View tour").
7. **Members' solo shows:** the next solo show of each member (photo, date, name, "Get tickets ›") — links the group's audience to each member.
8. Newsletter band and footer.
- **No podcasts on group pages** (podcasts live on each host's comedian page).
- Videos / highlights: optional embeds, phase 2.
- SEO: `PerformingGroup` JSON-LD with `member` entries.

### 6.4 Comedian page (`/comedians/[slug]`) — designed on the canvas
1. **Breadcrumb:** Home › Comedians › [Comedian name].
2. **Profile card:** round photo with yellow ring (left on desktop, centred on mobile); badges (COMEDIAN, FROM [COUNTRY], PERFORMING THIS MONTH when there is a show this month); name (Luckiest Guy); short bio; **"Member of [Group] ›"** chip for each group (links to the group page); yellow **Track** + Share; social links (Instagram, TikTok, YouTube, Facebook — only those that exist).
3. **Section links** (jump to section, with counts): Shows (N) · Tours (N) · Podcasts (N) · Groups (N). Sections with zero items are hidden, and so is their link.
4. **Upcoming shows:** solo, lineup and group shows in date order. Badge shows the type: SOLO · LINEUP · **WITH [GROUP]** (group shows they perform in) · ON TOUR. "Get tickets" on each.
5. **On tour:** the comedian's own tours (SOLO TOUR) and group tours they are part of (WITH [GROUP]), with "View tour".
6. **Podcasts:** a card per podcast the comedian hosts: cover art, podcast name, label (CO-HOSTED / SOLO, release rhythm), **"Hosted with"** chips for co-hosts (each links to that comedian's page), short description, and **listen buttons: Apple Podcasts · Spotify · Anghami · podU** (https://podu.me/), plus optional YouTube. **Only platforms that have a link are shown.** Example: *Estry Mni* (Badr Nour, Gamal Ramzy, Abdelrahman Mohamed) appears on each of the three hosts' pages, each time listing the other two as co-hosts.
7. **Groups:** card for each group (photo, name, "[N] comedians · [N] upcoming shows", "View group page") with the other members' circles.
8. Newsletter band and footer.
- A comedian with no upcoming shows shows "No dates on the radar yet — Track to hear first".
- SEO: `Person` JSON-LD; podcasts as `PodcastSeries`.

---

## 7. Listing, supporting and system pages

### 7.1 All shows (`/shows`) — designed on the canvas
1. **Breadcrumb:** Home › Shows. **Title** "ALL SHOWS" + line "[N] upcoming shows in Egypt and on tour".
2. **Full-width search** (shows, comedians, groups, venues).
3. **Filter panel** (desktop, three rows):
   - **When:** Tonight · This weekend · This month (default) · Next month · Pick dates (date range picker).
   - **Where:** All · In Egypt · On tour abroad · Visiting comedians + City dropdown.
   - **More:** Performer dropdown (search a comedian or group) · Comedians or groups · Language · "Hide sold out" checkbox · "Clear all".
   - Mobile: When chips in a swipe row, then "Filters (N)" button (opens a bottom sheet with Where and More) and "Sort" button; active filters shown as removable chips.
4. **Results bar:** "Showing 1–24 of [N] shows" + **Sort:** Date (soonest first, default) · Newly added · Trending.
5. **Grid:** same show card as Coming up (no prices, "Get tickets"); desktop 4 columns, mobile compact rows. **24 per page.**
6. **Pagination:** Previous · page numbers · Next (mobile: "Page 1 of [N]" with Prev / Next).
7. Newsletter band and footer.
- All filters and sort live in the URL (e.g. `/shows?when=month&zone=local&city=cairo&sort=date&page=2`) so results can be shared.
- Empty result: "Nothing on the radar for these filters" + "Clear all".
- `/shows/city/[city]` uses the same page with the city filter preset.

### 7.2 All tours (`/tours`) — designed on the canvas
1. **Breadcrumb:** Home › Tours. **Title** "ALL TOURS" + "[N] comedians and groups on tour". Full-width search (tour, comedian, group, city).
2. **Filter panel:**
   - **Performer:** All · Comedians · Groups.
   - **Where:** Everywhere · In Egypt · Gulf · Europe · North America + Country dropdown (regions are groups of countries, stored as data).
   - **When:** This month · Next 3 months · Any time (default) + "Clear all".
   - Mobile: performer and region chips in a swipe row + "Filters" and "Sort" buttons.
3. **Results bar:** "Showing 1–9 of [N] tours" + **Sort:** Next date first (default) · Newly announced · Most dates.
4. **Tour cards** (3 columns desktop, 1 column mobile): photo; badges (GROUP / COMEDIAN, signal, VISITING EGYPT for inbound tours); performer name; tour name; "[N] shows · [N] countries · [Month] – [Month]"; **"Next: [Day Date] · [City]"**; up to 3 city chips + "+N"; **"View tour"**.
5. **"Load more tours"** button (12 at a time).
6. **"Planning a tour?"** band → "Add your tour" (sign up / dashboard → Add a tour, with several dates at once).
7. Newsletter band and footer.
- Only tours with at least one upcoming show are listed.

### 7.3 All comedians (`/comedians`) — designed on the canvas
1. **Breadcrumb:** Home › Comedians. **Title** "ALL COMEDIANS" + a **Comedians ([N]) | Groups ([N])** switch (Groups goes to `/groups`). Full-width search by name.
2. **Filter panel:** **Show:** All · Performing this month · On tour · Has a podcast · In a group + "From: [country]" dropdown. **A–Z letter bar** to jump by first letter. Mobile: filter chips in a swipe row + "A–Z" and "Sort" buttons.
3. **Results bar:** "Showing 1–24 of [N] comedians" + **Sort:** Most upcoming shows (default) · A–Z · Newly added.
4. **Comedian cards** (4 columns desktop, 2 columns mobile): photo; name; line "Member of [Group]" (link) or "Solo comedian · [Country]" or "Visiting from [Country]"; badges ([N] SHOWS, ON TOUR, VISITING, PODCAST, NO DATES YET); "View profile ›" and **Track**. The whole card opens the comedian page.
5. Pagination (24 per page).
6. **"Are you a comedian?"** band → "Claim your profile" (→ sign up → Create or claim a profile, section 11).
7. Newsletter band and footer.

### 7.4 All groups (`/groups`) — designed on the canvas
1. **Breadcrumb:** Home › Groups. **Title** "COMEDY GROUPS" + "Comedians who perform together as one act." + the **Comedians | Groups** switch (Groups selected). Full-width search (group name or a member's name).
2. **Filter chips:** All groups · Performing this month · On tour, plus **Style** and **Language** dropdowns (a bilingual group matches Arabic and English). **Sort:** Next show first (default) · A–Z · Newly added.
3. **Group cards** (3 columns desktop, 1 column mobile): group photo; badges (GROUP, ON TOUR, style tags e.g. IMPROV, NO DATES YET) and the performing language next to the member count; group name (Luckiest Guy); **overlapping member avatars + "[N] comedians"**; next show line ("Next show: Sat [Date] · Cairo") or tour line ("On tour: [Tour name] · [N] shows"); **View group** + **Track**.
4. **"Load more groups"** (12 at a time).
5. **"Perform as a group?"** band → "Add your group" (→ sign up → Create or claim a profile → Group, section 11).
6. Newsletter band and footer.

### 7.5 Supporting pages — designed on the canvas (row 4)
1. **About** (`/about`): hero "EVERY LAUGH ON THE RADAR" with the one-paragraph story and buttons (This month's shows, List your shows); **What we cover** — three cards for Local Range, Outbound Range, Inbound Range with an example each; **How it works** — 1 We gather the shows (public accounts + creators), 2 We check and organise them, 3 You get tickets at the source (we do not sell tickets; prices on the show page only); band "Your shows, your page" (List your shows free / Claim your profile); two cards: "Something wrong or missing?" (Report a correction) and "Say hello" (email, Instagram).
2. **FAQ** (`/faq`): title, FAQ search, topic chips (Finding shows, Tickets, For comedians and managers, Corrections and removal); accordion questions grouped by topic (one open at a time); "Still have a question?" band. Questions: where the information comes from; cities covered; what the signals mean; how to follow; do you sell tickets; why no prices on cards; sold out; how to list shows; how to claim a profile; one account for several comedians; what Verified means; how to get into the Spotlight; a detail is wrong or the show was cancelled; update or remove my profile or photo. Answers are written in the build (FAQ content can live in `site_settings` or a markdown file).
3. **Contact** (`/contact`): form (name, email, I am: fan / comedian / manager or agent / venue or organiser / press / other; topic: a show detail is wrong / a show was cancelled or moved / update or remove my profile or photo / help with claiming / partnership or Spotlight / something else; link to the page; message; consent checkbox; Send). Saved in `contact_messages` and emailed to **comedyradarnetwork@gmail.com**; success message after sending. Side cards: email, Instagram @comedy_radar, quick links (report a show, claim, list your shows, FAQ). "Report a correction" links anywhere on the site open this form with the topic and page link filled in.
4. **Privacy policy** (`/privacy`) and **Terms of use** (`/terms`): legal layout with "On this page" menu, numbered sections, "Last updated" date and a **draft — review before launch** label. Privacy covers: who we are, what we collect (visitors, accounts — password hash only, claim proof), public information about comedians, use, sharing (Vercel, Supabase, ticket sellers), cookies, retention, your choices, changes. Terms cover: we list shows and do not sell tickets, tickets from official sellers, accuracy, accounts and roles, what creators publish, information from public accounts and removal requests, acceptable use, suspension, liability, Egyptian law, contact. **Both texts must be reviewed by a lawyer before launch.**

### 7.6 System pages — designed on the canvas (row 4)
1. **404** (Next.js `not-found`): mic icon, "ERROR 404", **"WE LOST THE SIGNAL"**, short text, the site search, and buttons to This month's shows, Tours, Comedians, Groups.
2. **Error** (Next.js `error`): "ERROR 500", **"STATIC ON THE LINE"**, Try again, Go to the homepage, contact email and an error reference.
3. **Show page — cancelled state**: pink banner "This show was cancelled" (date announced, refunds from the ticket seller), poster dimmed with CANCELLED tag, title and date/venue struck through, "No tickets are on sale", buttons "See [Comedian]'s next shows" and "Track", then "Other shows this week". The page stays live (no 404) so shared links still work.
4. **Profile unavailable** (archived or removed comedian / group): "OFF THE RADAR FOR NOW", Browse comedians / groups, and "Is this your page?" with sign-in and contact. Returns HTTP 410 for removed profiles and is excluded from the sitemap.
5. **Account screens** (white card on Radar Purple): **Check your inbox** after sign-up (resend, change email); **Reset your password** (email → link); **Choose a new password** (rules, confirm, signs out other devices); **Team invitation** (`/invite/[token]` — who invited you, which profiles, which role, Accept and create account / sign in, expiry date).

---

## 8. Search (`/search?q=`) — designed on the canvas
- One search across groups, comedians, shows, tours and venues (Postgres full-text search plus `pg_trgm` for typos, in Supabase). The hero, header and listing search bars all lead here.
- **Search bar** keeps the query, with a clear (×) button. Title: "[N] results for "[query]"".
- **Type tabs with counts:** All · Groups · Comedians · Shows · Tours · Venues. Tabs with zero results are greyed out.
- **All tab** shows sections in this order, each with "See all": **best match card** (highlighted with a yellow border — e.g. a search for "HighFive" puts the group first) → Groups → Comedians (round cards, "Member of [Group]") → Shows (4 cards, "Get tickets") → Tours (wide card, "View tour") → Venues. Empty sections are hidden.
- A comedian's search also brings up their groups and shows; a group's search brings up all its members (as in the HighFive example).
- Search matches English and Arabic names (store an `name_ar` / alternative names field on comedians, groups and venues).
- **"Not what you were looking for?"** band: try another spelling or Arabic name, "All shows", "List your shows" (for comedians).
- No results: "Nothing on the radar for "[query]"" + suggestions (popular comedians this month) + the same band.
- Mobile: tabs in a swipe row, comedians in a swipe row, shows and tours as compact rows.

---

## 9. Spotlight (featured) system

Build the full system now, even though placements are free at launch.

**Rules**
1. One slot type: `spotlight` (the homepage carousel). Up to 5 active slides.
2. A placement is active when `now()` is between `starts_at` and `ends_at`, the show is `published`, and the show has not started yet.
3. Order slides by `priority` (high first), then show date (soonest first).
4. **Fallback:** if fewer than 5 active placements, fill the rest automatically with `strong` signal shows this month, then the soonest upcoming shows. The carousel is never empty.
5. Spotlight shows **also appear** in the normal lists.
6. Placements expire automatically after the show date.
7. Each placement records `is_paid`, `amount`, `currency`, `client_name` for revenue reporting later.
8. Track impressions (slide shown) and ticket clicks per placement, to show results to promoters later.
9. No "Featured" label on the cards (design decision v2). Paid ticket links still use `rel="sponsored"` in the code.

---

## 10. Data model (Supabase / Postgres)

```sql
-- Shared status for profiles, podcasts, venues and tours
create type content_status as enum ('draft', 'pending', 'published', 'archived');

-- Locations
create table countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'EG', 'AE'
  name text not null,
  region text,                        -- 'Egypt', 'Gulf', 'Levant', 'Europe', 'North America' (tour filters)
  is_market boolean default false     -- true = country has its own Local Range (Egypt at launch)
);

create table cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid references countries(id) not null,
  name text not null,
  slug text not null,
  unique (country_id, slug)
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references cities(id) not null,
  name text not null,
  name_ar text,                       -- Arabic name, used by search
  slug text unique not null,
  address text,
  area text,                          -- area inside the city, e.g. Sheikh Zayed (Giza); max 60
  logo_url text,                      -- square logo, 'venues' storage bucket; super admin only
  map_url text,
  capacity int,
  status content_status default 'pending',  -- only the super admin adds venues (decided 2026-11-26)
  created_by uuid references auth.users(id)
);

-- Performers
create table comedians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,                       -- Arabic name, used by search
  slug text unique not null,
  bio text,
  photo_url text,
  home_country_id uuid references countries(id),
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  facebook_url text,
  status content_status default 'draft',  -- public only when 'published'
  verified boolean default false,     -- verified profiles publish shows instantly
  seeded boolean default false,       -- created by Comedy Radar from public accounts, not yet claimed
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table comedy_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- 'HighFive'
  name_ar text,                       -- Arabic name, used by search
  slug text unique not null,          -- 'highfive'
  bio text,
  photo_url text,
  styles text[] default '{}',         -- several of: stand-up, improv, sketch, roast, open-mic, storytelling, musical, dark, family
  performing_language text,           -- 'arabic', 'english' or 'bilingual' (separate from styles)
  home_country_id uuid references countries(id),
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  facebook_url text,
  status content_status default 'draft',
  verified boolean default false,
  seeded boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table group_members (
  group_id uuid references comedy_groups(id) on delete cascade,
  comedian_id uuid references comedians(id) on delete cascade,
  display_order int default 1,
  joined_on date,
  left_on date,                       -- null = current member
  link_status text default 'accepted', -- 'pending' until the comedian profile's admin accepts
  primary key (group_id, comedian_id)
);

-- Tours (owned by one comedian OR one group)
create table tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  poster_url text,
  comedian_id uuid references comedians(id),
  group_id uuid references comedy_groups(id),
  status content_status default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  check ((comedian_id is null) <> (group_id is null))  -- exactly one owner
);
-- Tour date range, show count and cities are computed from its shows (view v_tours).

-- Shows
create type show_zone   as enum ('local', 'outbound', 'inbound');
create type show_status as enum ('draft', 'pending', 'published', 'sold_out', 'cancelled');
-- 'pending' = waiting for super admin review (shows from unverified profiles)
create type show_signal as enum ('none', 'new', 'strong', 'fading');

create table shows (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  doors_at timestamptz,               -- when doors open (optional)
  good_to_know text[] default '{}',     -- seating, parking, refunds, photo rules
  venue_id uuid references venues(id),
  city_id uuid references cities(id) not null,
  zone show_zone not null,
  market_country_id uuid references countries(id) not null,
  tour_id uuid references tours(id),  -- null = not part of a tour
  price_min numeric,                  -- shown on the show page only
  price_max numeric,
  currency text default 'EGP',
  ticket_url text,
  poster_url text,
  language text,                      -- 'Arabic', 'English', 'Mixed'
  age_rating text,                    -- '16+', '18+'
  source_type text default 'aggregated', -- 'aggregated' (gathered by Comedy Radar from public accounts) | 'creator' (added in the dashboard)
  source_url text,                    -- the public post or page the details came from
  status show_status default 'draft',
  signal show_signal default 'new',   -- 'new' set automatically for new_signal_days; 'strong' / 'fading' set only by the super admin
  signal_request show_signal,         -- a creator asks for a signal change; the super admin decides
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on shows (starts_at);
create index on shows (zone, status, starts_at);
create index on shows (tour_id);

-- Who performs in a show: a group, and/or individual comedians
create table show_performers (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references shows(id) on delete cascade not null,
  comedian_id uuid references comedians(id) on delete cascade,
  group_id uuid references comedy_groups(id) on delete cascade,
  billing_order int default 1,        -- 1 = headliner
  link_status text default 'accepted', -- 'pending' when tagging a profile the user does not manage
  check ((comedian_id is null) <> (group_id is null))
);
create index on show_performers (comedian_id);
create index on show_performers (group_id);

-- Podcasts (hosted by individual comedians only)
create table podcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- 'Estry Mni'
  slug text unique not null,
  description text,
  cover_url text,
  apple_podcasts_url text,
  spotify_url text,
  anghami_url text,
  podu_url text,                      -- https://podu.me/
  youtube_url text,
  is_active boolean default true,
  status content_status default 'published',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table podcast_hosts (
  podcast_id uuid references podcasts(id) on delete cascade,
  comedian_id uuid references comedians(id) on delete cascade,
  display_order int default 1,
  link_status text default 'accepted', -- 'pending' until the co-host profile's admin accepts
  primary key (podcast_id, comedian_id)
);

-- Spotlight
create table spotlight_placements (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references shows(id) on delete cascade not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  priority int default 0,
  is_paid boolean default false,
  amount numeric,
  currency text default 'EGP',
  client_name text,
  notes text,
  preferred_slide int,                -- 1–5, null = any free slide
  impressions int default 0,
  clicks int default 0,
  created_at timestamptz default now()
);

-- Site settings edited in /admin/settings (one row per key)
create table site_settings (
  key text primary key,               -- 'spotlight_slides' (5), 'spotlight_autoadvance_s' (6), 'coming_up_count' (8), 'track_count' (6),
                                      -- 'new_signal_days' (7), 'invite_expiry_days' (7), 'instagram_handle' ('@comedy_radar'), 'contact_email', 'review_rules' (jsonb) ...
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- Audience
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  city_id uuid references cities(id),
  confirmed boolean default false,
  created_at timestamptz default now()
);

-- Accounts (one row per signed-in person)
create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  account_type text default 'comedian',  -- 'comedian' | 'manager' (chosen at sign up; only changes the onboarding steps)
  is_super_admin boolean default false,  -- set ONLY directly in the database, never from the UI
  is_suspended boolean default false,
  created_at timestamptz default now()
);

-- Passwords: handled only by Supabase Auth (auth.users stores a bcrypt hash). Never store, log or e-mail a password in any app table.

-- Who can manage which profile, and with which role
create type profile_role as enum ('admin', 'moderator');

-- Team of a creator dashboard (the dashboard belongs to its owner account)
create table dashboard_members (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid references accounts(id) on delete cascade not null,   -- the manager / comedian who owns the dashboard
  member_account_id uuid references accounts(id) on delete cascade,           -- null until the invite is accepted
  invite_email text,
  scope text not null default 'selected',  -- 'all' = every profile the owner admins, now and later | 'selected' = rows in profile_access
  all_role profile_role,                   -- the role used when scope = 'all'
  status text default 'invited',           -- 'invited' | 'active' | 'removed' | 'expired'
  invited_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  unique (owner_account_id, member_account_id)
);

create table profile_access (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade not null,
  comedian_id uuid references comedians(id) on delete cascade,
  group_id uuid references comedy_groups(id) on delete cascade,
  role profile_role not null,
  status text default 'active',       -- 'invited' | 'active' | 'removed'
  invited_by uuid references accounts(id),
  via_dashboard_member_id uuid references dashboard_members(id) on delete cascade,  -- set when granted through a dashboard team (scope 'selected')
  created_at timestamptz default now(),
  check ((comedian_id is null) <> (group_id is null)),
  unique (account_id, comedian_id),
  unique (account_id, group_id)
);

-- Claims of existing profiles and email invitations to a profile team
create table access_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- 'claim' | 'invite'
  account_id uuid references accounts(id),   -- who asks (claim) or who is invited (once signed up)
  invite_email text,                  -- for invites to people without an account yet
  comedian_id uuid references comedians(id) on delete cascade,
  group_id uuid references comedy_groups(id) on delete cascade,
  role profile_role default 'admin',
  relation text,                      -- claim: 'I am this comedian' | 'I am the manager' | 'I am a member of the group'
  proof_method text,                  -- 'official_dm' | 'comedian_confirms' | 'business_email' | 'document' | 'call'
  proof_value text,                   -- the official handle messaged from, the confirmer's phone/email, the business email, or notes
  proof_file_path text,               -- private storage bucket 'claim-documents' (super admin read only)
  confirmed_at timestamptz,           -- set when the comedian / business email link is confirmed
  confirm_token uuid unique,          -- secret of the "comedian confirms" link (/claim/confirm/[token]); claimant and super admin only
  confirmed_by_name text,             -- name typed by the person who confirmed
  status text default 'pending',      -- 'pending' | 'approved' | 'rejected' | 'expired'
  decided_by uuid references accounts(id),
  decision_reason text,               -- reason sent with a rejection or a request for more proof
  admin_note text,                    -- internal, super admins only
  created_at timestamptz default now(),
  check ((comedian_id is null) <> (group_id is null))
);

-- Name changes on verified profiles wait for the super admin (spec 11.4 item 5);
-- written by the profile trigger, one pending request per profile.
create table profile_name_changes (
  id uuid primary key default gen_random_uuid(),
  comedian_id uuid references comedians(id) on delete cascade,
  group_id uuid references comedy_groups(id) on delete cascade,
  name text not null, name_ar text,
  old_name text, old_name_ar text,
  requested_by uuid references accounts(id),
  status text default 'pending',      -- 'pending' | 'approved' | 'rejected'
  decided_by uuid references accounts(id), decision_reason text,
  created_at timestamptz default now(), decided_at timestamptz,
  check ((comedian_id is null) <> (group_id is null))
);
-- comedians / comedy_groups also have archive_requested_at timestamptz ("Request archive").
-- comedians / comedy_groups also have cover_url text (wide cover; the group page header uses it, falling back to photo_url).

-- Consent requests between profiles (group member, lineup tag, podcast co-host)
create table link_requests (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- 'group_member' | 'lineup_tag' | 'podcast_cohost'
  from_account_id uuid references accounts(id) not null,
  target_comedian_id uuid references comedians(id) on delete cascade not null,
  group_id uuid references comedy_groups(id) on delete cascade,
  show_id uuid references shows(id) on delete cascade,
  podcast_id uuid references podcasts(id) on delete cascade,
  status text default 'pending',      -- 'pending' | 'accepted' | 'declined'
  decided_by uuid references accounts(id),
  created_at timestamptz default now()
);

-- Everything important that happens (for the super admin and each profile's admins)
create table activity_log (
  id bigint generated always as identity primary key,
  account_id uuid references accounts(id),
  action text not null,               -- 'create' | 'update' | 'publish' | 'cancel' | 'invite' | 'role_change' | 'approve' ...
  entity_type text not null,          -- 'show' | 'tour' | 'comedian' | 'group' | 'podcast' | 'venue' | 'access'
  entity_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

-- Contact form messages (read in the admin panel; a copy is emailed to comedyradarnetwork@gmail.com)
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  sender_type text,                   -- 'fan' | 'comedian' | 'manager' | 'venue' | 'press' | 'other'
  topic text,                         -- 'wrong_detail' | 'cancelled' | 'update_or_remove' | 'claim_help' | 'partnership' | 'other'
  page_url text,
  message text not null,
  status text default 'new',          -- 'new' | 'replied' | 'closed'
  created_at timestamptz default now()
);

create table tracks (                 -- phase 2: follow a comedian or a group (any account)
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  comedian_id uuid references comedians(id) on delete cascade,
  group_id uuid references comedy_groups(id) on delete cascade,
  created_at timestamptz default now(),
  check ((comedian_id is null) <> (group_id is null)),
  unique (user_id, comedian_id),
  unique (user_id, group_id)
);

create table page_stats (             -- dashboard: daily totals, no visitor data
  day date default (now() at time zone 'Africa/Cairo')::date,
  kind text check (kind in ('comedian_view','group_view','show_view','tour_view','ticket_click')),
  entity_id uuid,                     -- the comedian, group, show or tour
  count integer default 0,
  primary key (entity_id, kind, day)
);
-- Written only by record_page_stat() (public pages and "Get tickets" clicks);
-- read only by my_page_stats(), which returns the totals of pages the account manages.
```

**Helper views**
- `v_upcoming_shows`: published shows with `starts_at >= now()`, joined with venue, city, country and performers (headliner name and type), ordered by `starts_at`. The homepage takes `limit 8`.
- `v_tours`: tours with owner (comedian or group), first and last show date, count of shows, list of cities; only tours with at least one upcoming show.
- `v_spotlight`: active spotlight placements joined with show data, ordered by priority then `starts_at`. Fallback logic runs in server code.
- `v_comedian_shows`: for each comedian, their solo/lineup shows **plus** shows of groups they currently belong to (flag `via_group`).

**Example seed data (structure only)**
- Group `HighFive` with members Badr Nour, Gamal Ramzy, Abdelrahman Mohamed, Pola Samuel, Fikry Tarek (each also a row in `comedians`, each with their own page).
- Podcast `Estry Mni` with hosts Badr Nour, Gamal Ramzy, Abdelrahman Mohamed; platform links filled in by the admin.

**Row Level Security** (enforced in the database, not only in the screens)
- Helper functions: `is_super_admin()`; `profile_role_for(account, profile)` = the highest role from (a) an active `profile_access` row, or (b) an active `dashboard_members` row with `scope = 'all'` whose owner is admin of that profile (gives `all_role`); `can_manage(profile)` = admin or moderator; `is_profile_admin(profile)` = admin.
- A dashboard owner can only share profiles where the owner is admin, and can only grant Admin or Moderator, never more than the owner has. Removing a dashboard member removes every access granted through it.
- **Public (anon):** `select` only rows with `status = 'published'` (shows also `sold_out`), accepted links (`link_status = 'accepted'`), venues, cities, countries, active spotlight placements. `insert` into `newsletter_subscribers` and `contact_messages` only (with rate limiting and a bot check).
- **Any signed-in account:** create a comedian/group profile as `draft`/`pending` (becomes its admin automatically); create `access_requests` (claims); manage its own `tracks`; read its own `profile_access`, requests and activity.
- **Profile moderator:** insert/update shows and tours whose performer or owner is a profile they manage; cannot change profile fields, team or podcasts.
- **Profile admin:** everything a moderator can do + update the profile, group members, podcasts, and `profile_access` / invitations for that profile; accept or decline `link_requests` targeting that profile.
- **Show publishing rule:** a new show from a `verified` profile is saved as `published`; from an unverified profile it is saved as `pending` (super admin review).
- **Super admin:** full access to every table; the only role that can set `verified`, approve profiles, claims and venues, suspend accounts, delete permanently, and manage the Spotlight and settings.
- No account can change its own role; `is_super_admin` is never writable through the API.

**Storage buckets:** `posters`, `comedians`, `groups`, `podcasts` (all public read); `claim-documents` (private: the uploader writes, only the super admin reads). Upload: profile admins for profile and podcast images, profile admins and moderators for show and tour posters, super admin for everything. Files are stored in a folder per profile so the database rules can check access.

---

## 11. Accounts, roles and creator dashboard

### 11.1 The model
- **Account:** anyone can sign up with email + password or Google. Account type: **Comedian** (solo, in a group, or both) or **Manager or agent** (one comedian, several, or a group). Team members do not choose a type; they join from an invitation link. An account alone has no rights on content.
- **Profile:** a comedian profile or a group profile (what the public sees).
- **Profile access:** links an account to a profile with a **role on that profile**. One account can manage many profiles; one profile can have several accounts.
- **Dashboard team:** the owner of a creator dashboard invites team members and gives each either **All profiles** (one role, including profiles added later) or **Selected profiles** (a role per profile). Example: an assistant is Moderator on all profiles; a road manager is Admin of HighFive only; Badr Nour is Admin of his own profile and Moderator of HighFive.

| Role on a profile | Can do |
|---|---|
| **Admin** | Edit the profile (bio, photos, links, Arabic name), manage group members and podcasts, add / edit / cancel shows and tours, mark sold out, invite and remove admins and moderators, accept or decline link requests, request a Spotlight (phase 2) |
| **Moderator** | Add / edit shows and tours, mark sold out or cancelled. No profile edits, no team management |

- **Super admin (Dina):** above all profiles. Approves new profiles, claims and new venues; gives the **verified** badge; reviews shows from unverified profiles; suspends accounts; can edit, reassign or remove anything; runs the Spotlight and site settings. Set only in the database.

### 11.2 Real scenarios
**A small comedian**
1. Signs up → "Create my comedian profile" → name (EN + AR), photo, bio, social links → sent to review.
2. Super admin approves → profile goes live; the comedian is its **admin**.
3. Adds shows and tours from the dashboard; can invite a friend as **moderator**.

**A manager (e.g. the HighFive case)**
1. Signs up → creates or **claims** the HighFive group profile and each member's comedian profile.
2. Becomes **admin** of all of them; one dashboard with a **profile switcher** ("All profiles", HighFive, Badr Nour, Gamal Ramzy, …).
3. When adding a show, picks the performer among the profiles they manage: the group (group show) or one member (solo show). The show appears on the right pages automatically.
4. A comedian can have their own account and also be admin of their own profile alongside the manager.
5. A manager can manage several groups and many comedians with one account.

### 11.3 Rules
- **New profiles are reviewed** by the super admin; duplicate check on English and Arabic names before saving.
- **Claiming an existing profile** (profiles seeded by Dina at launch): the user chooses "I am this comedian", "I am the manager" or (groups) "A member of the group" and picks **one** proof:
  1. **Message from the official account** (default, fastest): one Instagram DM from the profile's official Instagram account to **@comedy_radar**, naming the account email (Comedy Radar is on Instagram only). The user enters the handle they will message from.
  2. **The comedian or a group member confirms:** a link by WhatsApp or email; one tap confirms the manager (no account needed).
  3. **Business email:** a confirmation link to the booking/management email shown on the official pages or website.
  4. **Document:** management contract or signed authorisation letter (template provided), stored privately.
  5. **Short call** with the Comedy Radar team as a fallback.
  The super admin approves; methods 2 and 3 are marked as confirmed automatically to speed up review.
- **Verified profiles publish shows instantly**; unverified profiles' shows go to review (`pending`). The super admin can always unpublish.
- **Consent for links between profiles:** adding a comedian to a group, tagging a comedian in a lineup, or adding a podcast co-host creates a **link request**; it shows publicly only after that profile's admin accepts. If the target profile has no admin yet, the super admin decides.
- **Venues are shared:** pick an existing venue. Only the super admin adds venues (with area and logo); a creator who misses one contacts Comedy Radar (decided 2026-11-26).
- **The owner cannot be locked out:** the super admin can reassign or remove access on any profile. A profile must always keep at least one admin.
- **Activity log:** every create, edit, publish, cancel, invite and role change is recorded with who and when.
- **Security:** passwords are handled only by Supabase Auth and saved as a one-way hash (bcrypt), never in plain text; minimum 8 characters with a number or symbol, leaked-password check on, email confirmation required before the first sign-in, rate-limited sign-in, password reset by email link. Two-step verification required for the super admin; recommended for profile admins. Removed team members lose access immediately; their history stays.

### 11.4 Account and dashboard pages — designed on the canvas (row 2 of "Website pages")
Dashboard style: light working theme — Lavender background, white cards, Radar Purple sidebar and text, yellow primary buttons with purple text, pink badges.

1. **For comedians / Sign up** (`/for-comedians`, `/signup`): split screen — left: "List your shows free" benefits (your own page, shows on the homepage and listings, manage a whole group, see views and ticket clicks); right: Sign up | Sign in tabs, "Continue with Google", full name, email, **password** (show/hide, strength meter, rules) and confirm password, account type (**A comedian** — solo, in a group, or both / **A manager or agent** — one comedian, several, or a group), note "Invited by a team? Use the link in your invitation email", terms checkbox, "Create free account", then email confirmation. Sign in tab: email, password, "Forgot password?".
2. **Create or claim a profile** (`/dashboard/profiles/new`): step 1 search "Is your profile already on Comedy Radar?" → results with **Claim** (relation + one proof method from section 11.3, the official-account message selected by default) or "Not found → Create a new profile" (Comedian / Group). Group creation picks existing comedians or creates member drafts inline.
3. **Dashboard overview** (`/dashboard`): sidebar with an icon on each item (Overview, Requests with count, Profiles, Shows, Tours, Team and access, Spotlight — soon), top bar with **profile switcher**; greeting + "You manage [N] profiles"; stat tiles (upcoming shows, page views 30 days, ticket clicks 30 days, pending review); **My profiles** cards (photo, name, type, my role, status: Verified / Pending review / Draft); **Upcoming shows** table across profiles (date, show, performer, status, clicks, actions); quick actions (Add show, Add tour, Create or claim profile); requests alert.
4. **Add a show** (`/dashboard/shows/new`): performer picker limited to managed profiles (group / comedian / lineup with tags), title, description, date, doors and show time, country, city, venue (pick from the list), ticket link, price from/to + currency, language, age, poster upload (4:5), signal note; "Part of a tour" selector; right-side **live preview** of the show card; buttons Save draft / Publish (or "Send for review" for unverified profiles).
5. **Edit profile** (`/dashboard/p/[slug]/edit`, `?type=group` for a group): photo and cover, name EN/AR, bio, home country, social links; for groups: **members** list (accepted / pending invitations, add member); for comedians: **podcasts** with co-hosts and platform links (Apple Podcasts, Spotify, Anghami, podU, YouTube). Side panel: profile status, verified, last edit, people with access; name changes on verified profiles go to super admin review; "Request archive" (only the super admin deletes).
6. **Team and access** (`/dashboard/team`): stat tiles (team members, profiles in the dashboard, pending invitations); **team members table** with the access of each person as chips ("All profiles · Moderator" or "HighFive · Admin", "Badr Nour · Admin"…), Edit access, Remove; filter "Show access to [profile]"; pending invitations (resend, cancel, expire after 7 days); Admin / Moderator explanation. **Invite panel:** email; Access = **All profiles in this dashboard** (one role, includes profiles added later) or **Selected profiles only** (checklist of the owner's profiles with Select all and a role per ticked profile); note that only profiles where the owner is Admin can be shared and that a group does not include its members' solo profiles.
7. **Requests** (`/dashboard/requests`): tabs Incoming / Sent / History; type filter (Lineup tags, Groups, Podcasts, Team invites); cards for group invitations, lineup tags, podcast co-host requests and team invitations with Accept / Decline; "Sent by you, waiting" list with Cancel.
8. **Add a tour** (`/dashboard/tours/new`): 1 Who is touring (managed profiles only; one comedian or one group); 2 Tour details (name, description, 4:5 poster, optional 3:1 banner); 3 **Tour dates** — one row per date with date, show time, city and country, venue (pick from the list), ticket link and status (On sale / Sold out / No ticket link), "+ Add a date", "Paste several dates" (one per line) and "Import my existing shows"; 4 **Same for every date** (show title pattern "[Tour] — [City]", language, price from/to, currency per city, age, doors, guests). Right side: live tour card preview and a publish checklist (name and poster, at least one date, ticket links, venues). Each date is saved as its own show linked to the tour; dates without a link show "Tickets soon".
9. **Shows list** (`/dashboard/shows`): stat tiles; tabs Upcoming / Drafts / In review / Past / Cancelled; filters (search, profile, tour, city, period); table with date tile, show and venue, performer, tour, status, signal, ticket clicks and actions; **bulk actions** (mark sold out, add to a tour, duplicate to a new date, cancel); row menu (edit, duplicate, mark sold out, add to a tour, ask for a signal change, view public page, cancel). Signals Strong and Fading are set by Comedy Radar only.
10. **Tours list** (`/dashboard/tours`): stat tiles (active tours, upcoming tour dates, dates without ticket link, views); tabs Active / Drafts / Past; search and Comedians / Groups filter; one wide card per tour with status, owner, "[N] shows · [N] countries · dates", counts (on sale, sold out, no link), progress bar of dates done, next date, warnings, and Edit tour / + Add dates / View public page.

### 11.5 Super admin panel (`/admin`, Dina only) — designed on the canvas (row 3 of "Website pages")
Admin style: Stage Black sidebar (#121212) with a pink "SUPER ADMIN" label, an icon on each menu item and yellow active item (menu order: Overview, Review queue, Messages, Comedians, Groups, Shows and tours, Spotlight, Bulk import, Accounts, Activity log, Settings), so it is never confused with the creator dashboard; top bar with "ADMIN PANEL" tag, global search (profiles, shows, accounts), notifications and "+ Add profile". Access: `accounts.is_super_admin = true` **and** 2-step verification.

1. **Overview** (`/admin`): two rows of stat tiles (upcoming live shows, active tours, profiles with verified / no admin, creator accounts, waiting for review; page views, ticket clicks, newsletter subscribers, Spotlight clicks — 30 days); **Review queue** summary by type with count, oldest item and "Review"; **Needs attention** (shows within 7 days without a ticket link, auto-filled Spotlight slides, seeded profiles with shows but no admin); **Spotlight right now** (the 5 live slides: Free / Paid / Auto fill); recent activity; this week (new accounts, claims approved, average review time).
2. **Review queue** (`/admin/review`): tabs All / New profiles / Claims / Shows / Venues / Name changes / Done; list on the left (oldest first, proof status shown on each card); detail on the right. For a **claim**: the profile, who is asking (account type, email confirmed, created, other profiles), the claim (relation, role asked, proof method, handle, extra profiles), **Proof and checks** (e.g. DM received on @comedy_radar from the handle saved on the profile, no other open claims), and **Decision**: Approve as Admin / Approve as Moderator / Ask for more proof / Reject, "also approve the member profiles in this claim", "mark as verified", reason, message to the person, internal note, Confirm / Skip to next. The person gets an email and a dashboard notification. New profiles, shows from unverified profiles, venues and name changes use the same layout with their own checks.
3. **Comedians** (`/admin/comedians`) and **Groups** (`/admin/groups`), two pages (Profiles split in two, 2026-11-26): stat tiles (total, no admin yet, pending review); search by English or Arabic name; filters by status (Published, Pending, Draft, Archived) and verification (Verified, Not verified, No admin); table (profile with Arabic name, type, status, verified, number of admins, upcoming shows, Edit / more) with bulk select; **side panel** for the selected profile: Verified switch, status, edit / view page, **Access** list with roles, add a person by email with a role, "Reassign all access", merge with a duplicate, download history, archive. "Import profiles (CSV)" for seeding at launch.
4. **Shows and tours** (`/admin/shows`): tabs Shows / Tours / Podcasts / Venues; stat tiles (upcoming, by zone, missing ticket link, cancelled); filters (search, zone In Egypt / On tour / Visiting, status, city, period); full-width table with **inline signal selector**, ticket link check, who added it, Edit / Spotlight / more; bulk set signal, unpublish, add to Spotlight; signal rules and data-quality counts (signal change requests, shows with no venue, tours with no ticket links).
5. **Accounts** (`/admin/accounts`): stat tiles; filters by type (Comedians, Managers or agents, Team members) and status (Active, Email not confirmed, Suspended); table (account, type, profiles and role, last sign-in, 2-step, status); side panel with sign-up method, confirmation, last sign-in, profiles and team, and actions **Send password reset link**, **Sign out of all devices**, **Suspend account**. Passwords are never visible to anyone.
6. **Spotlight** (`/admin/spotlight`): stat tiles (live, scheduled, views, ticket clicks, revenue — EGP 0 until phase 2); **Live now** strip of the 5 slides in order (drag to reorder = priority) with Free / Paid / Auto fill, end time, views and clicks; **All placements** table (show, dates, priority, type, amount, client, status Live / Scheduled / Ended); **New placement** form (show search, start, end — ends automatically at show start, priority, preferred slide, paid switch, amount, currency, client, notes); carousel settings (slides 5, auto-advance 6 s, fallback order).
7. **Activity log** (`/admin/activity`): filters (search, who, type, action, period); entries grouped by day with time, person and role, the action with links, a type badge and, for edits, a **before / after** table of changed fields; load older; export CSV. Kept for 24 months.
8. **Settings** (`/admin/settings`): section menu and cards — **General** (site name, tagline, language English — fixed, time zone Africa/Cairo — fixed, launch market Egypt, domain on hold); **Social and contact** (Instagram @comedy_radar; other platforms hidden until a handle is added; contact email); **Homepage** (Spotlight slides, auto-advance, Coming up count, Comedians to track count and auto / manual pick, default date filter and city); **Locations and venues** (countries with region and market flag, cities, venues, pending venues); **Review rules** (switches for profile, show and name-change review, automatic claim confirmation, consent for tags, invitation expiry, New Signal duration); **Security** (2-step required for super admins, prompt for profile admins, password length, sign-in attempts, leaked-password check, email confirmation); **Email templates** (confirm email, password reset, team invitation, manager confirmation, claim decisions, link requests, show review); **Super admins** (added only in the database).

---

## 12. SEO and sharing
- Page titles: "Stand-up comedy in Cairo this month | Comedy Radar", "[Comedian] live in [City] — [Date] | Comedy Radar", "[Group] — shows and tours | Comedy Radar", "[Tour name] — all dates | Comedy Radar".
- JSON-LD: `Event` (show), `EventSeries` (tour), `Person` (comedian), `PerformingGroup` (group), `PodcastSeries` (podcast on comedian page).
- Open Graph images generated per show, tour, comedian and group (on Radar Purple).
- `sitemap.xml` and `robots.txt` generated automatically.
- Listing pages revalidate every 10 minutes (ISR); detail pages revalidate on edit.

---

## 13. Build phases

**Phase 1 — Launch (MVP)**
1. Repo, Next.js, Tailwind tokens, fonts, logo files.
2. Supabase schema (section 10), RLS, views, seed data (Egypt, main cities, sample venues, sample comedians, HighFive group, one tour, one podcast, 10 sample shows).
3. Homepage v2 (section 5) with Spotlight carousel and fallback.
4. Show page, tour page, group page, comedian page (with podcasts).
5. `/shows`, `/tours`, `/comedians`, `/groups` listings and search.
6. Newsletter sign-up.
7. Accounts and creator dashboard (section 11): sign up / sign in, create or claim profile, dashboard, add show / tour, edit profile, team and access, requests.
8. Super admin panel (section 11.5): overview, review queue, profiles, shows and tours, accounts, Spotlight, activity log, settings.
9. About, FAQ, Contact, Privacy, Terms, 404, error page and account screens (sections 7.5–7.6).
10. Deploy on Vercel (custom domain once decided).

**Phase 2 — Growth and revenue**
- Paid Spotlight (price list, invoices), placement reports for promoters.
- Public member accounts: Track comedians and groups, My Radar, email alerts (new show, new tour date, new podcast episode).
- Promoter and venue accounts (list shows for many different comedians).
- Spotlight requests and payment from the creator dashboard.
- Venue pages, weekly newsletter automation.
- Arabic version of the site (RTL) — optional, after launch.
- New countries ("New Territory").

---

## 14. Decisions and open items
**Decided**
- Language at launch: **English only** (Arabic names are still stored for search; an Arabic version stays a phase 2 option).
- Social media: **Instagram only — @comedy_radar** (https://instagram.com/comedy_radar). It also receives claim messages.
- Contact email: **comedyradarnetwork@gmail.com** (also the Supabase account email).
- Content: show details are **aggregated from comedians', groups' and venues' public accounts**, plus what creators add themselves; each show keeps its source link; corrections and removals through the Contact page.
- Newsletter: the yellow band stores emails in `newsletter_subscribers`; how and when to send is decided later.

**Open**
- [DOMAIN] — on hold; use the Vercel address until decided
- [SPOTLIGHT PRICE LIST] — per week (phase 2)
- Legal review of the Privacy policy and Terms before launch

---

## 15. Build setup (Claude Code desktop app)

**Already done by Dina**
- GitHub repository: **`comedyradar`**.
- Supabase account: **comedyradarnetwork@gmail.com**.

**Next steps**
1. **Supabase project:** in the Supabase dashboard create a new project named `comedyradar`, choose the region closest to Egypt (for example Frankfurt, `eu-central-1`), and save the database password in a password manager. From *Project settings → API* copy the Project URL, the publishable key (`sb_publishable_…`) and the secret key (`sb_secret_…`).
2. **Supabase Auth:** turn on Email (with "Confirm email") and, if wanted at launch, Google (needs a Google Cloud OAuth client). Before inviting real users, set **custom SMTP** in *Auth → Emails*; the built-in email service is only for testing and has strict limits. Add the site address to *URL configuration* (the Vercel address for now).
3. **Vercel:** sign in with GitHub, *Add New → Project*, import `comedyradar`, and add the environment variables from section 2 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`). Every pull request gets a preview link.
4. **Claude Code (desktop app):** clone `comedyradar` to the computer, open the folder in Claude Code, and save this file as `docs/website-spec.md`. Put the same keys in `.env.local` (never commit it; keep it in `.gitignore`). Optionally connect the Supabase MCP server in Claude Code so it can run migrations and check the database directly.
5. **First prompt:**
   > "Read docs/website-spec.md. Set up phase 1 step 1 and step 2: Next.js (App Router) + TypeScript + Tailwind with the brand tokens and fonts from section 3, and the Supabase schema from section 10 with RLS, helper views and seed data as migrations. Then build the homepage from section 5. Work on a feature branch and open a pull request."
6. Continue one phase step at a time (section 13); review each step on the Vercel preview link before merging to `main`. Make Dina the super admin by setting `accounts.is_super_admin = true` for her account directly in the Supabase table editor after she signs up.
