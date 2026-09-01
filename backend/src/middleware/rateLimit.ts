import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ErrorCode } from '../lib/errors.js';

function rateLimitedResponse(_req: unknown, res: import('express').Response) {
  res.status(429).json({
    success: false,
    error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests. Please slow down.' },
  });
}

/** Public endpoints, per IP — 60 req/min (API_DOCUMENTATION.md §4.5). */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
});

/** POST /booking-requests, per IP — 5 req/min. */
export const bookingCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,
});

/** /admin/*, per authenticated user — 300 req/min. Keyed on staff id
 * (set by requireAuth) rather than IP, since staff may share office IPs. */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Key on the authenticated staff id; fall back to IP for the brief window
  // before requireAuth runs. The IP must go through ipKeyGenerator so IPv6
  // clients are bucketed by /64 subnet — express-rate-limit v8 throws at
  // startup (ERR_ERL_KEY_GEN_IPV6) if a custom keyGenerator uses req.ip raw.
  keyGenerator: (req) => req.staff?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  handler: rateLimitedResponse,
});
