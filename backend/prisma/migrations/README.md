# Migrations

**Source of truth: hand-written SQL, not `prisma migrate dev`.**

This schema relies on Postgres features Prisma Migrate doesn't manage —
triggers, `pg_notify`, enums-with-comments, and views with business logic
(`booking_request_details`, `customer_summary`, `daily_requests_summary`).
Generating those from `schema.prisma` isn't possible, so the workflow is
inverted from the Prisma default:

1. **Schema changes are authored as plain `.sql` files** (see `../../sql/`:
   `001_base_schema.sql`, `002_clerk_integration_and_fixes.sql`,
   `003_realtime_notifications.sql`), reviewed and applied like any other
   migration.
2. **`schema.prisma` is kept in sync by hand** after each SQL change (or via
   `npx prisma db pull`, which is safe to run — it only reads structure, it
   never writes), so Prisma Client's types match reality.
3. **Prisma Migrate's own history is "baselined"** against that same SQL,
   so `npx prisma migrate dev` doesn't try to re-create tables that already
   exist. This folder (`0_init/migration.sql`) is exactly the concatenation
   of the three files above, checked in for the record.

## First-time setup (new environment)

```bash
# 1. Apply the real migrations (this is what actually creates the schema)
psql "$DATABASE_URL" -f ../../sql/001_base_schema.sql
psql "$DATABASE_URL" -f ../../sql/002_clerk_integration_and_fixes.sql
psql "$DATABASE_URL" -f ../../sql/003_realtime_notifications.sql

# 2. Tell Prisma Migrate this baseline is already applied, so it doesn't
#    try to run 0_init/migration.sql itself (which would fail — the tables
#    already exist).
npx prisma migrate resolve --applied 0_init

# 3. Generate the client
npx prisma generate

# 4. (optional) load dev fixtures
npx prisma db seed
```

> **Known, expected error during step 1:** the base schema file's own inline
> sample `booking_requests` insert fails with `invalid input syntax for type
> integer: "2026-000001"` — that's the exact bug migration `002` exists to
> fix, and it fails *before* `002` has run. It's harmless: every other
> statement in the file succeeds, and by the time `002` finishes, the
> corrected trigger is in place. Use `npx prisma db seed` (step 4) to get
> working sample `booking_requests`/`audit_logs` rows instead of relying on
> that inline insert.

## Adding a new migration later

Don't hand-edit `0_init/`. Instead:

```bash
# write your change as a new .sql file at the project root, e.g.
# 004_add_treatment_tags.sql, apply it the same way as above, then:
npx prisma db pull        # refresh schema.prisma from the real DB
npx prisma generate       # regenerate the client
```

If the change is Prisma-representable (a plain column/table, no
trigger/view/function), you can alternatively use
`npx prisma migrate dev --create-only` to have Prisma draft the SQL, review
it, rename the file to match the project's `NNN_description.sql` numbering,
then apply/resolve as above. Either way, the numbered `.sql` file — not
`schema.prisma` — is what actually ran in production.
