# Comedy Radar

If it's live and it's funny, it's on the radar. Listings for live stand-up comedy in Egypt.

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase · Vercel.
The specification lives in `docs/` (start with `docs/website-spec.md`).

## Run locally

```bash
cp .env.example .env.local   # fill in the values (never commit .env.local)
npm install
npm run dev                  # http://localhost:3000
```

## Tests

```bash
npm test          # app logic (dates, Spotlight rules)
npm run test:db   # database security rules on a local Postgres (supabase/tests/README.md)
```

## Database

Migrations are in `supabase/migrations/` and are applied in file-name order.
