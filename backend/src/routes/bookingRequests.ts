import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/response.js';
import { AppError } from '../lib/errors.js';
import { parseOrThrow } from '../lib/validate.js';
import { bookingRequestCreateSchema, bookingRequestLookupSchema } from '../schemas/index.js';
import { getIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { bookingCreateLimiter } from '../middleware/rateLimit.js';
import { timeStringToDate } from '../lib/time.js';

export const bookingRequestsRouter = Router();

/** POST /booking-requests — public — API_DOCUMENTATION.md §8.1 */
bookingRequestsRouter.post('/', bookingCreateLimiter, async (req, res, next) => {
  try {
    const idempotencyKey = req.header('Idempotency-Key');
    if (idempotencyKey) {
      const cached = getIdempotentResponse(idempotencyKey, req.body);
      if (cached === 'mismatch') {
        throw AppError.conflict('Idempotency-Key was already used with a different request body.');
      }
      if (cached) {
        res.status(cached.status).json(cached.body);
        return;
      }
    }

    const input = parseOrThrow(bookingRequestCreateSchema, req.body);

    const treatment = await prisma.treatment.findUnique({ where: { id: input.treatment_id } });
    if (!treatment) throw AppError.notFound('Treatment not found.');
    if (!treatment.isActive) {
      throw AppError.unprocessable('This treatment is not currently available for booking.');
    }

    const preferredDate = new Date(input.preferred_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (preferredDate < today) {
      throw AppError.validation('preferred_date must be today or later.', [
        { field: 'preferred_date', issue: 'Date is in the past.' },
      ]);
    }

    // Upsert-by-phone: reuse the existing customer if this phone number has
    // booked before; `source`/`notes` only apply the first time (§8.1 table).
    const customer = await prisma.customer.upsert({
      where: { phoneNumber: input.phone_number },
      update: {},
      create: {
        fullName: input.full_name,
        phoneNumber: input.phone_number,
        whatsappNumber: input.whatsapp_number ?? input.phone_number,
        source: input.source,
        notes: input.notes,
      },
    });

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        customerId: customer.id,
        treatmentId: treatment.id,
        preferredDate,
        preferredTime: timeStringToDate(input.preferred_time),
        channel: input.channel ?? 'website',
      },
    });

    const responseBody = {
      success: true,
      data: {
        id: bookingRequest.id,
        request_reference: bookingRequest.requestReference,
        status: bookingRequest.status,
        treatment: {
          id: treatment.id,
          name: treatment.name,
          price: treatment.price.toFixed(2),
          duration_minutes: treatment.durationMinutes,
        },
        preferred_date: bookingRequest.preferredDate,
        preferred_time: input.preferred_time,
        created_at: bookingRequest.createdAt,
      },
    };

    if (idempotencyKey) storeIdempotentResponse(idempotencyKey, req.body, 201, responseBody);
    res.status(201).json(responseBody);
  } catch (err) {
    next(err);
  }
});

/** GET /booking-requests/lookup — public — API_DOCUMENTATION.md §8.2 */
bookingRequestsRouter.get('/lookup', async (req, res, next) => {
  try {
    const input = parseOrThrow(bookingRequestLookupSchema, {
      reference: req.query.reference,
      phone_number: req.query.phone_number,
    });

    const bookingRequest = await prisma.bookingRequest.findFirst({
      where: { requestReference: input.reference, customer: { phoneNumber: input.phone_number } },
      include: { treatment: true },
    });

    // Same 404 whether the reference doesn't exist or the phone doesn't
    // match, so a wrong guess can't be used to enumerate valid references.
    if (!bookingRequest) throw AppError.notFound('No booking request found for that reference and phone number.');

    ok(res, {
      request_reference: bookingRequest.requestReference,
      status: bookingRequest.status,
      treatment_name: bookingRequest.treatment.name,
      confirmed_date: bookingRequest.confirmedDate,
      confirmed_time: bookingRequest.confirmedTime,
    });
  } catch (err) {
    next(err);
  }
});
