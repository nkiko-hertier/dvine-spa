import { Router } from 'express';
import { ok } from '../../lib/response.js';

export const adminMeRouter = Router();

/**
 * GET /admin/me — the signed-in staff member's own record.
 *
 * Mounted after requireAuth (see routes/admin/index.ts), so req.staff is
 * always populated here. Used by the frontend to decide what to render
 * (e.g. hiding "User Management" from non-admins) — this is a UX nicety
 * only; the backend's requireRole() checks on /admin/staff/* are what
 * actually enforce the boundary.
 */
adminMeRouter.get('/', (req, res) => {
  const staff = req.staff!;
  ok(res, {
    id: staff.id,
    email: staff.email,
    full_name: staff.fullName,
    role: staff.role,
    phone_number: staff.phoneNumber,
    is_active: staff.isActive,
    last_login: staff.lastLogin,
    created_at: staff.createdAt,
  });
});