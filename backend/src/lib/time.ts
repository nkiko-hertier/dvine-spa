/**
 * Postgres TIME columns are represented by Prisma as a Date on the
 * 1970-01-01 epoch — only the time-of-day component is stored/read.
 * Used wherever a "HH:MM" string from the API needs to become a value
 * Prisma will write to a `@db.Time` column.
 */
export function timeStringToDate(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00Z`);
}
