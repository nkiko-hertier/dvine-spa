import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { okList, ok, parsePagination, buildPaginationMeta } from '../lib/response.js';
import { AppError } from '../lib/errors.js';
import { asString, parseSort } from '../lib/queryParams.js';
import { serializePublicTreatment } from '../lib/serializers.js';
import { withDbRetry } from '../lib/dbRetry.js';
import { catalogVersionForStamp, CATALOG_VERSION_HEADER } from '../lib/catalogVersion.js';

export const treatmentsRouter = Router();

const SORT_FIELDS = ['displayOrder', 'price', 'durationMinutes', 'name'] as const;

/** GET /treatments, public, active only, API_DOCUMENTATION.md §6 */
treatmentsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const categoryId = asString(req.query.category_id);
    const search = asString(req.query.search);
    const minPrice = asString(req.query.min_price);
    const maxPrice = asString(req.query.max_price);
    const minDuration = asString(req.query.min_duration);
    const maxDuration = asString(req.query.max_duration);

    const where: Prisma.TreatmentWhereInput = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(minPrice || maxPrice
        ? { price: { ...(minPrice ? { gte: Number(minPrice) } : {}), ...(maxPrice ? { lte: Number(maxPrice) } : {}) } }
        : {}),
      ...(minDuration || maxDuration
        ? {
            durationMinutes: {
              ...(minDuration ? { gte: Number(minDuration) } : {}),
              ...(maxDuration ? { lte: Number(maxDuration) } : {}),
            },
          }
        : {}),
    };

    const orderBy = parseSort(req.query.sort, SORT_FIELDS, 'displayOrder');

    // The version travels with the list so a client can later tell whether
    // this copy (possibly served from the edge cache) is still current. Read
    // first, so it can only be older than the rows, never newer.
    const version = await catalogVersionForStamp();
    const [treatments, total] = await withDbRetry(() =>
      Promise.all([
        prisma.treatment.findMany({ where, orderBy, skip: offset, take: limit, include: { category: true } }),
        prisma.treatment.count({ where }),
      ]),
    );
    if (version) res.setHeader(CATALOG_VERSION_HEADER, version);

    okList(
      res,
      treatments.map((t) => serializePublicTreatment(t)),
      buildPaginationMeta(page, limit, total),
    );
  } catch (err) {
    next(err);
  }
});

/** GET /treatments/:id, public, 404 if missing or inactive */
treatmentsRouter.get('/:id', async (req, res, next) => {
  try {
    const treatment = await prisma.treatment.findFirst({
      where: { id: req.params.id, isActive: true },
      include: { category: true },
    });
    if (!treatment) throw AppError.notFound('Treatment not found.');
    ok(res, serializePublicTreatment(treatment));
  } catch (err) {
    next(err);
  }
});
