import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asString, parseSort } from '../../lib/queryParams.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../../schemas/index.js';
import { serializeCategory } from '../../lib/serializers.js';
import { categoryHasBookings } from '../../lib/treatmentUsage.js';

export const adminCategoriesRouter = Router();

const SORT_FIELDS = ['displayOrder', 'name', 'createdAt'] as const;

/** GET /admin/categories, includes inactive rows unless ?is_active is set */
adminCategoriesRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const isActiveRaw = asString(req.query.is_active);
    const search = asString(req.query.search);

    const where: Prisma.CategoryWhereInput = {
      ...(isActiveRaw !== undefined ? { isActive: isActiveRaw === 'true' } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const orderBy = parseSort(req.query.sort, SORT_FIELDS, 'displayOrder');

    const [categories, total] = await Promise.all([
      prisma.category.findMany({ where, orderBy, skip: offset, take: limit }),
      prisma.category.count({ where }),
    ]);

    okList(res, categories.map(serializeCategory), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) throw AppError.notFound('Category not found.');
    ok(res, serializeCategory(category));
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.post('/', async (req, res, next) => {
  try {
    const input = parseOrThrow(categoryCreateSchema, req.body);
    const category = await prisma.category.create({
      data: {
        name: input.name,
        description: input.description,
        coverImageUrl: input.cover_image_url,
        displayOrder: input.display_order,
      },
    });
    ok(res, serializeCategory(category), 201);
  } catch (err) {
    next(err);
  }
});

adminCategoriesRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(categoryUpdateSchema, req.body);
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Category not found.');

    const cascade = asString(req.query.cascade) === 'true';
    if (input.is_active === false && !cascade) {
      const activeTreatmentCount = await prisma.treatment.count({
        where: { categoryId: existing.id, isActive: true },
      });
      if (activeTreatmentCount > 0) {
        throw AppError.unprocessable(
          `This category has ${activeTreatmentCount} active treatment(s). Pass ?cascade=true to deactivate them too, or deactivate them individually first.`,
        );
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.cover_image_url !== undefined ? { coverImageUrl: input.cover_image_url } : {}),
          ...(input.display_order !== undefined ? { displayOrder: input.display_order } : {}),
          ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
          // The DB trigger bumps this on every UPDATE; set it here as well so
          // the public catalog version (lib/catalogVersion.ts) moves even on
          // a database restored without the trigger.
          updatedAt: new Date(),
        },
      });
      if (input.is_active === false && cascade) {
        await tx.treatment.updateMany({
          where: { categoryId: existing.id },
          data: { isActive: false, updatedAt: new Date() },
        });
      }
      return updated;
    });

    ok(res, serializeCategory(category));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/categories/:id
 *
 * Hard delete when none of this category's treatments have ever been
 * booked (also removes those never-booked treatments, so nothing is left
 * dangling with a null category_id). Otherwise falls back to a soft
 * delete (isActive=false), booking_requests.treatment_id is ON DELETE
 * RESTRICT, so a hard delete would fail anyway once a booking exists.
 */
adminCategoriesRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Category not found.');

    // Counts bookings that use a treatment of this category as the primary
    // service or as an extra service on a multi-service booking.
    if (!(await categoryHasBookings(existing.id))) {
      await prisma.$transaction([
        prisma.treatment.deleteMany({ where: { categoryId: existing.id } }),
        prisma.category.delete({ where: { id: existing.id } }),
      ]);
      ok(res, { id: existing.id, deleted: true });
      return;
    }

    const category = await prisma.category.update({
      where: { id: existing.id },
      data: { isActive: false, updatedAt: new Date() },
    });
    ok(res, serializeCategory(category));
  } catch (err) {
    next(err);
  }
});
