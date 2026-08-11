import { Router } from 'express';
import { ok } from '../lib/response.js';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

/**
 * GET /health
 * Unauthenticated liveness check. Reports DB connectivity via Prisma;
 * still returns 200 with database:"error" rather than 503, so container
 * orchestrators don't flap the process on a transient DB blip — adjust
 * if your deploy target expects a hard failure instead.
 */
healthRouter.get('/health', async (_req, res) => {
  let database: 'connected' | 'error' = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'error';
  }

  ok(res, { status: 'ok', uptime_seconds: Math.round(process.uptime()), database });
});
