# D'Vine Spa API

Backend for the D'Vine Spa booking system. Full endpoint reference: `docs/API_DOCUMENTATION.md`. Phased build plan / progress tracker: `docs/task.md`.

## Stack

Node.js (TypeScript) + Express, PostgreSQL, Prisma, Clerk (auth, Phase 2), Socket.IO (realtime, Phase 7). See `docs/API_DOCUMENTATION.md` Appendix C for rationale.

## Project layout

```
sql/                      # source of truth for the DB schema (see prisma/migrations/README.md)
  001_base_schema.sql
  002_clerk_integration_and_fixes.sql
  003_realtime_notifications.sql
docs/
  API_DOCUMENTATION.md
  task.md
prisma/
  schema.prisma            # kept in sync with sql/ by hand or `prisma db pull`
  seed.ts                  # idempotent dev fixtures
  migrations/
    README.md              # explains the SQL-first + Prisma-baseline workflow
    migration_lock.toml
    0_init/migration.sql   # concatenation of sql/001-003, checked in for the record
src/
  index.ts                 # process entry point, starts the HTTP server
  app.ts                   # Express app assembly (middleware + route mounting)
  config/env.ts             # env var loading & validation (zod)
  lib/
    prisma.ts               # PrismaClient singleton
    response.ts              # success/pagination envelope helpers
    errors.ts                 # AppError + error codes, matches docs/API_DOCUMENTATION.md §4.2
    logger.ts                  # pino logger instance
  middleware/
    errorHandler.ts            # global error handler + 404 handler
  routes/
    health.ts                   # GET /health (includes DB connectivity check)
```

Routes are added incrementally per `docs/task.md`:

- **Phase 2** — `src/middleware/auth.ts` (Clerk), `src/routes/webhooks.ts`
- **Phase 3** — `src/routes/categories.ts`, `src/routes/treatments.ts`, `src/routes/bookingRequests.ts` (public)
- **Phase 4–6** — `src/routes/admin/*`
- **Phase 7** — `src/realtime/` (Socket.IO server + Postgres LISTEN bridge)
- **Phase 8** — `src/routes/docs.ts` (Swagger UI)

## Getting started

```bash
cp .env.example .env
npm install                   # also runs `prisma generate` via postinstall
docker compose up -d          # starts local Postgres
```

Apply the schema (hand-written SQL is the source of truth — see `prisma/migrations/README.md` for why):

```bash
psql "$DATABASE_URL" -f sql/001_base_schema.sql
psql "$DATABASE_URL" -f sql/002_clerk_integration_and_fixes.sql
psql "$DATABASE_URL" -f sql/003_realtime_notifications.sql
npx prisma migrate resolve --applied 0_init   # tells Prisma this baseline is already applied
npx prisma db seed                            # optional: load dev fixtures
```

> The first command above will print one expected error —
> `invalid input syntax for type integer: "2026-000001"` — from the base
> schema's own inline sample data, which trips over the exact bug that
> `002_clerk_integration_and_fixes.sql` fixes. It's harmless (every other
> statement in the file succeeds); use `npx prisma db seed` to get working
> sample booking requests instead. Full explanation in
> `prisma/migrations/README.md`.

Then run the API:

```bash
npm run dev                   # http://localhost:4000, hot reload
curl http://localhost:4000/health
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the API with hot reload (`tsx watch`) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled `dist/index.js` (production) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run db:generate` | Regenerate Prisma Client from `schema.prisma` |
| `npm run db:pull` | Refresh `schema.prisma` from the live DB (safe, read-only) |
| `npm run db:seed` | Load idempotent dev fixtures (`prisma/seed.ts`) |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Status codes & error format

Every response follows the envelope in `docs/API_DOCUMENTATION.md` §4.1:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

Throw `AppError` (see `src/lib/errors.ts`) from anywhere in a route handler or service — the global error handler in `src/middleware/errorHandler.ts` converts it to the right HTTP status and JSON shape automatically. Zod validation errors are converted the same way.

## A note on how this was built

The DB layer (schema, migrations, Prisma models) was built and verified against a **real local Postgres instance**, not assumed from the SQL source alone — that's how a real bug in the original schema (a broken reference-number generator, root-caused live) and a second bug introduced while fixing it (an ambiguous column reference in the fix itself) both got caught and corrected before landing here. See `sql/002_clerk_integration_and_fixes.sql` and `prisma/migrations/README.md` for the details.

One thing that could **not** be verified in the environment this was built in: `npx prisma generate`/`db pull`/`validate` require downloading engine binaries from `binaries.prisma.sh`, which wasn't reachable from that sandbox. `prisma/schema.prisma` was therefore hand-authored to match the live, `psql`-verified schema rather than tool-generated. Run `npx prisma generate` after `npm install` (step above) to confirm it's valid in your own environment — if it throws, that's the first thing to fix.
