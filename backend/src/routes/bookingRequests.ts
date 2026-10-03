import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ok } from '../lib/response.js';
import { AppError } from '../lib/errors.js';
import { parseOrThrow } from '../lib/validate.js';
import { bookingRequestCreateSchema, bookingRequestLookupSchema, normalizeTreatmentIds } from '../schemas/index.js';
import { getIdempotentResponse, storeIdempotentResponse } from '../lib/idempotency.js';
import { bookingCreateLimiter } from '../middleware/rateLimit.js';
import { timeStringToDate } from '../lib/time.js';
import { notifyCustomerBookingReceived, notifyStaffNewBooking } from '../lib/emailNotifications.js';
import { pushNewBooking } from '../lib/pushNotifications.js';
import { deferAfterResponse } from '../lib/deferredWork.js';

export const bookingRequestsRouter = Router();

function serializeTreatmentRef(t: {
  id: string;
  name: string;
  price: { toFixed: (n: number) => string };
  durationMinutes: number;
}) {
  return {
    id: t.id,
    name: t.name,
    price: t.price.toFixed(2),
    duration_minutes: t.durationMinutes,
  };
}

/** Join treatment names for lookup/email when a booking has multiple services. */
function treatmentNamesFromBooking(b: {
  treatment: { name: string };
  treatments?: { treatment: { name: string }; displayOrder: number }[];
}): string {
  const extras = (b.treatments ?? [])
    .slice()
    .sort((a, c) => a.displayOrder - c.displayOrder)
    .map((row) => row.treatment.name);
  if (extras.length) return extras.join(', ');
  return b.treatment.name;
}

/** POST /booking-requests, public, API_DOCUMENTATION.md §8.1 */
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
    const treatmentIds = normalizeTreatmentIds(input);

    // The treatment check and the returning-customer lookup are independent,
    // so they share one round trip to the database instead of two. Every
    // sequential query here is felt directly as time on the visitor's
    // "Sending your request" button.
    const [treatments, existingCustomer] = await Promise.all([
      prisma.treatment.findMany({ where: { id: { in: treatmentIds } } }),
      prisma.customer.findUnique({ where: { phoneNumber: input.phone_number } }),
    ]);
    if (treatments.length !== treatmentIds.length) {
      throw AppError.notFound('One or more treatments were not found.');
    }
    const byId = new Map(treatments.map((t) => [t.id, t]));
    // Preserve client order for primary + junction display_order.
    const ordered = treatmentIds.map((id) => byId.get(id)!);
    const inactive = ordered.find((t) => !t.isActive);
    if (inactive) {
      throw AppError.unprocessable(
        `Treatment "${inactive.name}" is not currently available for booking.`,
      );
    }
    const primary = ordered[0]!;

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
    // already have one, don't overwrite an existing email with a blank one.
    // The existing row was looked up above so the upsert's `update` clause is
    // always a plain, valid data object (never a conditional expression),
    // which is what Prisma's generated types actually require here.
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

    // Party size and the frozen total: every selected treatment's price,
    // added up, times the number of guests. The payment report reads
    // total_amount, so it must not drift when a price changes later.
    const numberOfPeople = input.number_of_people ?? 1;
    const totalAmount = ordered
      .slice(1)
      .reduce((sum, t) => sum.add(t.price), primary.price)
      .mul(numberOfPeople);

    // A single create with nested junction rows is already atomic in Prisma;
    // wrapping it in an interactive transaction only added BEGIN/COMMIT round
    // trips (and held the pool's one connection) for nothing.
    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        customerId: customer.id,
        treatmentId: primary.id,
        preferredDate,
        preferredTime: timeStringToDate(input.preferred_time),
        channel: input.channel ?? 'website',
        numberOfPeople,
        totalAmount,
        // Frozen per-booking origin marker. A source here (the public site
        // always sends "website") => PixelSpring; absent => staff-entered
        // in the dashboard. Drives the PX-/DV- reference prefix (DB trigger)
        // and the payment report split.
        source: input.source ?? null,
        treatments: {
          create: ordered.map((t, i) => ({
            treatmentId: t.id,
            displayOrder: i,
          })),
        },
        // One trackable row per service (sql/009): name and price are
        // frozen here, status starts 'pending' and staff resolve each one.
        bookedServices: {
          create: ordered.map((t, i) => ({
            treatmentId: t.id,
            serviceName: t.name,
            price: t.price,
            displayOrder: i,
          })),
        },
      },
      include: {
        customer: true,
        treatment: true,
        treatments: { include: { treatment: true }, orderBy: { displayOrder: 'asc' } },
      },
    });

    const treatmentList = bookingRequest.treatments.map((row) =>
      serializeTreatmentRef(row.treatment),
    );

    const responseBody = {
      success: true,
      data: {
        id: bookingRequest.id,
        request_reference: bookingRequest.requestReference,
        status: bookingRequest.status,
        treatment: serializeTreatmentRef(primary),
        treatments: treatmentList,
        preferred_date: bookingRequest.preferredDate,
        preferred_time: input.preferred_time,
        number_of_people: bookingRequest.numberOfPeople,
        total_amount: bookingRequest.totalAmount?.toFixed(2) ?? null,
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
    // Same moment, the other channel: staff phones buzz even when nobody
    // has the dashboard open (lib/pushNotifications.ts).
    deferAfterResponse(pushNewBooking(bookingRequest), 'pushNewBooking');
  } catch (err) {
    next(err);
  }
});

/** GET /booking-requests/lookup, public, API_DOCUMENTATION.md §8.2 */
bookingRequestsRouter.get('/lookup', async (req, res, next) => {
  try {
    const input = parseOrThrow(bookingRequestLookupSchema, {
      reference: req.query.reference,
      phone_number: req.query.phone_number,
    });

    const bookingRequest = await prisma.bookingRequest.findFirst({
      where: { requestReference: input.reference, customer: { phoneNumber: input.phone_number } },
      include: {
        treatment: true,
        treatments: { include: { treatment: true }, orderBy: { displayOrder: 'asc' } },
      },
    });

    // Same 404 whether the reference doesn't exist or the phone doesn't
    // match, so a wrong guess can't be used to enumerate valid references.
    if (!bookingRequest) throw AppError.notFound('No booking request found for that reference and phone number.');

    ok(res, {
      request_reference: bookingRequest.requestReference,
      status: bookingRequest.status,
      treatment_name: treatmentNamesFromBooking(bookingRequest),
      treatments: bookingRequest.treatments.map((row) => serializeTreatmentRef(row.treatment)),
      confirmed_date: bookingRequest.confirmedDate,
      confirmed_time: bookingRequest.confirmedTime,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /booking-requests/:id/confirmation, public, no auth.
 *
 * Backs the QR code printed on the "Download PDF" confirmation for
 * completed bookings, scanning it opens a lightweight, read-only
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
      include: {
        customer: true,
        treatment: { include: { category: true } },
        treatments: { include: { treatment: true }, orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!bookingRequest || bookingRequest.status !== 'completed') {
      throw AppError.notFound('No completed booking confirmation found for that reference.');
    }

    const allTreatments = bookingRequest.treatments.length
      ? bookingRequest.treatments.map((row) => row.treatment)
      : [bookingRequest.treatment];
    const totalDuration = allTreatments.reduce((sum, t) => sum + t.durationMinutes, 0);

    ok(res, {
      id: bookingRequest.id,
      request_reference: bookingRequest.requestReference,
      status: bookingRequest.status,
      customer_name: bookingRequest.customer.fullName,
      treatment_name: treatmentNamesFromBooking(bookingRequest),
      treatments: allTreatments.map((t) => ({
        id: t.id,
        name: t.name,
        duration_minutes: t.durationMinutes,
      })),
      category_name: bookingRequest.treatment.category?.name ?? null,
      duration_minutes: totalDuration,
      confirmed_date: bookingRequest.confirmedDate,
      confirmed_time: bookingRequest.confirmedTime,
      completed_at: bookingRequest.completedAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /booking-requests/easy-lookup, public, a laxer variant of /lookup.
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
      include: {
        treatment: true,
        treatments: { include: { treatment: true }, orderBy: { displayOrder: 'asc' } },
      },
    });

    // Same 404 whether the reference doesn't exist or the phone doesn't
    // match, so a wrong guess can't be used to enumerate valid references.
    if (!bookingRequest) throw AppError.notFound('No booking request found for that reference and phone number.');

    ok(res, {
      request_reference: bookingRequest.requestReference,
      status: bookingRequest.status,
      treatment_name: treatmentNamesFromBooking(bookingRequest),
      treatments: bookingRequest.treatments.map((row) => serializeTreatmentRef(row.treatment)),
      confirmed_date: bookingRequest.confirmedDate,
      confirmed_time: bookingRequest.confirmedTime,
    });
  } catch (err) {
    next(err);
  }
});
