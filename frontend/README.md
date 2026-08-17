# D'Vine Spa Dashboard

A standalone Vite + React + TypeScript app for the D'Vine Spa staff
booking-request dashboard. Converted from a pnpm-monorepo/Replit project
into a normal single-package app you can run anywhere.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `VITE_API_URL` — the API server this dashboard talks to (defaults to
  `http://localhost:3001`). The original project's API server lives in
  `artifacts/api-server` of the source repo — run that separately, or
  point this at your own backend that implements the same routes.
- `VITE_CLERK_PUBLISHABLE_KEY` — a Clerk publishable key. The dashboard
  won't render without one. Create a free project at
  [clerk.com](https://clerk.com) and add a JWT template named exactly
  `default` (the app requests tokens with `getToken({ template: 'default' })`).

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck, then build to `dist/`
- `npm run preview` — preview the production build
- `npm run typecheck` — typecheck only

## Structure

```
src/
  api/            Generated TanStack Query hooks + fetch wrapper (talks to VITE_API_URL)
  auth/           Clerk sign-in/sign-up pages, landing page, token bridge
  components/     Shared UI pieces (cards, dialogs, drawers, empty/loading states)
  pages/          One file per route (Home, Analytics, Customers, Catalog, Team)
  lib/            Formatting helpers, the shared QueryClient, base-path helper
  App.tsx         Top-level providers (Clerk, React Query, wouter) + top routes
  Router.tsx      The signed-in workspace routes, wrapped in AppShell
  WorkspaceGate.tsx  Gates the workspace behind Clerk auth state
  main.tsx        Entry point
```

The whole UI used to live in one 391-line `App.tsx`; it's now split by
route (`pages/`) and by reusable piece (`components/`, `auth/`), with a
single set of formatting helpers and a single QueryClient shared across
the app.

## Notes carried over from the original project

- No database is required by the reference API server — it holds data
  in-memory and resets on restart.
- Role-based access control isn't enforced server-side yet — see the
  original repo's `replit.md` if you're standing the API server back up.
- Auth uses a Clerk bearer token attached to every request rather than
  same-origin session cookies, since the dashboard and API are meant to
  run on separate origins/ports.
