import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ok } from '../../lib/response.js';
import { parseOrThrow } from '../../lib/validate.js';
import { AppError } from '../../lib/errors.js';
import { notifyStaff, pushConfigured, vapidPublicKey } from '../../lib/push.js';
import { logger } from '../../lib/logger.js';

export const adminPushRouter = Router();

/**
 * /admin/push/*: turning phone notifications on and off for one device.
 *
 * Mounted under requireAuth, so every handler knows which staff member is
 * asking (req.staff). A subscription belongs to the person who registered
 * it and to the device it came from; nobody can read or delete anyone
 * else's.
 */

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

/** GET /admin/push/key: what the browser needs before it can subscribe. */
adminPushRouter.get('/key', (_req, res) => {
  ok(res, { enabled: pushConfigured(), public_key: vapidPublicKey() });
});

/** GET /admin/push/devices: this staff member's registered devices. */
adminPushRouter.get('/devices', async (req, res, next) => {
  try {
    const rows = await prisma.pushSubscription.findMany({
      where: { staffId: req.staff!.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, createdAt: true, lastUsedAt: true, endpoint: true },
    });
    ok(
      res,
      rows.map((r) => ({
        id: r.id,
        device: r.userAgent,
        created_at: r.createdAt,
        last_used_at: r.lastUsedAt,
        // The endpoint is the address; only enough of it to tell two
        // devices apart is ever sent back.
        endpoint_tail: r.endpoint.slice(-12),
      })),
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/push/subscribe: register this device.
 *
 * Idempotent on the endpoint, which is what a browser hands back if the
 * same device subscribes again. Re-subscribing after a permission reset
 * gives a new endpoint, so the old row is left to be cleaned up on the
 * first failed delivery.
 */
adminPushRouter.post('/subscribe', async (req, res, next) => {
  try {
    if (!pushConfigured()) {
      throw AppError.unprocessable(
        'Phone notifications are not configured on the server (VAPID keys are missing).',
      );
    }
    const input = parseOrThrow(subscribeSchema, req.body);
    const userAgent = (req.get('user-agent') ?? '').slice(0, 255) || null;

    const row = await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        staffId: req.staff!.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
      },
      create: {
        staffId: req.staff!.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
      },
      select: { id: true, createdAt: true },
    });

    logger.info({ staffId: req.staff!.id, subscriptionId: row.id }, 'Push subscription registered.');
    ok(res, { id: row.id, created_at: row.createdAt }, 201);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/push/unsubscribe: stop notifications on this device.
 * Takes the endpoint the browser is holding; only rows owned by the
 * signed-in staff member are removed.
 */
adminPushRouter.post('/unsubscribe', async (req, res, next) => {
  try {
    const input = parseOrThrow(z.object({ endpoint: z.string().url().max(2000) }), req.body);
    const { count } = await prisma.pushSubscription.deleteMany({
      where: { endpoint: input.endpoint, staffId: req.staff!.id },
    });
    ok(res, { removed: count });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/push/test: send one to this staff member's own devices. */
adminPushRouter.post('/test', async (req, res, next) => {
  try {
    const sent = await notifyStaff(req.staff!.id, {
      title: 'Notifications are on',
      body: "This is how a new booking will reach you. You can close this.",
      url: '/dashboard',
      tag: 'dvine-test',
    });
    ok(res, { sent });
  } catch (err) {
    next(err);
  }
});
