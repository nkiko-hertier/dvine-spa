import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asString, parseSort } from '../../lib/queryParams.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../../schemas/index.js';
import { serializeCategory } from '../../lib/serializers.js';

export const adminCategoriesRouter = Router();

const SORT_FIELDS = ['displayOrder', 'name', 'createdAt'] as const;

/** GET /admin/categories — includes inactive rows unless ?is_active is set */
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
        },
      });
      if (input.is_active === false && cascade) {
        await tx.treatment.updateMany({ where: { categoryId: existing.id }, data: { isActive: false } });
      }
      return updated;
    });

    ok(res, serializeCategory(category));
  } catch (err) {
    next(err);
  }
});

/** Soft delete — categories are never hard-deleted (§5). */
adminCategoriesRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Category not found.');
    const category = await prisma.category.update({ where: { id: existing.id }, data: { isActive: false } });
    ok(res, serializeCategory(category));
  } catch (err) {
    next(err);
  }
});
