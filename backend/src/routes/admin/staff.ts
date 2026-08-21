import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { clerkClient } from '@clerk/express';
import { prisma } from '../../lib/prisma.js';
import { ok, okList, parsePagination, buildPaginationMeta } from '../../lib/response.js';
import { AppError } from '../../lib/errors.js';
import { parseOrThrow } from '../../lib/validate.js';
import { asString } from '../../lib/queryParams.js';
import { staffInviteSchema, staffUpdateSchema } from '../../schemas/index.js';
import { logger } from '../../lib/logger.js';

const roleFilterSchema = z.enum(['admin', 'staff']);

export const adminStaffRouter = Router();

/** Never leak these to the client (§9). */
function serializeStaff(staff: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phoneNumber: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}) {
  return {
    id: staff.id,
    email: staff.email,
    full_name: staff.fullName,
    role: staff.role,
    phone_number: staff.phoneNumber,
    is_active: staff.isActive,
    last_login: staff.lastLogin,
    created_at: staff.createdAt,
  };
}

/** GET /admin/staff — admin only */
adminStaffRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const isActiveRaw = asString(req.query.is_active);
    const roleRaw = asString(req.query.role);
    const role = roleRaw ? parseOrThrow(roleFilterSchema, roleRaw) : undefined;

    const where: Prisma.StaffWhereInput = {
      ...(isActiveRaw !== undefined ? { isActive: isActiveRaw === 'true' } : {}),
      ...(role ? { role } : {}),
    };

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
      prisma.staff.count({ where }),
    ]);

    okList(res, staff.map(serializeStaff), buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/staff/invite — admin only. Does NOT insert into `staff`
 * directly — sends a Clerk invitation; the row is created by the
 * user.created webhook once accepted (§3.3, §9).
 */
adminStaffRouter.post('/invite', async (req, res, next) => {
  try {
    const input = parseOrThrow(staffInviteSchema, req.body);

    const existing = await prisma.staff.findUnique({ where: { email: input.email } });
    if (existing && existing.isActive) {
      throw AppError.conflict('A staff account with this email already exists.');
    }

    await clerkClient.invitations.createInvitation({
      emailAddress: input.email,
      publicMetadata: { role: input.role, pending_full_name: input.full_name },
      redirectUrl: `${process.env.DASHBOARD_URL}`
    });

    res.status(202).json({ success: true, data: { invitation_status: 'pending', email: input.email } });
  } catch (err) {
    next(err);
  }
});

/** PATCH /admin/staff/:id — admin only. Role changes sync back to Clerk. */
adminStaffRouter.patch('/:id', async (req, res, next) => {
  try {
    const input = parseOrThrow(staffUpdateSchema, req.body);
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Staff member not found.');

    const staff = await prisma.staff.update({
      where: { id: existing.id },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
        ...(input.phone_number !== undefined ? { phoneNumber: input.phone_number } : {}),
      },
    });

    if (input.role && existing.clerkUserId) {
      try {
        await clerkClient.users.updateUserMetadata(existing.clerkUserId, {
          publicMetadata: { role: input.role },
        });
      } catch (clerkErr) {
        // DB is the record of truth here; log and continue rather than
        // fail the whole request if Clerk sync hiccups — the next
        // user.updated webhook (or a retry) will reconcile it.
        logger.error({ err: clerkErr, staffId: staff.id }, 'Failed to sync role change to Clerk.');
      }
    }

    ok(res, serializeStaff(staff));
  } catch (err) {
    next(err);
  }
});

/** DELETE /admin/staff/:id — admin only. Soft delete + revoke Clerk sessions. */
adminStaffRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Staff member not found.');

    const staff = await prisma.staff.update({ where: { id: existing.id }, data: { isActive: false } });

    if (existing.clerkUserId) {
      try {
        const sessions = await clerkClient.sessions.getSessionList({ userId: existing.clerkUserId });
        await Promise.all(sessions.data.map((s) => clerkClient.sessions.revokeSession(s.id)));
      } catch (clerkErr) {
        logger.error({ err: clerkErr, staffId: staff.id }, 'Failed to revoke Clerk sessions on deactivation.');
      }
    }

    ok(res, serializeStaff(staff));
  } catch (err) {
    next(err);
  }
});
