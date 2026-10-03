import { prisma } from './prisma.js';
import { withDbRetry } from './dbRetry.js';
import { logger } from './logger.js';

type ActivityRow = {
  bookings: bigint | number;
  bookings_at: Date | null;
  customers: bigint | number;
  customers_at: Date | null;
  services: bigint | number;
  services_at: Date | null;
};

/**
 * A short string that changes whenever booking activity changes, so a
 * signed-in dashboard can tell in one tiny request whether anything has
 * happened since it last looked.
 *
 * This exists because the API runs as a Vercel Function. The database
 * already announces every change on a Postgres channel (the triggers in
 * sql/003_realtime_notifications.sql) and there is a Socket.IO bridge that
 * re-broadcasts it (src/realtime/), but a serverless function cannot hold
 * either a LISTEN connection or a client's WebSocket open: it exists only
 * for the length of one request. So the dashboard asks instead, often and
 * cheaply, and refetches only when this string moves. Deployed as a
 * long-running process (Docker, a VM) the socket path works and the poll
 * simply never has to fire.
 *
 * Per table: how many rows there are, and the newest updated_at.
 *   - an INSERT moves both (new rows default updated_at to now()),
 *   - an UPDATE moves the timestamp (the BEFORE UPDATE trigger in
 *     sql/001_base_schema.sql touches updated_at on every edit),
 *   - a DELETE moves the count.
 * A digest over every row, the way catalogVersion() does it, is right for
 * a menu of a few dozen rows and wrong here: booking_requests grows
 * forever, and this is asked for every few seconds by every open
 * dashboard. count() and max() stay cheap, and sql/008 indexes updated_at
 * so the max is read straight off the index.
 *
 * Customers are included because a request from the public page creates or
 * updates one, and the Clients screen should not be the last to know.
 */
export async function activityVersion(): Promise<string> {
  const rows = await withDbRetry(
    () => prisma.$queryRaw<ActivityRow[]>`
      SELECT
        (SELECT count(*) FROM booking_requests)          AS bookings,
        (SELECT max(updated_at) FROM booking_requests)   AS bookings_at,
        (SELECT count(*) FROM customers)                 AS customers,
        (SELECT max(updated_at) FROM customers)          AS customers_at,
        (SELECT count(*) FROM booked_services)           AS services,
        (SELECT max(updated_at) FROM booked_services)    AS services_at`,
  );
  const row = rows[0];
  if (!row) throw new Error('activity version query returned no row');

  // The timestamps go out as epoch milliseconds rather than formatted
  // dates: the string is only ever compared with itself, and this way a
  // server in a different time zone still produces the same answer.
  const stamp = (at: Date | null) => (at ? at.getTime().toString(36) : '0');
  return [
    String(row.bookings),
    stamp(row.bookings_at),
    String(row.customers),
    stamp(row.customers_at),
    // Marking a service done changes booked_services, not booking_requests,
    // so an open dashboard needs this to notice (sql/009).
    String(row.services),
    stamp(row.services_at),
  ].join('.');
}

/**
 * The version for stamping a response, or null when it cannot be read.
 * Nothing the dashboard shows may fail because this string was
 * unavailable: a missing stamp just means the next poll decides.
 */
export async function activityVersionForStamp(): Promise<string | null> {
  try {
    return await activityVersion();
  } catch (err) {
    logger.warn({ err }, 'Could not compute the activity version.');
    return null;
  }
}
