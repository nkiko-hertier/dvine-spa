import { prisma } from './prisma.js';
import { withDbRetry } from './dbRetry.js';
import { logger } from './logger.js';

/** Header the public catalog responses carry their version in. */
export const CATALOG_VERSION_HEADER = 'X-Catalog-Version';

type VersionRow = { categories: string; treatments: string };

/**
 * A short string that changes whenever the public catalog (categories or
 * treatments) changes, so a client can tell in one tiny request whether the
 * copy it holds is current, the booking page and the website poll this and
 * refetch only on a change (they cannot hold a socket open to the API, which
 * runs as a serverless function).
 *
 * One statement: per table, an md5 over every row's id and updated_at, in id
 * order. Any insert, hard delete or update (the BEFORE UPDATE triggers in
 * sql/001_base_schema.sql touch updated_at on every edit, soft delete and
 * reactivation) changes the digest. A digest rather than max(updated_at)
 * and count(): it does not care which way a timestamp moved (a trigger
 * writing in the session time zone, a restored row), needs no clock parsing
 * on this side, so every instance computes the same string, and two edits
 * inside one millisecond still differ. Both tables are a few dozen rows.
 */
export async function catalogVersion(): Promise<string> {
  const rows = await withDbRetry(
    () => prisma.$queryRaw<VersionRow[]>`
      SELECT
        (SELECT md5(coalesce(string_agg(id::text || '@' || updated_at::text, ',' ORDER BY id), ''))
           FROM categories) AS categories,
        (SELECT md5(coalesce(string_agg(id::text || '@' || updated_at::text, ',' ORDER BY id), ''))
           FROM treatments) AS treatments`,
  );
  const row = rows[0];
  if (!row) throw new Error('catalog version query returned no row');
  return `${row.categories.slice(0, 16)}.${row.treatments.slice(0, 16)}`;
}

/**
 * The version for stamping a list response, or null when it cannot be read:
 * the header is advisory (clients fall back to the poll), so a list must
 * never fail because of it. Call it BEFORE the list query so the stamp can
 * only ever be older than the rows it travels with, a stamp from after a
 * change, on rows from before it, would make every client believe a stale
 * copy is current.
 */
export async function catalogVersionForStamp(): Promise<string | null> {
  try {
    return await catalogVersion();
  } catch (err) {
    logger.warn({ err }, 'Could not compute the catalog version; the list goes out unstamped.');
    return null;
  }
}
