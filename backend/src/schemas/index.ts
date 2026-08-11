import { z } from 'zod';

// Request/response bodies use snake_case throughout, per API_DOCUMENTATION.md
// (e.g. "cover_image_url", "treatment_id"). Route handlers map the validated
// snake_case input to Prisma's camelCase field names explicitly — see each
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

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected 24h time in HH:MM format.');

/** POST /booking-requests (public) — API_DOCUMENTATION.md §8.1 */
export const bookingRequestCreateSchema = z.object({
  full_name: z.string().min(1).max(100),
  phone_number: z.string().min(6).max(20),
  whatsapp_number: z.string().min(6).max(20).optional(),
  source: customerSourceSchema.optional(),
  treatment_id: z.string().uuid(),
  preferred_date: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date.'),
  preferred_time: timeStringSchema,
  channel: customerSourceSchema.optional(),
  notes: z.string().optional(),
});

/** GET /booking-requests/lookup (public) — API_DOCUMENTATION.md §8.2 */
export const bookingRequestLookupSchema = z.object({
  reference: z.string().min(1),
  phone_number: z.string().min(6).max(20),
});

/** PATCH /admin/booking-requests/:id — API_DOCUMENTATION.md §8.5 */
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
