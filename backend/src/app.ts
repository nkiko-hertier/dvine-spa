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
import { bookingRequestsRouter } from './routes/bookingRequests.js';
import { adminRouter } from './routes/admin/index.js';
import { docsRouter } from './routes/docs.js';
import { publicLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Webhook routes need the RAW body for Svix signature verification, so
  // they're mounted before the global express.json() below — verifying a
  // signature against an already-parsed-and-reserialized body will fail.
  app.use('/webhooks', webhookRouter);

  app.use(
    cors({
      origin: env.DASHBOARD_URL,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
    }),
  );

  // Attaches Clerk auth state to the request without requiring it — actual
  // enforcement happens in requireAuth (src/middleware/auth.ts), used by
  // adminRouter below. Public routes never see this middleware block them.
  app.use(clerkMiddleware());

  app.use(healthRouter);

  // Swagger UI at /docs, generated from the same Zod schemas the routes
  // validate against (see docs/API_DOCUMENTATION.md's top-of-file note).
  // Gate this behind auth or an internal-only network in production if the
  // API itself is public-facing — left open here since it's dev tooling,
  // not a data endpoint, but that's a deployment decision, not a code one.
  app.use(docsRouter);

  // Public (unauthenticated), rate-limited per API_DOCUMENTATION.md §4.5.
  app.use('/categories', publicLimiter, categoriesRouter);
  app.use('/treatments', publicLimiter, treatmentsRouter);
  app.use('/booking-requests', publicLimiter, bookingRequestsRouter);

  // Dashboard (Clerk-authenticated) — auth/role/rate-limit enforced inside
  // adminRouter itself, see src/routes/admin/index.ts.
  app.use('/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
