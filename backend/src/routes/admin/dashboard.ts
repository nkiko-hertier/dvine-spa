import { Router } from 'express';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/response.js';
import { parseDate } from '../../lib/queryParams.js';
import { serializeDailySummary } from '../../lib/serializers.js';

export const adminDashboardRouter = Router();

/** GET /admin/dashboard/summary — backed by daily_requests_summary — API_DOCUMENTATION.md §11 */
adminDashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = parseDate(req.query.date_from) ?? thirtyDaysAgo;
    const dateTo = parseDate(req.query.date_to) ?? new Date();

    const summary = await prisma.dailyRequestsSummary.findMany({
      where: { requestDate: { gte: dateFrom, lte: dateTo } },
      orderBy: { requestDate: 'desc' },
    });

    ok(res, summary.map(serializeDailySummary));
  } catch (err) {
    next(err);
  }
});

/** GET /admin/dashboard/stats — point-in-time KPIs — API_DOCUMENTATION.md §11 */
adminDashboardRouter.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      pendingRequests,
      todaysBookings,
      thisWeekConfirmed,
      thisMonthCompleted,
      newCustomers30d,
      topTreatmentRows,
    ] = await Promise.all([
      prisma.bookingRequest.count({ where: { status: BookingStatus.new_request } }),
      prisma.bookingRequest.count({ where: { preferredDate: { gte: startOfToday, lt: endOfToday } } }),
      prisma.bookingRequest.count({ where: { status: BookingStatus.confirmed, confirmedAt: { gte: startOfWeek } } }),
      prisma.bookingRequest.count({ where: { status: BookingStatus.completed, completedAt: { gte: startOfMonth } } }),
      prisma.customer.count({ where: { customerSince: { gte: thirtyDaysAgo } } }),
      prisma.bookingRequest.groupBy({
        by: ['treatmentId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { treatmentId: true },
        orderBy: { _count: { treatmentId: 'desc' } },
        take: 1,
      }),
    ]);

    let topTreatment = null;
    const topRow = topTreatmentRows[0];
    if (topRow) {
      const treatment = await prisma.treatment.findUnique({ where: { id: topRow.treatmentId } });
      if (treatment) {
        topTreatment = { id: treatment.id, name: treatment.name, bookings: topRow._count.treatmentId };
      }
    }

    ok(res, {
      pending_requests: pendingRequests,
      todays_bookings: todaysBookings,
      this_week_confirmed: thisWeekConfirmed,
      this_month_completed: thisMonthCompleted,
      top_treatment_30d: topTreatment,
      new_customers_30d: newCustomers30d,
    });
  } catch (err) {
    next(err);
  }
});
