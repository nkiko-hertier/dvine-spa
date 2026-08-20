/**
 * emailNotifications.ts — orchestration layer.
 *
 * Routes call these functions. Each one:
 *   1. Resolves recipient(s).
 *   2. Checks skip conditions (no email on file, etc.).
 *   3. Builds the template.
 *   4. Calls sendEmail / sendEmailToMany (fire-and-forget at the call site).
 *
 * This layer never throws — both sendEmail and the template functions are
 * defensive, but we add a top-level try/catch here as the final safety net
 * so an unexpected bug doesn't propagate into route handlers.
 *
 * Call-site pattern in routes (after ok(res, ...)):
 *
 *   void notifyCustomerBookingReceived(booking, customer).catch((err) =>
 *     logger.error({ err }, 'Email notification threw unexpectedly'),
 *   );
 */

import type { BookingRequest, Customer, Staff, Treatment } from '@prisma/client';
import { prisma } from './prisma.js';
import { sendEmail, sendEmailToMany } from './email.js';
import {
  bookingReceivedCustomer,
  newBookingStaffAlert,
  bookingContactedCustomer,
  bookingConfirmedCustomer,
  bookingCompletedCustomer,
  bookingCancelledCustomer,
  bookingNoShowCustomer,
  staffInvited,
  type BookingEmailContext,
} from './emailTemplates.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

type BookingWithRelations = BookingRequest & {
  customer: Customer;
  treatment: Treatment;
};

function buildContext(b: BookingWithRelations): BookingEmailContext {
  return {
    requestReference: b.requestReference,
    customerName: b.customer.fullName,
    customerPhone: b.customer.phoneNumber,
    customerEmail: b.customer.email,
    treatmentName: b.treatment.name,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    confirmedDate: b.confirmedDate,
    confirmedTime: b.confirmedTime,
    cancellationReason: b.cancellationReason,
    staffNotes: b.staffNotes,
  };
}

/** Fetch all active staff emails in one query. */
async function fetchActiveStaffEmails(): Promise<string[]> {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { email: true },
  });
  return staff.map((s) => s.email).filter(Boolean) as string[];
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Email #1 — Customer confirmation after a new booking request.
 * Skipped silently if the customer has no email on file.
 */
export async function notifyCustomerBookingReceived(booking: BookingWithRelations): Promise<void> {
  try {
    const { email } = booking.customer;
    if (!email) return;
    const { subject, html } = bookingReceivedCustomer(buildContext(booking));
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, 'notifyCustomerBookingReceived failed');
  }
}

/**
 * Email #2 — Staff alert for every new booking request.
 * Never skipped — staff need to know regardless of customer email.
 */
export async function notifyStaffNewBooking(booking: BookingWithRelations): Promise<void> {
  try {
    const staffEmails = await fetchActiveStaffEmails();
    if (!staffEmails.length) {
      logger.warn({ bookingId: booking.id }, 'notifyStaffNewBooking: no active staff emails found');
      return;
    }
    const { subject, html } = newBookingStaffAlert(
      buildContext(booking),
      env.DASHBOARD_URL,
      booking.id,
    );
    await sendEmailToMany(staffEmails, subject, html);
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, 'notifyStaffNewBooking failed');
  }
}

/**
 * Emails #3–#7 — Customer notification on status change.
 * Skipped silently if the customer has no email.
 */
export async function notifyCustomerStatusChange(
  booking: BookingWithRelations,
  newStatus: string,
): Promise<void> {
  try {
    const { email } = booking.customer;
    if (!email) return;

    const ctx = buildContext(booking);
    let template: { subject: string; html: string } | null = null;

    switch (newStatus) {
      case 'contacted':
        template = bookingContactedCustomer(ctx);
        break;
      case 'confirmed':
        template = bookingConfirmedCustomer(ctx);
        break;
      case 'completed':
        template = bookingCompletedCustomer(ctx);
        break;
      case 'cancelled':
        template = bookingCancelledCustomer(ctx);
        break;
      case 'no_show':
        template = bookingNoShowCustomer(ctx);
        break;
      default:
        // No email defined for this status transition
        return;
    }

    if (template) {
      await sendEmail({ to: email, subject: template.subject, html: template.html });
    }
  } catch (err) {
    logger.error({ err, bookingId: booking.id, newStatus }, 'notifyCustomerStatusChange failed');
  }
}

/**
 * Email #8 — Staff invite.
 * inviteUrl is the Clerk-generated invitation link.
 */
export async function notifyStaffInvited(
  staff: Pick<Staff, 'email' | 'fullName' | 'role'>,
  inviteUrl: string,
): Promise<void> {
  try {
    const { subject, html } = staffInvited(staff.fullName, staff.role, inviteUrl);
    await sendEmail({ to: staff.email, subject, html });
  } catch (err) {
    logger.error({ err, staffEmail: staff.email }, 'notifyStaffInvited failed');
  }
}
