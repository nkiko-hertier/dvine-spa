/**
 * pushNotifications.ts: what is worth a staff member's phone buzzing.
 *
 * The test for being here is simple: would a person want to stop what
 * they are doing? A booking nobody has answered yet passes. A booking
 * a colleague has just confirmed does not, it is already handled.
 *
 * What sends a notification
 *   1. A new request arrives from the website or the booking page.
 *      Someone has to phone this client back, and the sooner the better.
 *   2. A request is still unanswered after a while (the reminder sweep,
 *      routes/internal/cron.ts). A missed request is lost business.
 *   3. The day's first look: how many visits are booked for today, sent
 *      once each morning, so nobody has to open the dashboard to find out.
 *   4. A client's visit was marked no-show by the system? Not a thing the
 *      system does by itself, so no.
 *   5. A staff account is deactivated or invited: administrators only,
 *      and only because it changes who can get in.
 *
 * What deliberately does NOT send one: a status change a staff member
 * made themselves (they are looking at the screen), completed visits,
 * payments, catalogue edits. Everything still shows in the dashboard.
 */
import type { BookingRequest, Customer, Treatment } from '@prisma/client';
import { notifyAdmins, notifyAllStaff, type PushPayload } from './push.js';
import { logger } from './logger.js';

type BookingWithRelations = BookingRequest & {
  customer: Customer;
  treatment: Treatment;
  treatments?: { treatment: Treatment; displayOrder: number }[];
};

function serviceNames(b: BookingWithRelations): string {
  const extras = (b.treatments ?? [])
    .slice()
    .sort((a, c) => a.displayOrder - c.displayOrder)
    .map((row) => row.treatment.name);
  return extras.length ? extras.join(', ') : b.treatment.name;
}

/** "Fri 25 Sept at 2:00 PM", in the spa's own way of writing it. */
function whenLabel(date: Date, time: Date | string): string {
  const day = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const t = typeof time === 'string' ? time : time.toISOString().slice(11, 16);
  const [rawH, rawM] = t.split(':');
  const h = Number(rawH ?? 0);
  const m = Number(rawM ?? 0);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${day} at ${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** 1. A new request has come in and nobody has spoken to the client yet. */
export async function pushNewBooking(booking: BookingWithRelations): Promise<void> {
  try {
    const people = booking.numberOfPeople > 1 ? ` for ${booking.numberOfPeople}` : '';
    const payload: PushPayload = {
      title: 'New booking request',
      body: `${booking.customer.fullName}${people}: ${serviceNames(booking)}, ${whenLabel(
        booking.preferredDate,
        booking.preferredTime,
      )}`,
      // Opens the bookings list with this request found, so the person who
      // taps it is one tap from calling the client.
      url: `/dashboard/bookings?search=${encodeURIComponent(booking.requestReference ?? booking.customer.phoneNumber)}`,
      tag: `booking-${booking.id}`,
      urgent: true,
    };
    const sent = await notifyAllStaff(payload);
    logger.info({ bookingId: booking.id, sent }, 'Pushed new booking to staff devices.');
  } catch (err) {
    logger.error({ err, bookingId: booking.id }, 'pushNewBooking failed.');
  }
}

/** 2. Requests that have been sitting unanswered. One notification, not one per booking. */
export async function pushUnansweredReminder(count: number, oldestHours: number): Promise<number> {
  if (count < 1) return 0;
  const noun = count === 1 ? 'request is' : 'requests are';
  return notifyAllStaff({
    title: `${count} booking ${noun} waiting`,
    body:
      count === 1
        ? `Still unanswered after ${oldestHours} hours. A client is waiting for a call.`
        : `The oldest has been waiting ${oldestHours} hours. Clients are waiting for a call.`,
    url: '/dashboard/bookings',
    tag: 'dvine-unanswered',
    urgent: true,
  });
}

/** 3. The morning look at the day. */
export async function pushTodaySummary(confirmed: number, pending: number): Promise<number> {
  if (confirmed === 0 && pending === 0) return 0;
  const parts: string[] = [];
  if (confirmed) parts.push(`${confirmed} confirmed visit${confirmed === 1 ? '' : 's'}`);
  if (pending) parts.push(`${pending} request${pending === 1 ? '' : 's'} to answer`);
  return notifyAllStaff({
    title: 'Today at D’Vine',
    body: parts.join(' and ') + '.',
    url: '/dashboard',
    tag: 'dvine-today',
  });
}

/** 5. Someone's access changed. Administrators only. */
export async function pushStaffAccessChanged(what: string): Promise<number> {
  return notifyAdmins({
    title: 'Staff access changed',
    body: what,
    url: '/dashboard/users',
    tag: 'dvine-staff',
  });
}
