import { Router, raw } from 'express';
import { Webhook } from 'svix';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const webhookRouter = Router();

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserEventData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  public_metadata?: { role?: string; pending_full_name?: string };
}

interface ClerkSessionEventData {
  user_id: string;
}

interface ClerkEvent {
  type: string;
  data: ClerkUserEventData | ClerkSessionEventData;
}

/**
 * POST /webhooks/clerk — see API_DOCUMENTATION.md §3.
 *
 * Mounted with express.raw() so the exact bytes Clerk signed are what get
 * verified — this MUST be registered before the global express.json() in
 * app.ts, or Svix verification will fail against an already-parsed body.
 */
webhookRouter.post('/clerk', raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    if (!env.CLERK_WEBHOOK_SECRET) {
      // Fails loudly rather than silently accepting unverifiable webhooks.
      throw AppError.internal('CLERK_WEBHOOK_SECRET is not configured.');
    }

    const svixId = req.header('svix-id');
    const svixTimestamp = req.header('svix-timestamp');
    const svixSignature = req.header('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw AppError.validation('Missing Svix signature headers.');
    }

    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    let event: ClerkEvent;
    try {
      event = wh.verify(req.body as Buffer, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkEvent;
    } catch {
      throw AppError.validation('Webhook signature verification failed.');
    }

    // Idempotency: svix-id is the unique event id, deduped via the DB
    // unique constraint on (provider, event_id) — see §3.2.
    let stored;
    try {
      stored = await prisma.webhookEvent.create({
        data: { provider: 'clerk', eventId: svixId, eventType: event.type, payload: event.data as object },
      });
    } catch (createErr) {
      if (createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === 'P2002') {
        // Unique violation on (provider, event_id) = we've already processed
        // this delivery (Clerk retry). Any other error should surface.
        res.status(200).json({ success: true, data: { deduped: true } });
        return;
      }
      throw createErr;
    }

    try {
      await handleClerkEvent(event);
      await prisma.webhookEvent.update({
        where: { id: stored.id },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (handlerErr) {
      await prisma.webhookEvent.update({
        where: { id: stored.id },
        data: { status: 'failed', errorMessage: String(handlerErr) },
      });
      // Re-throw so Clerk sees a non-2xx and retries — webhook_events.status
      // stays 'failed' for monitoring per API_DOCUMENTATION.md Appendix A/§10.
      throw handlerErr;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

async function handleClerkEvent(event: ClerkEvent): Promise<void> {
  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const data = event.data as ClerkUserEventData;
      const email = data.email_addresses.find((e) => e.id === data.primary_email_address_id)?.email_address;
      if (!email) {
        logger.warn({ clerkUserId: data.id }, 'Clerk user event with no primary email — skipping staff sync.');
        return;
      }
      const fullName =
        [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
        data.public_metadata?.pending_full_name ||
        email;
      const role = data.public_metadata?.role === 'admin' ? 'admin' : 'staff';

      await prisma.staff.upsert({
        where: { clerkUserId: data.id },
        update: { email, fullName, role },
        create: { clerkUserId: data.id, email, fullName, role },
      });
      break;
    }
    case 'user.deleted': {
      const data = event.data as ClerkUserEventData;
      await prisma.staff.updateMany({ where: { clerkUserId: data.id }, data: { isActive: false } });
      break;
    }
    case 'session.created': {
      const data = event.data as ClerkSessionEventData;
      await prisma.staff.updateMany({ where: { clerkUserId: data.user_id }, data: { lastLogin: new Date() } });
      break;
    }
    default:
      // Unhandled event types are fine to no-op — Clerk sends many more
      // event types than we care about.
      break;
  }
}
