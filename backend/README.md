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
  index.ts                 # process entry point, starts the HTTP server + realtime
  app.ts                   # Express app assembly (middleware + route mounting)
  config/env.ts             # env var loading & validation (zod)
  lib/
    prisma.ts               # PrismaClient singleton
    resolveStaff.ts          # shared Clerk-user-id -> active staff lookup (HTTP + socket auth)
    response.ts              # success/pagination envelope helpers
    serializers.ts            # snake_case response mapping (incl. BigInt->Number for view COUNT columns)
    errors.ts                 # AppError + error codes, matches docs/API_DOCUMENTATION.md §4.2
    logger.ts                  # pino logger instance
    bookingStatusMachine.ts     # enforces the status transition diagram (§8.5)
    idempotency.ts               # in-memory Idempotency-Key store (§4.6)
    time.ts                       # HH:MM <-> Date helper for Postgres TIME columns
    validate.ts                    # Zod parse-or-throw helper
    queryParams.ts                  # list-endpoint filter/sort/pagination parsing
  middleware/
    auth.ts                   # requireAuth / requireRole (Clerk)
    rateLimit.ts                # public/booking/admin rate limiters (§4.5)
    errorHandler.ts              # global error handler + 404 handler
  schemas/index.ts            # Zod request validation (snake_case wire format — see note below)
  routes/
    health.ts                   # GET /health (includes DB connectivity check)
    docs.ts                      # GET /docs (Swagger UI), GET /openapi.json
    webhooks.ts                   # POST /webhooks/clerk
    categories.ts, treatments.ts, bookingRequests.ts   # public endpoints
    admin/                          # all /admin/* endpoints, one file per resource
  realtime/
    socket.ts                   # Socket.IO server + Clerk handshake auth (§12)
    pgListener.ts                 # Postgres LISTEN/NOTIFY bridge with reconnect
  openapi/
    setup.ts                    # registry + envelope/error schemas
    schemas.ts                    # response schemas mirroring lib/serializers.ts
    paths.ts                       # path registrations, reuses schemas/index.ts for request bodies
    document.ts                     # generates the final OpenAPI document
```

> **Wire format note:** request and response bodies are `snake_case` throughout (`full_name`, `treatment_id`), matching `docs/API_DOCUMENTATION.md`. Zod schemas in `schemas/index.ts` validate the snake_case shape directly; route handlers map explicitly to Prisma's camelCase columns. Don't "fix" either side to match the other's casing — that mismatch was a real bug once, see `docs/task.md`'s Phase 2-6 notes.

Routes are added incrementally per `docs/task.md`. Phases 2-8 are code-complete (auth, public/admin endpoints, realtime, API docs) — see `docs/task.md` for what's still unverified (live Clerk/DB testing) versus what's genuinely done.

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

- **API reference (Swagger UI):** http://localhost:4000/docs (raw spec at `/openapi.json`) — generated from the same Zod schemas the routes validate against, so it can't drift silently from what the code actually accepts.
- **Realtime:** Socket.IO mounts on the same HTTP server automatically; connect with a Clerk session token in `auth: { token }` (see `docs/API_DOCUMENTATION.md` §12). Requires `CLERK_SECRET_KEY` and `DATABASE_URL` to be set — the server logs a warning at startup if either is missing, rather than failing silently on first connection.

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
