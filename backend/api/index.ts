/**
 * Vercel serverless entry point.
 *
 * Vercel routes every request (see ../vercel.json `rewrites`) into this one
 * function, which hands the raw req/res straight to the Express app.
 *
 * Differences from `src/index.ts` (the long-running server used by Docker /
 * local dev):
 *   - No `app.listen()` — Vercel owns the HTTP server.
 *   - No Socket.IO / Postgres LISTEN bridge. Vercel Functions cannot hold
 *     open WebSocket connections, so realtime dashboard updates are only
 *     available when the backend runs as a persistent process. Deploy the
 *     realtime piece separately (Railway / Render / Fly / a VM) or let the
 *     dashboard fall back to polling.
 *
 * Imports the COMPILED app from ../dist — `vercel-build` runs `tsc` before
 * the function is bundled, so dist/app.js exists at build time.
 */
// @ts-nocheck — trivial glue; `../dist` only exists after `vercel-build` runs.
import { createApp } from '../dist/app.js';

export default createApp();
