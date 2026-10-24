import type { RequestHandler } from 'express';

/**
 * Edge caching for the public catalog (GET /categories*, GET /treatments*).
 *
 * Why: the API runs as a Vercel serverless function. A cold instance takes
 * ~5s (Express + Prisma + DB connect), and Vercel starts a fresh instance for
 * every concurrent request, so the booking page's two boot requests routinely
 * hit two cold starts at once and occasionally time out, visitors then see
 * "Something is in the way / We could not load the treatment menu".
 *
 * These responses are identical for every visitor and change only when staff
 * edit the catalog, so they belong in Vercel's CDN:
 *   - s-maxage: served straight from the edge, in milliseconds, with no
 *     function invocation at all.
 *   - stale-while-revalidate: after that window the edge still answers
 *     instantly with the last copy and refreshes it in the background, the
 *     cold start happens off the visitor's critical path.
 *   - stale-if-error: if the function does fail, the edge keeps serving the
 *     last good copy instead of the error.
 *
 * Cached responses are shared across origins, so CORS is answered with `*`
 * here instead of echoing the request origin (these endpoints are public and
 * never use cookies or Authorization). Error responses are excluded from the
 * cache by the global error handler (Cache-Control: no-store).
 */
export function publicCache({ sMaxAge = 120, swr = 86400 }: { sMaxAge?: number; swr?: number } = {}): RequestHandler {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const directive = `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}, stale-if-error=${swr}`;
    res.setHeader('Cache-Control', directive);
    res.setHeader('CDN-Cache-Control', directive);
    res.setHeader('Vercel-CDN-Cache-Control', directive);

    // One cached copy must be valid for every site that reads the catalog.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.setHeader('Vary', 'Accept-Encoding');

    next();
  };
}
