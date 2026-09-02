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
import { env } from '../../config/env.js';

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
 *
 * Reinvite behaviour: if a still-pending Clerk invitation already exists for
 * this email, it is revoked first (killing the old link) and a fresh one is
 * issued with the latest role / name. Clerk has no "resend" endpoint —
 * revoke + recreate is the supported path — and `ignoreExisting: true` keeps
 * the create from failing on the leftover record if the revoke didn't catch it.
 */
adminStaffRouter.post('/invite', async (req, res, next) => {
  try {
    const input = parseOrThrow(staffInviteSchema, req.body);

    const existing = await prisma.staff.findUnique({ where: { email: input.email } });
    if (existing && existing.isActive) {
      throw AppError.conflict('A staff account with this email already exists.');
    }

    // Revoke any outstanding pending invitation(s) for this exact address.
    // `query` is a partial match, so filter down to an exact (case-insensitive) hit.
    let reinvited = false;
    try {
      const pending = await clerkClient.invitations.getInvitationList({
        status: 'pending',
        query: input.email,
      });
      const stale = pending.data.filter(
        (inv) => inv.emailAddress.toLowerCase() === input.email.toLowerCase(),
      );
      for (const inv of stale) {
        await clerkClient.invitations.revokeInvitation(inv.id);
        reinvited = true;
      }
    } catch (revokeErr) {
      // Non-fatal — fall through to createInvitation (ignoreExisting handles the
      // leftover) so a listing/revoke hiccup never blocks issuing the invite.
      logger.warn({ err: revokeErr, email: input.email }, 'Could not revoke prior invitation(s) before reinvite.');
    }

    await clerkClient.invitations.createInvitation({
      emailAddress: input.email,
      publicMetadata: { role: input.role, pending_full_name: input.full_name },
      // Land the invitee on our own page that renders Clerk's <SignUp>, which
      // consumes the __clerk_ticket query param Clerk appends here. Without a
      // valid app URL Clerk falls back to its hosted /default-redirect page.
      // Belt-and-braces: if a pending/accepted record slipped past the revoke
      // above, still issue the new invitation rather than 400ing.
      ignoreExisting: true,
    });

    res.status(202).json({
      success: true,
      data: { invitation_status: 'pending', email: input.email, reinvited },
    });
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

/**
 * DELETE /admin/staff/:id/permanent — admin only. HARD delete.
 *
 * Removes the linked Clerk user (so the person can never sign in again) AND
 * the local `staff` row entirely. Historical `audit_logs` survive with a null
 * actor (`audit_logs.user_id` is ON DELETE SET NULL). Irreversible — the plain
 * DELETE /:id soft delete stays the default, gentler action.
 */
adminStaffRouter.delete('/:id/permanent', async (req, res, next) => {
  try {
    const existing = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!existing) throw AppError.notFound('Staff member not found.');
    if (existing.id === req.staff!.id) {
      throw AppError.conflict('You cannot permanently delete your own account.');
    }

    // Delete the Clerk user first. If it's already gone (404) we still want to
    // clear the local row; any other Clerk failure aborts so we never orphan a
    // still-usable login with no staff record behind it.
    if (existing.clerkUserId) {
      try {
        await clerkClient.users.deleteUser(existing.clerkUserId);
      } catch (clerkErr) {
        const status = (clerkErr as { status?: number })?.status;
        if (status !== 404) {
          logger.error({ err: clerkErr, staffId: existing.id }, 'Failed to delete Clerk user — aborting hard delete.');
          throw AppError.internal('Could not remove the linked Clerk account. Nothing was deleted.');
        }
      }
    }

    await prisma.staff.delete({ where: { id: existing.id } });

    logger.info(
      { staffId: existing.id, email: existing.email, deletedBy: req.staff!.id },
      'Staff member permanently deleted.',
    );
    ok(res, { id: existing.id, deleted: true });
  } catch (err) {
    next(err);
  }
});
