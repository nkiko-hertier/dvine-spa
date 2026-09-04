import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asString, parseSort } from '../../lib/queryParams.js';
import { treatmentCreateSchema, treatmentUpdateSchema } from '../../schemas/index.js';
import { serializeTreatment } from '../../lib/serializers.js';

export const adminTreatmentsRouter = Router();

const SORT_FIELDS = ['displayOrder', 'name', 'price', 'durationMinutes', 'createdAt'] as const;

/** GET /admin/treatments — includes inactive rows unless ?is_active is set */
adminTreatmentsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const isActiveRaw = asString(req.query.is_active);
    const categoryId = asString(req.query.category_id);
    const search = asString(req.query.search);

    const where: Prisma.TreatmentWhereInput = {
      ...(isActiveRaw !== undefined ? { isActive: isActiveRaw === 'true' } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const orderBy = parseSort(req.query.sort, SORT_FIELDS, 'displayOrder');

    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({ where, orderBy, skip: offset, take: limit, include: { category: true } }),
      prisma.treatment.count({ where }),
    ]);

    okList(res, treatments.map(serializeTreatment), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
});

adminTreatmentsRouter.get('/:id', async (req, res, next) => {
  try {
    const treatment = await prisma.treatment.findUnique({ where: { id: req.params.id }, include: { category: true } });
    if (!treatment) throw AppError.notFound('Treatment not found.');
    ok(res, serializeTreatment(treatment));
  } catch (err) {
    next(err);
  }
});

adminTreatmentsRouter.post('/', async (req, res, next) => {
  try {
    const input = parseOrThrow(treatmentCreateSchema, req.body);
    const treatment = await prisma.treatment.create({
      data: {
        categoryId: input.category_id,
        name: input.name,
        description: input.description,
        durationMinutes: input.duration_minutes,
        price: input.price,
        imageUrl: input.image_url,
        benefits: input.benefits ?? [],
        recommendedFor: input.recommended_for ?? [],
        displayOrder: input.display_order,
      },
    });
    const created = await prisma.treatment.findUniqueOrThrow({ where: { id: treatment.id }, include: { category: true } });
    ok(res, serializeTreatment(created), 201);
  } catch (err) {
    next(err);
  }
});

adminTreatmentsRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(treatmentUpdateSchema, req.body);
    const existing = await prisma.treatment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Treatment not found.');

    const data = {
      ...(input.category_id !== undefined ? { categoryId: input.category_id } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.duration_minutes !== undefined ? { durationMinutes: input.duration_minutes } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.image_url !== undefined ? { imageUrl: input.image_url } : {}),
      ...(input.benefits !== undefined ? { benefits: input.benefits } : {}),
      ...(input.recommended_for !== undefined ? { recommendedFor: input.recommended_for } : {}),
      ...(input.display_order !== undefined ? { displayOrder: input.display_order } : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };

    try {
      const treatment = await prisma.treatment.update({ where: { id: existing.id }, data, include: { category: true } });
      ok(res, serializeTreatment(treatment));
    } catch (dbErr) {
      // check_duration_positive / check_price_positive constraint violations
      // surface as Postgres error 23514 — map to 422, not a raw 500 (§6).
      if (dbErr instanceof Prisma.PrismaClientKnownRequestError && dbErr.code === 'P2010') {
        throw AppError.unprocessable('duration_minutes and price must both be positive.');
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /admin/treatments/:id
 *
 * Hard delete when this treatment has never been booked. Otherwise falls
 * back to a soft delete (isActive=false) — booking_requests.treatment_id
 * is ON DELETE RESTRICT, so a hard delete would fail anyway once a
 * booking exists.
 */
adminTreatmentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.treatment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Treatment not found.');

    const bookingCount = await prisma.bookingRequest.count({ where: { treatmentId: existing.id } });
    if (bookingCount === 0) {
      await prisma.treatment.delete({ where: { id: existing.id } });
      ok(res, { id: existing.id, deleted: true });
      return;
    }

    const treatment = await prisma.treatment.update({ where: { id: existing.id }, data: { isActive: false }, include: { category: true } });
    ok(res, serializeTreatment(treatment));
  } catch (err) {
    next(err);
  }
});
