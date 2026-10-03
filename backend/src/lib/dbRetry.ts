import { logger } from './logger.js';

/**
 * Postgres / Prisma errors that are worth a second try: the connection was
 * dropped or the pooler was momentarily unavailable. Anything else (bad SQL,
 * constraint violations, validation) fails immediately.
 */
const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // can't reach database server
  'P1002', // database server timed out
  'P1008', // operation timed out
  'P1017', // server closed the connection
  'P2024', // timed out fetching a connection from the pool
  'P2028', // transaction API error
]);

const TRANSIENT_NODE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
  '08000',
  '08003',
  '08006', // connection_failure
]);

function isTransient(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown; cause?: unknown };
  if (typeof e.code === 'string' && (TRANSIENT_PRISMA_CODES.has(e.code) || TRANSIENT_NODE_CODES.has(e.code))) {
    return true;
  }
  if (typeof e.message === 'string' && /connection (terminated|closed)|terminating connection/i.test(e.message)) {
    return true;
  }
  return e.cause ? isTransient(e.cause) : false;
}

export type DbRetryOptions = {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Delay before the first retry in ms; doubles each time. Default 100. */
  baseDelayMs?: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run a database operation, retrying a couple of times when the failure
 * looks like a dropped or briefly unavailable connection (common with
 * serverless functions and poolers that recycle idle connections).
 * Non-transient errors are rethrown immediately.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, options: DbRetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 100;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !isTransient(err)) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      logger.warn({ err, attempt, delay }, 'Transient database error, retrying.');
      await sleep(delay);
    }
  }
  throw lastErr;
}
