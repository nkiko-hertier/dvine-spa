import { Router } from 'express';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { pushTodaySummary, pushUnansweredReminder } from '../../lib/pushNotifications.js';
import { logger } from '../../lib/logger.js';

export const cronRouter = Router();

/** A request unanswered for this long is worth a second notification. */
const UNANSWERED_AFTER_HOURS = 2;

/**
 * /internal/cron/*: the scheduled sweeps, called by Vercel Cron (see
 * backend/vercel.json) and by nothing else. Guarded by a shared secret in
 * the Authorization header: without CRON_SECRET set, every call is
 * refused, so the endpoint cannot be used to spam devices.
 */
cronRouter.use((req, _res, next) => {
  const expected = env.CRON_SECRET;
  if (!expected) {
    next(AppError.notFound('No route matches this path.'));
    return;
  }
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (token !== expected) {
    next(AppError.unauthorized('Invalid cron secret.'));
    return;
  }
  next();
});

/**
 * GET /internal/cron/attention: the sweep that catches what a person
 * would otherwise have to remember.
 *
 * Runs a few times a day (see the schedule in vercel.json):
 *   - any request still in new_request after UNANSWERED_AFTER_HOURS gets
 *     one reminder for the whole pile, not one per booking;
 *   - the first run of the morning also sends the day's shape.
 *
 * Idempotent in effect: the notifications carry a tag, so a phone that
 * gets two of them shows one.
 */
cronRouter.get('/attention', async (req, res, next) => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - UNANSWERED_AFTER_HOURS * 60 * 60 * 1000);

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [unanswered, oldest, todayConfirmed, todayPending] = await Promise.all([
      prisma.bookingRequest.count({
        where: { status: BookingStatus.new_request, createdAt: { lt: cutoff } },
      }),
      prisma.bookingRequest.findFirst({
        where: { status: BookingStatus.new_request, createdAt: { lt: cutoff } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      prisma.bookingRequest.count({
        where: {
          status: BookingStatus.confirmed,
          confirmedDate: { gte: startOfDay, lt: endOfDay },
        },
      }),
      prisma.bookingRequest.count({ where: { status: BookingStatus.new_request } }),
    ]);

    let remindersSent = 0;
    if (unanswered > 0 && oldest) {
      const hours = Math.max(
        UNANSWERED_AFTER_HOURS,
        Math.floor((now.getTime() - oldest.createdAt.getTime()) / (60 * 60 * 1000)),
      );
      remindersSent = await pushUnansweredReminder(unanswered, hours);
    }

    // `?summary=1` is what the morning schedule calls; the other runs skip it.
    let summarySent = 0;
    if (req.query.summary === '1') {
      summarySent = await pushTodaySummary(todayConfirmed, todayPending);
    }

    logger.info(
      { unanswered, todayConfirmed, todayPending, remindersSent, summarySent },
      'Attention sweep ran.',
    );
    ok(res, {
      unanswered,
      today_confirmed: todayConfirmed,
      today_pending: todayPending,
      reminders_sent: remindersSent,
      summary_sent: summarySent,
    });
  } catch (err) {
    next(err);
  }
});
