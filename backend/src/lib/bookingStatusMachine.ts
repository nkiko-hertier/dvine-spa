import { BookingStatus } from '@prisma/client';
import { AppError } from './errors.js';

/**
 * Valid transitions, per API_DOCUMENTATION.md §8.5:
 *
 *   new_request -> contacted -> confirmed -> completed
 *        |             |           |
 *        +-------------+-----------+--> cancelled
 *                      confirmed --> no_show
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new_request: [BookingStatus.contacted, BookingStatus.cancelled],
  contacted: [BookingStatus.confirmed, BookingStatus.cancelled],
  confirmed: [BookingStatus.completed, BookingStatus.cancelled, BookingStatus.no_show],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function assertValidTransition(from: BookingStatus, to: BookingStatus): void {
  if (from === to) return; // no-op update (e.g. re-saving staff_notes) is always allowed
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw AppError.conflict(
      `Cannot move a booking request from '${from}' to '${to}'. Valid next states from '${from}': ${
        ALLOWED_TRANSITIONS[from].length ? ALLOWED_TRANSITIONS[from].join(', ') : '(none — this is a terminal state)'
      }.`,
    );
  }
}
