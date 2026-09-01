import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/response.js';
import { AppError } from '../lib/errors.js';
import { parseOrThrow } from '../lib/validate.js';
import { bookingRequestCreateSchema, bookingRequestLookupSchema } from '../schemas/index.js';
import { getIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { bookingCreateLimiter } from '../middleware/rateLimit.js';
import { timeStringToDate } from '../lib/time.js';
import { notifyCustomerBookingReceived, notifyStaffNewBooking } from '../lib/emailNotifications.js';
import { deferAfterResponse } from '../lib/deferredWork.js';

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
    // booked before. On re-book, only backfill email if the customer doesn't
    // already have one — don't overwrite an existing email with a blank one.
    // The existing row is looked up first so the upsert's `update` clause is
    // always a plain, valid data object (never a conditional expression),
    // which is what Prisma's generated types actually require here.
    const existingCustomer = await prisma.customer.findUnique({
      where: { phoneNumber: input.phone_number },
    });
    const shouldBackfillEmail = Boolean(input.email && existingCustomer && !existingCustomer.email);

    const customer = await prisma.customer.upsert({
      where: { phoneNumber: input.phone_number },
      update: shouldBackfillEmail ? { email: input.email } : {},
      create: {
        fullName: input.full_name,
        phoneNumber: input.phone_number,
        whatsappNumber: input.whatsapp_number ?? input.phone_number,
        email: input.email ?? null,
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
      include: { customer: true, treatment: true },
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

    // Email notifications run after the response is sent. On Vercel,
    // deferAfterResponse hands them to waitUntil so the function isn't
    // frozen before they finish.
    deferAfterResponse(notifyCustomerBookingReceived(bookingRequest), 'notifyCustomerBookingReceived');
    deferAfterResponse(notifyStaffNewBooking(bookingRequest), 'notifyStaffNewBooking');
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

/**
 * GET /booking-requests/:id/confirmation — public, no auth.
 *
 * Backs the QR code printed on the "Download PDF" confirmation for
 * completed bookings — scanning it opens a lightweight, read-only
 * confirmation page (frontend route /booking-confirmation/:id) so a
 * client (or the front desk) can verify the booking online. Only
 * returns data for completed bookings; anything else 404s so the QR
 * only ever resolves to something once the visit is actually done.
 * The id is an unguessable UUID, so this is safe to expose without a
 * phone-number check the way /lookup requires.
 */
bookingRequestsRouter.get('/:id/confirmation', async (req, res, next) => {
  try {
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: req.params.id },
      include: { customer: true, treatment: { include: { category: true } } },
    });
    if (!bookingRequest || bookingRequest.status !== 'completed') {
      throw AppError.notFound('No completed booking confirmation found for that reference.');
    }

    ok(res, {
      id: bookingRequest.id,
      request_reference: bookingRequest.requestReference,
      status: bookingRequest.status,
      customer_name: bookingRequest.customer.fullName,
      treatment_name: bookingRequest.treatment.name,
      category_name: bookingRequest.treatment.category?.name ?? null,
      duration_minutes: bookingRequest.treatment.durationMinutes,
      confirmed_date: bookingRequest.confirmedDate,
      confirmed_time: bookingRequest.confirmedTime,
      completed_at: bookingRequest.completedAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /booking-requests/easy-lookup — public — a laxer variant of /lookup.
 * Still requires both the reference and the phone number to match the same
 * booking; this previously matched on phone number alone, which let anyone
 * who knew (or guessed) a customer's phone number pull up their most recent
 * booking status without knowing their reference code.
 */
bookingRequestsRouter.get('/easy-lookup', async (req, res, next) => {
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
