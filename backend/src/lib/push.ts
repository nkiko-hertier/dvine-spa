/**
 * push.ts: notifications that reach a staff member's phone.
 *
 * Web Push, the same mechanism a native app uses on Android and (since
 * iOS 16.4) on an iPhone where the dashboard has been added to the Home
 * Screen. The flow:
 *
 *   1. The dashboard asks the browser for permission and gets back a
 *      subscription: an endpoint URL at the browser vendor's push service
 *      plus two keys. It posts that to /admin/push/subscribe.
 *   2. We store it against the staff row (sql/007).
 *   3. When something needs attention we encrypt a small JSON payload
 *      against those keys, sign it with the VAPID private key, and POST it
 *      to the endpoint. The push service wakes the phone and hands it to
 *      the service worker (frontend/public/sw.js), which shows it.
 *
 * Nothing here can reach a device that has not opted in: the endpoint is
 * handed out by the browser, never guessed.
 *
 * Without VAPID keys in the environment every function here is a no-op
 * that logs once, exactly like the email layer without a provider, so a
 * deployment that has not configured push still runs normally.
 */
import webpush, { WebPushError } from 'web-push';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export type PushPayload = {
  /** Bold line on the notification. */
  title: string;
  /** The line under it. */
  body: string;
  /** Opened when the notification is tapped, a dashboard path. */
  url?: string;
  /** Collapses older notifications of the same kind on the device. */
  tag?: string;
  /** Marks it urgent enough to make a sound/vibrate on some platforms. */
  urgent?: boolean;
};

let configured: boolean | null = null;

/** True when VAPID keys are set, so there is somewhere to send from. */
export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const ok = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (ok) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  } else {
    logger.warn(
      'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set. Phone notifications are off; the dashboard still shows the bell. Generate a pair with `npx web-push generate-vapid-keys`.',
    );
  }
  configured = ok;
  return ok;
}

/** The public key the dashboard needs to subscribe a device. */
export function vapidPublicKey(): string | null {
  return pushConfigured() ? env.VAPID_PUBLIC_KEY! : null;
}

type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Sends one payload to a set of devices. A device whose endpoint the push
 * service reports as gone (404/410: notifications turned off, app
 * uninstalled, browser data cleared) is deleted, so the table stays a list
 * of devices that actually exist. Never throws: a notification that cannot
 * be delivered must not fail the booking that triggered it.
 */
async function sendToSubscriptions(subs: Subscription[], payload: PushPayload): Promise<number> {
  if (!subs.length) return 0;
  const body = JSON.stringify(payload);
  const options = {
    TTL: 60 * 60 * 12, // keep it for half a day if the phone is off
    urgency: payload.urgent ? ('high' as const) : ('normal' as const),
  };

  let delivered = 0;
  const gone: string[] = [];
  const used: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          options,
        );
        delivered += 1;
        used.push(s.id);
      } catch (err) {
        const status = err instanceof WebPushError ? err.statusCode : undefined;
        if (status === 404 || status === 410) {
          gone.push(s.id);
          return;
        }
        logger.error({ err, status, subscriptionId: s.id }, 'Push delivery failed.');
      }
    }),
  );

  if (gone.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } }).catch(() => undefined);
    logger.info({ count: gone.length }, 'Removed push subscriptions the push service no longer knows.');
  }
  if (used.length) {
    await prisma.pushSubscription
      .updateMany({ where: { id: { in: used } }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
  return delivered;
}

/** Every device belonging to an active staff member. */
export async function notifyAllStaff(payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { staff: { isActive: true } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    return await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err }, 'notifyAllStaff failed.');
    return 0;
  }
}

/** Every device belonging to one staff member (a test, or something personal). */
export async function notifyStaff(staffId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { staffId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    return await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err, staffId }, 'notifyStaff failed.');
    return 0;
  }
}

/** Every device belonging to an active administrator. */
export async function notifyAdmins(payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { staff: { isActive: true, role: 'admin' } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    return await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err }, 'notifyAdmins failed.');
    return 0;
  }
}
