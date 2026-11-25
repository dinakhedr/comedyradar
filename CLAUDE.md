# Comedy Radar — instructions for Claude Code

Comedy Radar is a listings website for live stand-up comedy in Egypt (local shows, Egyptian comedians on tour, visiting comedians). Owner: Dina Khedr. Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres, RLS, Auth, Storage), Vercel, GitHub repo `comedyradar`.

## Read before any work
Always read these files at the start of a session, and re-read the relevant section before building a feature:
1. `docs/website-spec.md` — the full website specification: overview and content sourcing, tech stack, **brand tokens (section 3)**, routes, public pages, Spotlight, **data model and RLS (section 10)**, accounts and roles, creator dashboard, **super admin panel (11.5)**, SEO, build phases, decisions, build setup.
2. `docs/brand-assets.md` — brand decisions: logo, colors, fonts, patterns, links.
3. `docs/aggregator-agent.md` — the show aggregator agent (current priority).

The specs are the source of truth. If something is unclear or two docs disagree, ask Dina before building. Do not invent product decisions.

## Brand rules (short)
- Colors: Radar Purple #2B0B4F, Spotlight Yellow #FFD60A, Laugh Pink #FF4D8D, Radar Plum #4A1470, Lavender #F1EAFB, Stage Black #121212. Never yellow text on white or white text on yellow.
- Fonts: Luckiest Guy (uppercase display only), Nunito 400/700/800.
- Public site: purple base. Creator dashboard: lavender + white cards + purple sidebar. Admin panel: Stage Black sidebar, pink "SUPER ADMIN" label.
- Logo SVGs live in `public/brand/` (exported from the Brand Guidelines).
- English only at launch. Contact: comedyradarnetwork@gmail.com · Instagram @comedyradar.

## Working rules
- Work on a feature branch per task and open a pull request; never push directly to `main`.
- Database changes only as Supabase migrations in `supabase/migrations/`; every table gets RLS.
- Secrets only in `.env.local` and Vercel; never commit them, never print them.
- The service role key and all Claude / Meta API calls are server-side only.
- Passwords are handled only by Supabase Auth.
- Agent output is always `pending` until the super admin approves it.
- Write tests for extraction, matching and de-duplication logic.
- After each step: summarise what was built, how to test it on the Vercel preview, and what is next.
