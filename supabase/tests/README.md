# Database tests

`rls_test.sql` checks the security rules (RLS) and triggers: who can see,
create, publish and change what. It runs on a **local** Postgres 15+ only,
never on the Supabase project.

```bash
# with a local Postgres reachable through PGHOST / PGPORT / PGUSER
npm run test:db
```

`run-local.sh` creates a fresh database, loads `local-stub.sql` (a small
stand-in for Supabase's `auth` and `storage` schemas and roles), applies every
file in `supabase/migrations/` in order, then runs `rls_test.sql`. Each check
prints `ok - …`; the first failure stops with `FAILED: …`.
