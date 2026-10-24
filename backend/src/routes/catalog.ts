import { Router } from 'express';
import { ok } from '../lib/response.js';
import { catalogVersion } from '../lib/catalogVersion.js';

export const catalogRouter = Router();

/** How long the edge may answer the version poll without asking us. */
const VERSION_EDGE_SECONDS = 5;

/**
 * GET /catalog/version, public.
 *
 * The booking page and the website poll this (every 15-30s while the tab is
 * visible) and compare the answer with the X-Catalog-Version header on the
 * catalog copy they hold; a difference means staff changed the menu, and
 * they refetch. The catalog lists themselves stay edge-cached for minutes
 * (middleware/publicCache.ts), the refetch carries the new version as a
 * query parameter, which is a new cache key, so it reaches the database
 * instead of the stale edge copy.
 *
 * Cached at the edge for only a few seconds: long enough that a hundred open
 * tabs cost one function call per interval, short enough that a change is
 * seen within a poll. Browsers get max-age=0 so every poll leaves the page.
 */
catalogRouter.get('/version', async (_req, res, next) => {
  try {
    const version = await catalogVersion();
    const directive = `public, max-age=0, s-maxage=${VERSION_EDGE_SECONDS}, must-revalidate`;
    res.setHeader('Cache-Control', directive);
    res.setHeader('CDN-Cache-Control', directive);
    res.setHeader('Vercel-CDN-Cache-Control', directive);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('Access-Control-Allow-Credentials');
    ok(res, { version });
  } catch (err) {
    next(err);
  }
});
