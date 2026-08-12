import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// ------------------------------------------------------------
// Envelope helpers — every response follows API_DOCUMENTATION.md §4.1
// ------------------------------------------------------------

export const errorEnvelopeSchema = registry.register(
  'ErrorEnvelope',
  z
    .object({
      success: z.literal(false),
      error: z.object({
        code: z.enum([
          'VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND',
          'CONFLICT', 'UNPROCESSABLE', 'RATE_LIMITED', 'INTERNAL_ERROR',
        ]),
        message: z.string(),
        details: z.array(z.object({ field: z.string().optional(), issue: z.string() })).optional(),
      }),
    })
    .openapi('ErrorEnvelope'),
);

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
});

export function successEnvelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ success: z.literal(true), data: dataSchema });
}

export function successListEnvelope<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ success: z.literal(true), data: z.array(dataSchema), meta: paginationMetaSchema });
}

const jsonError = { description: 'Error', content: { 'application/json': { schema: errorEnvelopeSchema } } };

export const commonErrorResponses = {
  400: jsonError,
  401: jsonError,
  403: jsonError,
  404: jsonError,
  409: jsonError,
  422: jsonError,
  429: jsonError,
};

// ------------------------------------------------------------
// Shared field schemas
// ------------------------------------------------------------

export const customerSourceSchema = z
  .enum(['instagram', 'facebook', 'tiktok', 'google', 'website', 'referral', 'hotel', 'corporate', 'walk_in', 'other'])
  .openapi('CustomerSource');

export const bookingStatusSchema = z
  .enum(['new_request', 'contacted', 'confirmed', 'completed', 'cancelled', 'no_show'])
  .openapi('BookingStatus');

export const paginationQuerySchema = z.object({
  page: z.string().optional().openapi({ description: 'Default 1' }),
  limit: z.string().optional().openapi({ description: 'Default 20, max 100' }),
});
