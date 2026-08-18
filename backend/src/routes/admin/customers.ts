import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asString, parseSort } from '../../lib/queryParams.js';
import { customerUpdateSchema, customerSourceSchema } from '../../schemas/index.js';
import { serializeCustomer, serializeCustomerSummary } from '../../lib/serializers.js';

export const adminCustomersRouter = Router();

const SORT_FIELDS = ['customerSince', 'fullName', 'lastActivity'] as const;

/** GET /admin/customers — backed by the customer_summary view — §7 */
adminCustomersRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const search = asString(req.query.search);
    const sourceRaw = asString(req.query.source);
    const source = sourceRaw ? parseOrThrow(customerSourceSchema, sourceRaw) : undefined;
    const hasPending = asString(req.query.has_pending) === 'true';
    const sortRaw = asString(req.query.sort) ?? '-customerSince';
    const orderBy = parseSort(sortRaw, SORT_FIELDS, 'customerSince', 'desc');

    const where: Prisma.CustomerSummaryWhereInput = {
      ...(search
        ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phoneNumber: { contains: search } }] }
        : {}),
      ...(source ? { source } : {}),
      ...(hasPending ? { pendingRequests: { gt: 0 } } : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customerSummary.findMany({ where, orderBy, skip: offset, take: limit }),
      prisma.customerSummary.count({ where }),
    ]);

    okList(res, customers.map(serializeCustomerSummary), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
});

/** GET /admin/customers/:id — summary + notes + recent bookings */
adminCustomersRouter.get('/:id', async (req, res, next) => {
  try {
    // Change findUnique -> findFirst
    const summary = await prisma.customerSummary.findFirst({ where: { id: req.params.id } });
    if (!summary) throw AppError.notFound('Customer not found.');

    const [customer, recentBookings] = await Promise.all([
      prisma.customer.findUnique({ where: { id: req.params.id } }),
      prisma.bookingRequest.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { treatment: true },
      }),
    ]);

    ok(res, {
      ...serializeCustomerSummary(summary),
      notes: customer?.notes ?? null,
      recent_bookings: recentBookings.map((b) => ({
        id: b.id,
        request_reference: b.requestReference,
        treatment_name: b.treatment.name,
        preferred_date: b.preferredDate,
        status: b.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/customers/:id — phoneNumber intentionally not editable here;
 * it's the dedupe key (§7). A future /merge endpoint would handle that.
 */
adminCustomersRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(customerUpdateSchema, req.body);
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Customer not found.');

    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
        ...(input.whatsapp_number !== undefined ? { whatsappNumber: input.whatsapp_number } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    ok(res, serializeCustomer(customer));
  } catch (err) {
    next(err);
  }
});
