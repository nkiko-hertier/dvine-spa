import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/response.js';
import { AppError } from '../lib/errors.js';
import { serializePublicTreatment } from '../lib/serializers.js';

export const categoriesRouter = Router();

/** GET /categories — public, active only, ordered by display_order (§5) */
categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { treatments: { where: { isActive: true } } } } },
    });

    ok(
      res,
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        cover_image_url: c.coverImageUrl,
        display_order: c.displayOrder,
        treatment_count: c._count.treatments,
      })),
    );
  } catch (err) {
    next(err);
  }
});

/** GET /categories/:id — public, 404 if missing or inactive */
categoriesRouter.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findFirst({ where: { id: req.params.id, isActive: true } });
    if (!category) throw AppError.notFound('Category not found.');
    ok(res, {
      id: category.id,
      name: category.name,
      description: category.description,
      cover_image_url: category.coverImageUrl,
      display_order: category.displayOrder,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /categories/:id/treatments — public shortcut for /treatments?category_id=:id */
categoriesRouter.get('/:id/treatments', async (req, res, next) => {
  try {
    const category = await prisma.category.findFirst({ where: { id: req.params.id, isActive: true } });
    if (!category) throw AppError.notFound('Category not found.');

    const treatments = await prisma.treatment.findMany({
      where: { categoryId: category.id, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: { category: true },
    });
    ok(res, treatments.map((t) => serializePublicTreatment(t)));
  } catch (err) {
    next(err);
  }
});
