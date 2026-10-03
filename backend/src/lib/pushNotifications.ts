import webpush from 'web-push';
import type { BookingRequest, Customer, Treatment } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

type BookingWithRelations = BookingRequest & {
  customer: Customer;
  treatment: Treatment;
};

const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? `mailto:${env.GMAIL_USER ?? 'admin@example.com'}`,
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string,
  );
}

/**
 * Send a web-push message to every device a staff member has subscribed.
 * Subscriptions the push service reports as gone (404/410) are deleted.
 * Never throws; a missing VAPID config makes this a no-op.
 */
async function pushToAllStaff(payload: Record<string, unknown>): Promise<void> {
  if (!pushEnabled) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { staff: { isActive: true } },
  });
  if (!subs.length) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        } else {
          logger.warn({ err, subscriptionId: sub.id }, 'Push delivery failed.');
        }
      }
    }),
  );
}

/** Staff alert for a new booking request, the push counterpart of the staff email. */
export async function pushNewBooking(booking: BookingWithRelations): Promise<void> {
  try {
    await pushToAllStaff({
      title: 'New booking request',
      body: `${booking.customer.fullName} · ${booking.treatment.name}`,
      url: `${env.DASHBOARD_URL}/bookings/${booking.id}`,
      tag: `booking-${booking.id}`,
    });
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, 'pushNewBooking failed');
  }
}
