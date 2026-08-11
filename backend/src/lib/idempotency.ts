/**
 * In-memory Idempotency-Key store (API_DOCUMENTATION.md §4.6). Replaying
 * the same key within 24h returns the original response instead of
 * creating a duplicate booking request.
 *
 * LIMITATION: this is process-local — it does not survive a restart and
 * does not work across multiple API instances. That's fine for now (the
 * app runs as a single instance per API_DOCUMENTATION.md Appendix C /
 * §12.6), but if you scale horizontally before revisiting this, move it
 * to Redis (already a dependency once §12.6's multi-instance Socket.IO
 * adapter is added) or a DB table, the same way webhook_events backs
 * webhook idempotency.
 */

interface CachedResponse {
  status: number;
  body: unknown;
  requestHash: string;
  expiresAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const store = new Map<string, CachedResponse>();

function hashBody(body: unknown): string {
  // Cheap structural fingerprint — good enough to detect "same key, different
  // body" misuse without pulling in a crypto hash for a dev-scale check.
  return JSON.stringify(body);
}

function sweepExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

/** Returns the cached response for `key` if present and the body matches, `null` if no entry, or throws AppError-shaped info via the `mismatch` flag if the body differs. */
export function getIdempotentResponse(
  key: string,
  requestBody: unknown,
): { status: number; body: unknown } | 'mismatch' | null {
  sweepExpired();
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.requestHash !== hashBody(requestBody)) return 'mismatch';
  return { status: entry.status, body: entry.body };
}

export function storeIdempotentResponse(key: string, requestBody: unknown, status: number, body: unknown): void {
  store.set(key, { status, body, requestHash: hashBody(requestBody), expiresAt: Date.now() + TTL_MS });
}
