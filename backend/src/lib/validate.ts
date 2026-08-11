import type { ZodType } from 'zod';
import { AppError } from '../lib/errors.js';

/**
 * Parses `input` against `schema`; on failure throws AppError.validation
 * with the same {field, issue}[] shape the global error handler already
 * produces for raw ZodErrors (see middleware/errorHandler.ts) — used here
 * for cases where we want a custom message but the same details format.
 */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw AppError.validation(
      'Request failed validation.',
      result.error.issues.map((issue) => ({ field: issue.path.join('.'), issue: issue.message })),
    );
  }
  return result.data;
}
