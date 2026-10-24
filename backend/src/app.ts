import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { webhookRouter } from './routes/webhooks.js';
import { categoriesRouter } from './routes/categories.js';
import { treatmentsRouter } from './routes/treatments.js';
import { catalogRouter } from './routes/catalog.js';
import { bookingRequestsRouter } from './routes/bookingRequests.js';
import { adminRouter } from './routes/admin/index.js';
import { docsRouter } from './routes/docs.js';
import { publicLimiter } from './middleware/rateLimit.js';
import { publicCache } from './middleware/publicCache.js';
import { cronRouter } from './routes/internal/cron.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Behind Vercel (and Docker behind a reverse proxy) the socket peer is the
  // platform's own proxy, so without this every request has the same req.ip
  // and the per-IP rate limiters below put ALL visitors into one shared
  // 60-requests-per-minute bucket, a few people browsing the catalog at once
  // was enough to 429 everyone on that instance. Trusting the first proxy hop
  // makes req.ip the real client address from X-Forwarded-For (Vercel sets
  // that header itself and strips any client-supplied value).
  if (process.env.VERCEL === '1' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // Webhook routes need the RAW body for Svix signature verification, so
  // they're mounted before the global express.json() below, verifying a
  // signature against an already-parsed-and-reserialized body will fail.
  app.use('/webhooks', webhookRouter);

  app.use(
    cors({
      origin: true,
      credentials: true,
      // Lets the booking page and the website read the catalog version off
      // the list responses (lib/catalogVersion.ts).
      exposedHeaders: ['X-Catalog-Version'],
    }),
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
      customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
      customErrorMessage: (req, res, err) => {
        const reason = err instanceof Error ? err.message : String(err);
        return `${req.method} ${req.url} -> ${res.statusCode} (${reason})`;
      },
    }),
  );

  // Liveness check is mounted BEFORE clerkMiddleware so it keeps answering
  // even if Clerk env vars are missing/misconfigured (clerkMiddleware throws
  // per-request without a publishable key). Uptime monitors hit /health.
  app.use(healthRouter);

  // Attaches Clerk auth state to the request without requiring it, actual
  // enforcement happens in requireAuth (src/middleware/auth.ts), used by
  // adminRouter below. Public routes never see this middleware block them.
  app.use(clerkMiddleware());

  // Swagger UI at /docs, generated from the same Zod schemas the routes
  // validate against (see docs/API_DOCUMENTATION.md's top-of-file note).
  // Gate this behind auth or an internal-only network in production if the
  // API itself is public-facing, left open here since it's dev tooling,
  // not a data endpoint, but that's a deployment decision, not a code one.
  app.use(docsRouter);

  // Public (unauthenticated), rate-limited per API_DOCUMENTATION.md §4.5.
  // The catalog is also edge-cached (see middleware/publicCache.ts) so the
  // booking page never waits on a serverless cold start.
  app.use('/categories', publicLimiter, publicCache(), categoriesRouter);
  app.use('/treatments', publicLimiter, publicCache(), treatmentsRouter);
  // Version check for the two lists above, polled, so never cached
  // (routes/catalog.ts sets no-store itself).
  app.use('/catalog', publicLimiter, catalogRouter);
  app.use('/booking-requests', publicLimiter, bookingRequestsRouter);

  // Dashboard (Clerk-authenticated), auth/role/rate-limit enforced inside
  // adminRouter itself, see src/routes/admin/index.ts.
  app.use('/admin', adminRouter);

  // Scheduled sweeps (Vercel Cron). Not part of the public API: every
  // call needs the CRON_SECRET bearer token, see routes/internal/cron.ts.
  app.use('/internal/cron', cronRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
