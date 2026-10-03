import type { BookedService } from '@prisma/client';
import { prisma } from './prisma.js';
import { AppError } from './errors.js';

/** Relation include for booked services, in the order they were picked. */
export const bookedServicesInclude = {
  bookedServices: { orderBy: { displayOrder: 'asc' as const } },
};

export function serializeBookedService(s: BookedService) {
  return {
    id: s.id,
    treatment_id: s.treatmentId,
    service_name: s.serviceName,
    price: s.price.toFixed(2),
    display_order: s.displayOrder,
    status: s.status,
    resolved_at: s.resolvedAt,
  };
}

/** Counts per status, for the "2 of 3 done" line and the completion rule. */
export function summarizeBookedServices(rows: Pick<BookedService, 'status'>[]) {
  const summary = { total: rows.length, pending: 0, done: 0, cancelled: 0 };
  for (const r of rows) summary[r.status] += 1;
  return summary;
}

/**
 * A booking may be completed only when none of its services is pending
 * and at least one was actually served. Bookings with no booked_services
 * rows (nothing to track) are never blocked.
 */
export async function assertServicesAllowCompletion(bookingId: string): Promise<void> {
  const rows = await prisma.bookedService.findMany({
    where: { bookingId },
    orderBy: { displayOrder: 'asc' },
    select: { serviceName: true, status: true },
  });
  if (rows.length === 0) return;

  const pending = rows.filter((r) => r.status === 'pending');
  if (pending.length > 0) {
    throw AppError.conflict(
      `Cannot complete this booking: ${pending.length} service${pending.length === 1 ? ' is' : 's are'} still pending (${pending
        .map((r) => r.serviceName)
        .join(', ')}). Serve them, or mark them as cancelled first.`,
    );
  }
  if (!rows.some((r) => r.status === 'done')) {
    throw AppError.conflict(
      'Cannot complete this booking: every service was cancelled. Cancel the booking instead.',
    );
  }
}
