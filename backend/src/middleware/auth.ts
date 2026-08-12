import type { RequestHandler } from 'express';
import { getAuth } from '@clerk/express';
import { UserRole } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { resolveActiveStaff } from '../lib/resolveStaff.js';

/**
 * Requires a valid Clerk session AND a matching, active `staff` row.
 * Mount `clerkMiddleware()` (from @clerk/express) globally in app.ts first —
 * this only reads what that middleware already attached to the request.
 *
 * On success, `req.staff` is populated (see src/types/express.d.ts) so
 * downstream handlers never touch Clerk's `userId` directly — they use
 * the local primary key, which is what audit_logs.user_id etc. expect.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      throw AppError.unauthorized();
    }

    const staff = await resolveActiveStaff(userId);
    if (!staff) {
      // A verified Clerk session with no (or a deactivated) local staff
      // row is a config/sync problem, not a credentials problem — but
      // from the caller's point of view it's still "you can't do this."
      throw AppError.forbidden('No active staff account is linked to this session.');
    }

    req.staff = staff;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Mount AFTER requireAuth. Restricts to a specific role (e.g. 'admin'
 * for /admin/staff/*, per API_DOCUMENTATION.md §2.4's role matrix).
 */
export function requireRole(role: UserRole): RequestHandler {
  return (req, _res, next) => {
    if (req.staff?.role !== role) {
      next(AppError.forbidden(`This action requires the '${role}' role.`));
      return;
    }
    next();
  };
}
