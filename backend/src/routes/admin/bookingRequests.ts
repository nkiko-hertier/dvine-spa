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
} from '../../schemas/index.js';
import { assertValidTransition } from '../../lib/bookingStatusMachine.js';
import { timeStringToDate } from '../../lib/time.js';
import { serializeAuditLog } from '../../lib/serializers.js';
import { notifyCustomerStatusChange } from '../../lib/emailNotifications.js';
import { logger } from '../../lib/logger.js';

export const adminBookingRequestsRouter = Router();

const SORT_FIELDS = ['createdAt', 'preferredDate', 'status'] as const;

/** GET /admin/booking-requests — API_DOCUMENTATION.md §8.3 */
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
    const dateFrom = parseDate(req.query.date_from);
    const dateTo = parseDate(req.query.date_to);
    const createdFrom = parseDate(req.query.created_from);
    const createdTo = parseDate(req.query.created_to);
    const search = asString(req.query.search);
    const sortRaw = asString(req.query.sort) ?? '-createdAt';
    const orderBy = parseSort(sortRaw, SORT_FIELDS, 'createdAt', 'desc');

    // "New" vs "repeating" client filter — this used to be applied entirely
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
        include: {
          customer: { include: { _count: { select: { bookingRequests: true } } } },
          treatment: { include: { category: true } },
        },
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

/** GET /admin/booking-requests/:id — full detail + last 10 audit_logs entries */
adminBookingRequestsRouter.get('/:id', async (req, res, next) => {
  try {
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { include: { _count: { select: { bookingRequests: true } } } },
        treatment: { include: { category: true } },
      },
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

/** PATCH /admin/booking-requests/:id — enforces the status state machine (§8.5) */
adminBookingRequestsRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(bookingRequestUpdateSchema, req.body);
    const existing = await prisma.bookingRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Booking request not found.');

    if (input.status) {
      assertValidTransition(existing.status, input.status as BookingStatus);
    }

    // Timestamps (contacted_at, confirmed_at, etc.) and the audit_logs row
    // are set automatically by DB triggers (set_booking_timestamps,
    // log_booking_status_change) — we never set them here.
    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: existing.id },
      data: {
        ...(input.status ? { status: input.status as BookingStatus } : {}),
        ...(input.confirmed_date ? { confirmedDate: new Date(input.confirmed_date) } : {}),
        ...(input.confirmed_time ? { confirmedTime: timeStringToDate(input.confirmed_time) } : {}),
        ...(input.staff_notes !== undefined ? { staffNotes: input.staff_notes } : {}),
        ...(input.cancellation_reason !== undefined ? { cancellationReason: input.cancellation_reason } : {}),
      },
      include: {
        customer: { include: { _count: { select: { bookingRequests: true } } } },
        treatment: { include: { category: true } },
      },
    });

    ok(res, serializeBookingRequest(bookingRequest));

    // Fire-and-forget status-change email after the response is already sent.
    if (input.status) {
      void notifyCustomerStatusChange(bookingRequest, input.status).catch((err) =>
        logger.error({ err }, 'notifyCustomerStatusChange threw unexpectedly'),
      );
    }
  } catch (err) {
    next(err);
  }
});

type BookingRequestWithRelations = Prisma.BookingRequestGetPayload<{
  include: {
    customer: { include: { _count: { select: { bookingRequests: true } } } };
    treatment: { include: { category: true } };
  };
}>;

function serializeBookingRequest(b: BookingRequestWithRelations) {
  const totalRequests = b.customer._count.bookingRequests;
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
    preferred_date: b.preferredDate,
    preferred_time: b.preferredTime,
    confirmed_date: b.confirmedDate,
    confirmed_time: b.confirmedTime,
    channel: b.channel,
    staff_notes: b.staffNotes,
    cancellation_reason: b.cancellationReason,
    created_at: b.createdAt,
  };
}
