# Deploying the backend to Vercel (serverless functions)

The Express app is served by a single catch-all function at `api/index.ts`.
Every request is rewritten to it (`vercel.json`), so all existing routes
(`/health`, `/categories`, `/admin/*`, `/webhooks/clerk`, `/docs`, …) keep
working unchanged.

## One-time project setup

1. **New Project** → import this repo.
2. **Root Directory**: `backend`.
3. **Framework Preset**: Other (the `vercel.json` sets `framework: null`).
4. Build / install commands come from `vercel.json` — leave the UI fields blank:
   - install: `pnpm install --frozen-lockfile --config.dangerously-allow-all-builds=true`
   - build: `pnpm run vercel-build` (`prisma generate && tsc`)
5. **Node.js Version**: 22.x (also pinned via `package.json` `engines`).

## Environment variables (Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you use it):

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | **Pooled** connection string — see below. Required. |
| `NODE_ENV` | `production` |
| `DASHBOARD_URL` | Admin dashboard origin — used for CORS and invitation redirects. |
| `FRONTEND_URL` | Public site origin — used in email links. |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` | Clerk. |
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` *or* `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` | Email provider (optional; no email sent if unset). |
| `SENDGRID_FROM_NAME`, `REVIEW_LINK_URL` | Optional. |

`VERCEL=1` is injected by the platform — don't set it yourself. The code keys
off it to (a) cap the Postgres pool at 1 per instance and (b) use `waitUntil`
so post-response notification emails actually finish.

`PORT` is ignored on Vercel (no `listen`).

## Database — must be pooled

Serverless runs many short-lived instances concurrently. A direct Postgres
connection string will hit `too many connections` fast. Use one of:

- **Neon** – the *pooled* connection string (host contains `-pooler`).
- **Supabase** – the connection pooler URL (port `6543`, `?pgbouncer=true`).
- **PgBouncer** (transaction mode) in front of your own Postgres.
- **Prisma Accelerate** – `prisma://…` URL (needs `@prisma/extension-accelerate`, not wired up here).

Migrations are hand-written SQL in `sql/` / `prisma/migrations` and are **not**
run by the build — apply them out of band against the database.

## What does NOT run on Vercel

- **Realtime** – `src/realtime/*` (Socket.IO + Postgres `LISTEN/NOTIFY`).
  Vercel Functions can't hold WebSocket connections. `api/index.ts` never
  imports it. If you need live dashboard updates, run `src/index.ts` (the
  full server, via the `Dockerfile`) on Railway / Render / Fly / a VM and
  point the dashboard's socket at that host. Otherwise have the dashboard poll.
- **In-memory rate limiting** (`src/middleware/rateLimit.ts`) and the
  **idempotency store** (`src/lib/idempotency.ts`) are per-instance, so they
  only weakly apply across serverless invocations. Move them to Upstash Redis
  (or a DB table) if you need hard guarantees.

## Webhook body

`POST /webhooks/clerk` needs the raw request body for Svix verification. It's
mounted before `express.json()` and Vercel passes the stream through to the
Express app, so it works — but verify with a real Clerk delivery after the
first deploy (Clerk Dashboard → Webhooks → "Send example").

## Deploy

```bash
# from repo root, or set Root Directory = backend in the dashboard
vercel --cwd backend            # preview
vercel --cwd backend --prod     # production
```

## Smoke test

```bash
curl https://<deployment>.vercel.app/health
curl https://<deployment>.vercel.app/treatments
```
