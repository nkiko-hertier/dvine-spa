import { z } from 'zod';

// Request/response bodies use snake_case throughout, per API_DOCUMENTATION.md
// (e.g. "cover_image_url", "treatment_id"). Route handlers map the validated
// snake_case input to Prisma's camelCase field names explicitly, see each
// router's create/update calls. Don't "fix" these to camelCase; camelCase
// here would silently break the documented contract.

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  cover_image_url: z.string().url().max(255).optional(),
  display_order: z.number().int().min(0).optional(),
});
export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const treatmentCreateSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive(),
  price: z.number().positive(),
  image_url: z.string().url().max(255).optional(),
  benefits: z.array(z.string()).optional(),
  recommended_for: z.array(z.string()).optional(),
  display_order: z.number().int().min(0).optional(),
});
export const treatmentUpdateSchema = treatmentCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
});

const CUSTOMER_SOURCES = [
  'instagram', 'facebook', 'tiktok', 'google', 'website',
  'referral', 'hotel', 'corporate', 'walk_in', 'other',
] as const;
export const customerSourceSchema = z.enum(CUSTOMER_SOURCES);

const BOOKING_STATUSES = [
  'new_request', 'contacted', 'confirmed', 'completed', 'cancelled', 'no_show',
] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

/**
 * "New" vs "repeating" client classification. Matches the definition
 * already used client-side (and now server-side, see admin/customers.ts
 * and admin/bookingRequests.ts): a customer is "repeating" once they have
 * more than one booking request on file (customer_summary.total_requests > 1).
 */
export const clientTypeSchema = z.enum(['new', 'repeating']);

/**
 * Booking origin, where a booking entered the system.
 *  - `from_us`         → no acquisition source on the customer: treated as
 *                        entered by staff straight into the dashboard.
 *  - `from_pixelspring` → the customer has a `source`: the booking came through
 *                        the public booking site (the flow PixelSpring built).
 * Derived, not stored, see serializeBookingRequest / the `origin` list filter.
 */
export const bookingOriginSchema = z.enum(['from_us', 'from_pixelspring']);

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected 24h time in HH:MM format.');

/** POST /booking-requests (public), API_DOCUMENTATION.md §8.1
 * Accepts either `treatment_ids` (preferred, multi-service) or legacy
 * single `treatment_id`. Use `normalizeTreatmentIds()` after parse;
 * the first id becomes booking_requests.treatment_id (primary).
 */
export const bookingRequestCreateSchema = z
  .object({
    full_name: z.string().min(1).max(100),
    phone_number: z.string().min(6).max(20),
    whatsapp_number: z.string().min(6).max(20).optional(),
    email: z.string().email().max(255).optional(),
    source: customerSourceSchema.optional(),
    treatment_id: z.string().uuid().optional(),
    // Accept the native JSON array used by the frontend. The preprocessing
    // also handles clients that send the array as JSON text or a single
    // value, while keeping UUID validation on every selected treatment.
    treatment_ids: z.preprocess((value) => {
      if (typeof value === 'string') {
        try {
          const parsed: unknown = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return [value];
        }
      }
      return value;
    }, z.array(z.string().uuid()).min(1).optional()),
    preferred_date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date.'),
    preferred_time: timeStringSchema,
    channel: customerSourceSchema.optional(),
    // How many guests this one booking covers. Defaults to 1; total_amount is
    // the sum of the selected treatments' prices * number_of_people,
    // computed server-side.
    number_of_people: z.number().int().min(1).max(20).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.treatment_ids?.length && !data.treatment_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide treatment_ids or treatment_id.',
        path: ['treatment_ids'],
      });
    }
  });

/** Deduplicate and order treatment ids from a validated create payload. */
export function normalizeTreatmentIds(input: {
  treatment_id?: string;
  treatment_ids?: string[];
}): string[] {
  const raw = input.treatment_ids?.length
    ? input.treatment_ids
    : input.treatment_id
      ? [input.treatment_id]
      : [];
  const seen = new Set<string>();
  return raw.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** GET /booking-requests/lookup (public), API_DOCUMENTATION.md §8.2 */
export const bookingRequestLookupSchema = z.object({
  reference: z.string().min(1),
  phone_number: z.string().min(6).max(20),
});

export const BOOKED_SERVICE_STATUSES = ['pending', 'done', 'cancelled'] as const;
export const bookedServiceStatusSchema = z.enum(BOOKED_SERVICE_STATUSES);

/** PATCH /admin/booking-requests/:id/services/:serviceId */
export const bookedServiceUpdateSchema = z.object({
  status: bookedServiceStatusSchema,
});

/** PATCH /admin/booking-requests/:id, API_DOCUMENTATION.md §8.5 */
export const bookingRequestUpdateSchema = z
  .object({
    status: bookingStatusSchema.optional(),
    confirmed_date: z.string().optional(),
    confirmed_time: timeStringSchema.optional(),
    staff_notes: z.string().optional(),
    cancellation_reason: z.string().optional(),
  })
  .refine((data) => data.status !== 'cancelled' || !!data.cancellation_reason, {
    message: 'cancellation_reason is required when status is "cancelled".',
    path: ['cancellation_reason'],
  });

export const customerUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  whatsapp_number: z.string().min(6).max(20).optional(),
  email: z.string().email().max(255).optional().nullable(),
  source: customerSourceSchema.optional(),
  notes: z.string().optional(),
});

export const staffInviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export const staffUpdateSchema = z.object({
  role: z.enum(['admin', 'staff']).optional(),
  is_active: z.boolean().optional(),
  phone_number: z.string().max(20).optional(),
});
