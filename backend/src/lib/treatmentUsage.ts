import { prisma } from './prisma.js';

/**
 * Treatment usage across multi-service bookings.
 *
 * A booking has one primary treatment (booking_requests.treatment_id) and,
 * since migration 009, every selected service in booking_request_treatments.
 * Counting only the primary column undercounts secondary services, and
 * counting only the junction table would miss rows written before the
 * junction existed. So these queries take the UNION of both sources: a
 * (booking, treatment) pair is counted once however many places list it.
 */

export type TreatmentUsage = { id: string; name: string; price: string; duration_minutes: number; times: number };

type UsageRow = { id: string; name: string; price: string; duration_minutes: number; times: number };

/** Most-booked treatment (any position on a booking) created since `since`. */
export async function topTreatmentSince(since: Date): Promise<{ id: string; name: string; bookings: number } | null> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT t.id::text AS id, t.name, t.price::text AS price, t.duration_minutes, COUNT(*)::int AS times
      FROM (
        SELECT br.id AS booking_id, br.treatment_id
          FROM booking_requests br
         WHERE br.created_at >= ${since}
        UNION
        SELECT brt.booking_request_id, brt.treatment_id
          FROM booking_request_treatments brt
          JOIN booking_requests br ON br.id = brt.booking_request_id
         WHERE br.created_at >= ${since}
      ) x
      JOIN treatments t ON t.id = x.treatment_id
     GROUP BY t.id, t.name, t.price, t.duration_minutes
     ORDER BY times DESC, t.name ASC
     LIMIT 1`;
  const top = rows[0];
  return top ? { id: top.id, name: top.name, bookings: top.times } : null;
}

/** The treatment a customer books most often, across every service on every booking. */
export async function mostCommonTreatmentForCustomer(customerId: string): Promise<TreatmentUsage | null> {
  const rows = await prisma.$queryRaw<UsageRow[]>`
    SELECT t.id::text AS id, t.name, t.price::text AS price, t.duration_minutes, COUNT(*)::int AS times
      FROM (
        SELECT br.id AS booking_id, br.treatment_id
          FROM booking_requests br
         WHERE br.customer_id = ${customerId}::uuid
        UNION
        SELECT brt.booking_request_id, brt.treatment_id
          FROM booking_request_treatments brt
          JOIN booking_requests br ON br.id = brt.booking_request_id
         WHERE br.customer_id = ${customerId}::uuid
      ) x
      JOIN treatments t ON t.id = x.treatment_id
     GROUP BY t.id, t.name, t.price, t.duration_minutes
     ORDER BY times DESC, t.name ASC
     LIMIT 1`;
  return rows[0] ?? null;
}

/** True when any booking references this treatment as primary OR as an extra service. */
export async function treatmentHasBookings(treatmentId: string): Promise<boolean> {
  const [primary, extra] = await Promise.all([
    prisma.bookingRequest.count({ where: { treatmentId } }),
    prisma.bookingRequestTreatment.count({ where: { treatmentId } }),
  ]);
  return primary + extra > 0;
}

/** True when any booking references a treatment of this category, as primary or extra. */
export async function categoryHasBookings(categoryId: string): Promise<boolean> {
  const [primary, extra] = await Promise.all([
    prisma.bookingRequest.count({ where: { treatment: { categoryId } } }),
    prisma.bookingRequestTreatment.count({ where: { treatment: { categoryId } } }),
  ]);
  return primary + extra > 0;
}
