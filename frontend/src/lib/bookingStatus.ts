import type { BookingStatus } from "../types";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  new_request: "New Request",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const STATUS_CLASS: Record<BookingStatus, string> = {
  new_request: "bg-stone-200 text-stone-700",
  contacted: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-stone-300 text-stone-800",
};

/**
 * Requests move forward one step at a time:
 *   new_request -> contacted -> confirmed -> completed
 * (with cancelled/no_show as side branches handled separately by the
 * "Reject" action, not the Advance button). Mirrors
 * backend/src/lib/bookingStatusMachine.ts.
 */
export const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  new_request: "contacted",
  contacted: "confirmed",
  confirmed: "completed",
};

/** What the Advance button should say for the booking's *current* status. */
export const ADVANCE_LABEL: Partial<Record<BookingStatus, string>> = {
  new_request: "Mark as Contacted",
  contacted: "Mark as Confirmed",
  confirmed: "Mark as Completed",
};

/** Terminal states — no further action is possible from the UI. */
export const TERMINAL_STATUSES: BookingStatus[] = ["completed", "cancelled", "no_show"];

export function isTerminalStatus(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const CANCEL_REASON = "Cancelled by management.";

/**
 * Formats a preferred/confirmed date + time pair for display. Handles
 * `time` arriving either as a plain "HH:MM" string or as the full ISO
 * datetime string the API actually returns for @db.Time columns
 * (Prisma/Postgres TIME values serialize as e.g.
 * "1970-01-01T14:00:00.000Z" — see backend/src/lib/time.ts).
 */
export function formatDateTime(date: string, time: string): string {
  if (!date) return "—";
  const d = new Date(date);
  const dateStr = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = formatTimeOfDay(time);
  return timeStr ? `${dateStr}, ${timeStr}` : dateStr;
}

/** Renders a "HH:MM" or full ISO time string as a friendly "2:00 PM". */
function formatTimeOfDay(time: string): string {
  if (!time) return "";
  // Plain "HH:MM" (e.g. from a <select>) — parse directly, no Date needed.
  const plainMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  const [hours, minutes] = plainMatch
    ? [Number(plainMatch[1]), Number(plainMatch[2])]
    : (() => {
        const d = new Date(time);
        return Number.isNaN(d.getTime()) ? [null, null] : [d.getUTCHours(), d.getUTCMinutes()];
      })();
  if (hours === null || minutes === null) return time;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** Converts an API date value (ISO datetime or "YYYY-MM-DD") to a value usable by <input type="date">. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Converts an API time value (ISO datetime or "HH:MM") to a value usable by a "HH:MM" <select>. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const plainMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (plainMatch) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** Shared time-of-day options for confirmed-time selects (matches the manual booking form). */
export const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "18:00", label: "06:00 PM" },
];
