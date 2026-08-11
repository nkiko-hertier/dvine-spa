import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Webhook routes need the raw body for signature verification, so they're
  // mounted with express.raw() *before* the global express.json() below.
  // (Wired up in Phase 2 — placeholder noted here so the ordering isn't
  // accidentally broken later: app.use('/webhooks', webhookRouter))

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

  app.use(healthRouter);

  // Phase 3+: app.use('/categories', categoriesRouter); etc.
  // Phase 2+: app.use('/webhooks', webhookRouter);
  // Phase 2+: app.use('/admin', requireAuth, adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
