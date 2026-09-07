import { Router } from 'express';
import { BookingStatus, Prisma } from '@prisma/client';
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

/**
 * GET /admin/dashboard/payments?year=YYYY&month=M — realised revenue for one
 * calendar month, split by booking origin:
 *   - from_dvine       → booking has no source (staff keyed it into the
 *                        dashboard; reference DV-…)
 *   - from_pixelspring → booking carries a source (came through the public
 *                        booking site; reference PX-…)
 *
 * "Realised" = only bookings with status `completed`, counted in the month
 * they were completed (completed_at). Amounts come from the frozen
 * booking_requests.total_amount, so historical figures don't move when a
 * treatment is repriced.
 */
adminDashboardRouter.get('/payments', async (req, res, next) => {
  try {
    const now = new Date();
    const yearRaw = Number(req.query.year);
    const monthRaw = Number(req.query.month);
    const year = Number.isInteger(yearRaw) && yearRaw >= 2000 && yearRaw <= 2100 ? yearRaw : now.getFullYear();
    const month =
      Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;

    const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const periodEnd = new Date(year, month, 1, 0, 0, 0, 0);

    const baseWhere = {
      status: BookingStatus.completed,
      completedAt: { gte: periodStart, lt: periodEnd },
    } as const;

    const [dvine, pixelspring] = await Promise.all([
      prisma.bookingRequest.aggregate({
        where: { ...baseWhere, source: null },
        _sum: { totalAmount: true, numberOfPeople: true },
        _count: { _all: true },
      }),
      prisma.bookingRequest.aggregate({
        where: { ...baseWhere, source: { not: null } },
        _sum: { totalAmount: true, numberOfPeople: true },
        _count: { _all: true },
      }),
    ]);

    const bucket = (agg: typeof dvine) => ({
      bookings: agg._count._all,
      people: agg._sum.numberOfPeople ?? 0,
      amount: (agg._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
    });

    const dvineBucket = bucket(dvine);
    const pixelspringBucket = bucket(pixelspring);

    ok(res, {
      year,
      month,
      period_start: periodStart,
      period_end: periodEnd,
      from_dvine: dvineBucket,
      from_pixelspring: pixelspringBucket,
      total: {
        bookings: dvineBucket.bookings + pixelspringBucket.bookings,
        people: dvineBucket.people + pixelspringBucket.people,
        amount: (dvine._sum.totalAmount ?? new Prisma.Decimal(0))
          .add(pixelspring._sum.totalAmount ?? new Prisma.Decimal(0))
          .toFixed(2),
      },
    });
  } catch (err) {
    next(err);
  }
});
