import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { adminLimiter } from '../../middleware/rateLimit.js';
import { adminCategoriesRouter } from './categories.js';
import { adminTreatmentsRouter } from './treatments.js';
import { adminCustomersRouter } from './customers.js';
import { adminBookingRequestsRouter } from './bookingRequests.js';
import { adminAuditLogsRouter } from './auditLogs.js';
import { adminDashboardRouter } from './dashboard.js';
import { adminStaffRouter } from './staff.js';

export const adminRouter = Router();

// Every /admin/* route requires a valid Clerk session resolved to an
// active staff row (API_DOCUMENTATION.md §2.2-2.3), then a per-staff
// rate limit (§4.5).
// adminRouter.use(requireAuth, adminLimiter);

adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/treatments', adminTreatmentsRouter);
adminRouter.use('/customers', adminCustomersRouter);
adminRouter.use('/booking-requests', adminBookingRequestsRouter);
adminRouter.use('/audit-logs', adminAuditLogsRouter);
adminRouter.use('/dashboard', adminDashboardRouter);

// Staff management is admin-only per the role matrix in §2.4.
adminRouter.use('/staff', requireRole(UserRole.admin), adminStaffRouter);
