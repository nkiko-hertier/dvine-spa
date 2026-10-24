import { Prisma } from '@prisma/client';
import { logger } from './logger.js';

/**
 * Retries a read once or twice when the database connection itself failed,
 * not when the query was wrong.
 *
 * Why: on Vercel each function instance keeps a single pooled connection
 * (lib/prisma.ts). Managed Postgres (Neon, Supabase, PgBouncer) drops idle
 * connections after a few minutes and Neon also suspends its compute, so the
 * first query on a warm-but-idle instance regularly fails with "Connection
 * terminated unexpectedly", ECONNRESET, or a connect timeout while the
 * database wakes up. Those errors are transient; a second attempt a moment
 * later succeeds. Without this, the public catalog answered 500 and the
 * booking page showed "Something is in the way".
 *
 * Only ever use this for idempotent reads.
 */
const TRANSIENT_CODES = new Set([
  'P1001', // can't reach database server
  'P1002', // database server reached but timed out
  'P1008', // operations timed out
  'P1017', // server has closed the connection
  'P2024', // timed out fetching a connection from the pool
]);

const TRANSIENT_MESSAGE = /connection terminated|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|timeout exceeded when trying to connect|Connection is closed|terminating connection|server closed the connection|too many connections|Client has encountered a connection error/i;

export function isTransientDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return TRANSIENT_CODES.has(err.code);
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return TRANSIENT_MESSAGE.test(message);
}

export async function withDbRetry<T>(read: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await read();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !isTransientDbError(err)) throw err;
      logger.warn({ err, attempt }, 'Transient database error, retrying');
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw lastError;
}
