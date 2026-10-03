import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asArray, asString, parseDate, parseSort } from '../../lib/queryParams.js';
import {
  bookingRequestUpdateSchema,
  customerSourceSchema,
  bookingStatusSchema,
  clientTypeSchema,
  bookingOriginSchema,
  bookedServiceUpdateSchema,
} from '../../schemas/index.js';
import { assertValidTransition } from '../../lib/bookingStatusMachine.js';
import { timeStringToDate } from '../../lib/time.js';
import { serializeAuditLog } from '../../lib/serializers.js';
import { notifyCustomerStatusChange } from '../../lib/emailNotifications.js';
import { deferAfterResponse } from '../../lib/deferredWork.js';
import {
  bookedServicesInclude,
  serializeBookedService,
  summarizeBookedServices,
  assertServicesAllowCompletion,
} from '../../lib/bookedServices.js';

export const adminBookingRequestsRouter = Router();

const SORT_FIELDS = ['createdAt', 'preferredDate', 'status'] as const;

/** Everything serializeBookingRequest needs, shared by every endpoint here. */
const bookingInclude = {
  customer: { include: { _count: { select: { bookingRequests: true } } } },
  treatment: { include: { category: true } },
  treatments: { include: { treatment: true }, orderBy: { displayOrder: 'asc' as const } },
  ...bookedServicesInclude,
} satisfies Prisma.BookingRequestInclude;

/** GET /admin/booking-requests, API_DOCUMENTATION.md §8.3 */
adminBookingRequestsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const statuses = asArray(req.query.status).map((s) => parseOrThrow(bookingStatusSchema, s));
    const treatmentId = asString(req.query.treatment_id);
    const categoryId = asString(req.query.category_id);
    const customerId = asString(req.query.customer_id);
    const channelRaw = asString(req.query.channel);
    const channel = channelRaw ? parseOrThrow(customerSourceSchema, channelRaw) : undefined;
    const clientTypeRaw = asString(req.query.client_type);
    const clientType = clientTypeRaw ? parseOrThrow(clientTypeSchema, clientTypeRaw) : undefined;
    const originRaw = asString(req.query.origin);
    const origin = originRaw ? parseOrThrow(bookingOriginSchema, originRaw) : undefined;
    const dateFrom = parseDate(req.query.date_from);
    const dateTo = parseDate(req.query.date_to);
    const createdFrom = parseDate(req.query.created_from);
    const createdTo = parseDate(req.query.created_to);
    const search = asString(req.query.search);
    const sortRaw = asString(req.query.sort) ?? '-createdAt';
    const orderBy = parseSort(sortRaw, SORT_FIELDS, 'createdAt', 'desc');

    // "New" vs "repeating" client filter, this used to be applied entirely
    // client-side (re-filtering whatever page of results happened to be
    // loaded), which broke pagination totals. Resolve it here instead by
    // first finding which customers qualify (via the same customer_summary
    // total_requests > 1 definition the Clients page uses), then filtering
    // booking requests by that customer id set.
    let clientTypeCustomerIds: string[] | undefined;
    if (clientType) {
      const matches = await prisma.customerSummary.findMany({
        where: clientType === 'repeating' ? { totalRequests: { gt: 1 } } : { totalRequests: { lte: 1 } },
        select: { id: true },
      });
      clientTypeCustomerIds = matches.map((m) => m.id);
    }

    const where: Prisma.BookingRequestWhereInput = {
      ...(statuses.length ? { status: { in: statuses } } : {}),
      ...(treatmentId ? { treatmentId } : {}),
      ...(categoryId ? { treatment: { categoryId } } : {}),
      // customerId (exact match) takes precedence if both are somehow passed.
      ...(customerId ? { customerId } : clientTypeCustomerIds ? { customerId: { in: clientTypeCustomerIds } } : {}),
      ...(channel ? { channel } : {}),
      // Origin: "from us" = the booking has no acquisition source (staff
      // keyed it into the dashboard); "from PixelSpring" = a source is set,
      // so it came through the public booking site. Frozen per-booking on
      // booking_requests.source at creation time.
      ...(origin
        ? { source: origin === 'from_us' ? null : { not: null } }
        : {}),
      ...(dateFrom || dateTo
        ? { preferredDate: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
        : {}),
      ...(createdFrom || createdTo
        ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lte: createdTo } : {}) } }
        : {}),
      ...(search
        ? {
            OR: [
              { requestReference: { contains: search, mode: 'insensitive' } },
              { customer: { fullName: { contains: search, mode: 'insensitive' } } },
              { customer: { phoneNumber: { contains: search } } },
            ],
          }
        : {}),
    };

    const [bookingRequests, total] = await Promise.all([
      prisma.bookingRequest.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: bookingInclude,
      }),
      prisma.bookingRequest.count({ where }),
    ]);

    okList(
      res,
      bookingRequests.map(serializeBookingRequest),
      buildPaginationMeta(page, limit, total),
    );
  } catch (err) {
    next(err);
  }
});

/** GET /admin/booking-requests/:id, full detail + last 10 audit_logs entries */
adminBookingRequestsRouter.get('/:id', async (req, res, next) => {
  try {
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: req.params.id },
      include: bookingInclude,
    });
    if (!bookingRequest) throw AppError.notFound('Booking request not found.');

    const auditTrail = await prisma.auditLog.findMany({
      where: { bookingRequestId: bookingRequest.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    ok(res, { ...serializeBookingRequest(bookingRequest), audit_trail: auditTrail.map(serializeAuditLog) });
  } catch (err) {
    next(err);
  }
});

/** PATCH /admin/booking-requests/:id, enforces the status state machine (§8.5) */
adminBookingRequestsRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(bookingRequestUpdateSchema, req.body);
    const existing = await prisma.bookingRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Booking request not found.');

    if (input.status) {
      assertValidTransition(existing.status, input.status as BookingStatus);
    }
    // Completing needs every service served or cancelled (sql/009).
    if (input.status === 'completed' && existing.status !== 'completed') {
      await assertServicesAllowCompletion(existing.id);
    }

    // Timestamps (contacted_at, confirmed_at, etc.) and the audit_logs row
    // are set automatically by DB triggers (set_booking_timestamps,
    // log_booking_status_change), we never set them here.
    const updateBooking = prisma.bookingRequest.update({
      where: { id: existing.id },
      data: {
        ...(input.status ? { status: input.status as BookingStatus } : {}),
        ...(input.confirmed_date ? { confirmedDate: new Date(input.confirmed_date) } : {}),
        ...(input.confirmed_time ? { confirmedTime: timeStringToDate(input.confirmed_time) } : {}),
        ...(input.staff_notes !== undefined ? { staffNotes: input.staff_notes } : {}),
        ...(input.cancellation_reason !== undefined ? { cancellationReason: input.cancellation_reason } : {}),
      },
      include: bookingInclude,
    });

    // A cancelled / no-show booking can no longer be served, so its still
    // pending services are cancelled with it (done ones stay done). Same
    // transaction, and listed first so the booking returned below already
    // reflects it.
    const closesBooking =
      (input.status === 'cancelled' || input.status === 'no_show') && existing.status !== input.status;
    const bookingRequest = closesBooking
      ? (
          await prisma.$transaction([
            prisma.bookedService.updateMany({
              where: { bookingId: existing.id, status: 'pending' },
              data: { status: 'cancelled', resolvedAt: new Date() },
            }),
            updateBooking,
          ])
        )[1]
      : await updateBooking;

    ok(res, serializeBookingRequest(bookingRequest));

    // Status-change email after the response is already sent (waitUntil on Vercel).
    if (input.status) {
      deferAfterResponse(
        notifyCustomerStatusChange(bookingRequest, input.status),
        'notifyCustomerStatusChange',
      );
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/booking-requests/:id/services/:serviceId
 * Marks one service pending / done / cancelled.
 *
 * Only while the booking is confirmed (that is when services are actually
 * served). When the last pending service is resolved and at least one was
 * served, the booking is completed automatically; if every service was
 * cancelled it is left for staff to cancel instead. The response carries
 * `booking_auto_completed` so the dashboard can say so.
 */
adminBookingRequestsRouter.patch('/:id/services/:serviceId', async (req, res, next) => {
  try {
    const input = parseOrThrow(bookedServiceUpdateSchema, req.body);
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, bookedServices: { select: { id: true } } },
    });
    if (!booking) throw AppError.notFound('Booking request not found.');
    if (!booking.bookedServices.some((s) => s.id === req.params.serviceId)) {
      throw AppError.notFound('Service not found on this booking.');
    }
    if (booking.status !== 'confirmed') {
      throw AppError.conflict(
        booking.status === 'new_request' || booking.status === 'contacted'
          ? 'Confirm the booking before marking its services.'
          : `This booking is ${booking.status.replace('_', ' ')}, so its services can no longer be changed.`,
      );
    }

    await prisma.bookedService.update({
      where: { id: req.params.serviceId },
      data: { status: input.status, resolvedAt: input.status === 'pending' ? null : new Date() },
    });

    // Auto-complete once nothing is pending and at least one was served.
    const rows = await prisma.bookedService.findMany({
      where: { bookingId: booking.id },
      select: { status: true },
    });
    const summary = summarizeBookedServices(rows);
    let autoCompleted = false;
    if (summary.pending === 0 && summary.done > 0) {
      // Guarded on status so two quick taps cannot complete (or email) twice.
      const { count } = await prisma.bookingRequest.updateMany({
        where: { id: booking.id, status: 'confirmed' },
        data: { status: 'completed' },
      });
      autoCompleted = count === 1;
    }

    const bookingRequest = await prisma.bookingRequest.findUniqueOrThrow({
      where: { id: booking.id },
      include: bookingInclude,
    });
    ok(res, { ...serializeBookingRequest(bookingRequest), booking_auto_completed: autoCompleted });

    if (autoCompleted) {
      deferAfterResponse(notifyCustomerStatusChange(bookingRequest, 'completed'), 'notifyCustomerStatusChange');
    }
  } catch (err) {
    next(err);
  }
});

type BookingRequestWithRelations = Prisma.BookingRequestGetPayload<{ include: typeof bookingInclude }>;

function serializeBookingRequest(b: BookingRequestWithRelations) {
  const totalRequests = b.customer._count.bookingRequests;
  const treatmentList = (b.treatments ?? []).map((row) => ({
    id: row.treatment.id,
    name: row.treatment.name,
    price: row.treatment.price.toFixed(2),
    duration_minutes: row.treatment.durationMinutes,
  }));
  return {
    id: b.id,
    request_reference: b.requestReference,
    status: b.status,
    customer: {
      id: b.customer.id,
      full_name: b.customer.fullName,
      phone_number: b.customer.phoneNumber,
      whatsapp_number: b.customer.whatsappNumber,
      email: b.customer.email,
      // Same "repeating = more than one request on file" definition used
      // by the Clients page and the client_type query filter above.
      total_requests: totalRequests,
      client_type: totalRequests > 1 ? 'repeating' : 'new',
    },
    treatment: {
      id: b.treatment.id,
      name: b.treatment.name,
      price: b.treatment.price.toFixed(2),
      duration_minutes: b.treatment.durationMinutes,
      category_name: b.treatment.category?.name ?? null,
    },
    treatments: treatmentList.length
      ? treatmentList
      : [
          {
            id: b.treatment.id,
            name: b.treatment.name,
            price: b.treatment.price.toFixed(2),
            duration_minutes: b.treatment.durationMinutes,
          },
        ],
    preferred_date: b.preferredDate,
    preferred_time: b.preferredTime,
    confirmed_date: b.confirmedDate,
    confirmed_time: b.confirmedTime,
    channel: b.channel,
    number_of_people: b.numberOfPeople,
    total_amount: b.totalAmount?.toFixed(2) ?? null,
    // Frozen per-booking origin, see the `origin` list filter above.
    origin: b.source ? ('from_pixelspring' as const) : ('from_us' as const),
    staff_notes: b.staffNotes,
    cancellation_reason: b.cancellationReason,
    created_at: b.createdAt,
    // Per-service tracking (sql/009). Empty only for a booking that has no
    // rows to track; the dashboard then shows the plain `treatments` list.
    booked_services: (b.bookedServices ?? []).map(serializeBookedService),
    services_summary: summarizeBookedServices(b.bookedServices ?? []),
  };
}
