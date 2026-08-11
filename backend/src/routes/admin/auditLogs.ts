import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { asString, parseDate } from '../../lib/queryParams.js';
import { serializeAuditLog } from '../../lib/serializers.js';

export const adminAuditLogsRouter = Router();

/**
 * GET /admin/audit-logs — §10. Read-only: rows are written exclusively by
 * the log_booking_status_change DB trigger, never by this API.
 */
adminAuditLogsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const bookingRequestId = asString(req.query.booking_request_id);
    const userId = asString(req.query.user_id);
    const action = asString(req.query.action);
    const dateFrom = parseDate(req.query.date_from);
    const dateTo = parseDate(req.query.date_to);

    const where: Prisma.AuditLogWhereInput = {
      ...(bookingRequestId ? { bookingRequestId } : {}),
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(dateFrom || dateTo
        ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.auditLog.count({ where }),
    ]);

    okList(res, logs.map(serializeAuditLog), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
});
