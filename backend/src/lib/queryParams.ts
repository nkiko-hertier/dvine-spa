/** Normalizes a query param that may arrive as a single value, array, or absent. */
export function asArray(value: unknown): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export function asString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? String(value[0]) : String(value);
}

/**
 * Parses `?sort=field` (ascending) or `?sort=-field` (descending) into a
 * Prisma orderBy object, restricted to an allow-list so callers can't sort
 * on arbitrary/unindexed columns. Falls back to `defaultField` ascending.
 */
export function parseSort<Field extends string>(
  raw: unknown,
  allowed: readonly Field[],
  defaultField: Field,
  defaultDirection: 'asc' | 'desc' = 'asc',
): Record<Field, 'asc' | 'desc'> {
  const value = asString(raw);
  if (!value) return { [defaultField]: defaultDirection } as Record<Field, 'asc' | 'desc'>;

  const desc = value.startsWith('-');
  const field = (desc ? value.slice(1) : value) as Field;

  if (!allowed.includes(field)) {
    return { [defaultField]: defaultDirection } as Record<Field, 'asc' | 'desc'>;
  }
  return { [field]: desc ? 'desc' : 'asc' } as Record<Field, 'asc' | 'desc'>;
}

/** Parses a `YYYY-MM-DD` query param into a Date, or undefined if absent/invalid. */
export function parseDate(raw: unknown): Date | undefined {
  const value = asString(raw);
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
