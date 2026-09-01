import { waitUntil } from '@vercel/functions';
import { logger } from './logger.js';

const isServerless = process.env.VERCEL === '1';

/**
 * Run background work that should outlive the HTTP response (e.g. sending
 * notification emails after a booking is created).
 *
 * On a long-running server a bare `void promise` is fine. On Vercel the
 * function can be frozen the instant the response is flushed, so unfinished
 * promises may never settle — `waitUntil` keeps the invocation alive until
 * they do. Off-Vercel this falls back to plain fire-and-forget. Never throws.
 */
export function deferAfterResponse(promise: Promise<unknown>, label: string): void {
  const guarded = Promise.resolve(promise).catch((err) => {
    logger.error({ err, label }, `Deferred task "${label}" failed.`);
  });

  if (isServerless) {
    try {
      waitUntil(guarded);
      return;
    } catch {
      // No active Vercel request context — fall through to fire-and-forget.
    }
  }

  void guarded;
}
