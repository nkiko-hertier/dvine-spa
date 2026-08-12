import { z } from 'zod';
import { registry, customerSourceSchema, bookingStatusSchema } from './setup.js';

export const categorySchema = registry.register(
  'Category',
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    cover_image_url: z.string().nullable(),
    is_active: z.boolean().optional(),
    display_order: z.number().int(),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
    treatment_count: z.number().int().optional().openapi({ description: 'Public list endpoint only' }),
  }),
);

const categoryRefSchema = z.object({ id: z.string().uuid(), name: z.string() }).nullable();

export const treatmentSchema = registry.register(
  'Treatment',
  z.object({
    id: z.string().uuid(),
    category: categoryRefSchema,
    name: z.string(),
    description: z.string().nullable(),
    duration_minutes: z.number().int(),
    price: z.string().openapi({ description: 'Decimal as string, e.g. "30000.00"' }),
    image_url: z.string().nullable(),
    benefits: z.array(z.string()),
    recommended_for: z.array(z.string()),
    is_active: z.boolean().optional().openapi({ description: 'Admin endpoints only' }),
    display_order: z.number().int().optional().openapi({ description: 'Admin endpoints only' }),
    created_at: z.string().datetime().optional().openapi({ description: 'Admin endpoints only' }),
    updated_at: z.string().datetime().optional().openapi({ description: 'Admin endpoints only' }),
  }),
);

export const customerSchema = registry.register(
  'Customer',
  z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    phone_number: z.string(),
    whatsapp_number: z.string().nullable(),
    source: customerSourceSchema.nullable(),
    customer_since: z.string().datetime(),
    notes: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
);

export const customerSummarySchema = registry.register(
  'CustomerSummary',
  z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    phone_number: z.string(),
    whatsapp_number: z.string().nullable(),
    source: customerSourceSchema.nullable(),
    customer_since: z.string().datetime(),
    total_requests: z.number().int(),
    total_visits: z.number().int(),
    last_visit_date: z.string().nullable(),
    most_recent_treatment: z.string().nullable(),
    pending_requests: z.number().int(),
    last_activity: z.string().datetime().nullable(),
    notes: z.string().nullable().optional().openapi({ description: 'Detail endpoint only' }),
    recent_bookings: z.array(z.record(z.string(), z.unknown())).optional().openapi({ description: 'Detail endpoint only' }),
  }),
);

const bookingCustomerRefSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  phone_number: z.string(),
  whatsapp_number: z.string().nullable(),
});

const bookingTreatmentRefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.string(),
  duration_minutes: z.number().int(),
  category_name: z.string().nullable(),
});

export const bookingRequestSchema = registry.register(
  'BookingRequest',
  z.object({
    id: z.string().uuid(),
    request_reference: z.string().openapi({ example: 'DV-2026-000123' }),
    status: bookingStatusSchema,
    customer: bookingCustomerRefSchema,
    treatment: bookingTreatmentRefSchema,
    preferred_date: z.string(),
    preferred_time: z.string(),
    confirmed_date: z.string().nullable(),
    confirmed_time: z.string().nullable(),
    channel: customerSourceSchema,
    staff_notes: z.string().nullable(),
    cancellation_reason: z.string().nullable(),
    created_at: z.string().datetime(),
  }),
);

export const bookingRequestCreateResponseSchema = registry.register(
  'BookingRequestCreateResponse',
  z.object({
    id: z.string().uuid(),
    request_reference: z.string(),
    status: bookingStatusSchema,
    treatment: z.object({ id: z.string().uuid(), name: z.string(), price: z.string(), duration_minutes: z.number().int() }),
    preferred_date: z.string(),
    preferred_time: z.string(),
    created_at: z.string().datetime(),
  }),
);

export const bookingLookupResponseSchema = registry.register(
  'BookingLookupResponse',
  z.object({
    request_reference: z.string(),
    status: bookingStatusSchema,
    treatment_name: z.string(),
    confirmed_date: z.string().nullable(),
    confirmed_time: z.string().nullable(),
  }),
);

export const auditLogSchema = registry.register(
  'AuditLog',
  z.object({
    id: z.string().uuid(),
    booking_request_id: z.string().uuid().nullable(),
    user_id: z.string().uuid().nullable(),
    action: z.string(),
    old_status: bookingStatusSchema.nullable(),
    new_status: bookingStatusSchema.nullable(),
    notes: z.string().nullable(),
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    created_at: z.string().datetime(),
  }),
);

export const dailySummarySchema = registry.register(
  'DailySummary',
  z.object({
    request_date: z.string(),
    total_requests: z.number().int(),
    new_requests: z.number().int(),
    contacted: z.number().int(),
    confirmed: z.number().int(),
    completed: z.number().int(),
    cancelled: z.number().int(),
    no_show: z.number().int(),
  }),
);

export const dashboardStatsSchema = registry.register(
  'DashboardStats',
  z.object({
    pending_requests: z.number().int(),
    todays_bookings: z.number().int(),
    this_week_confirmed: z.number().int(),
    this_month_completed: z.number().int(),
    top_treatment_30d: z.object({ id: z.string().uuid(), name: z.string(), bookings: z.number().int() }).nullable(),
    new_customers_30d: z.number().int(),
  }),
);

export const staffSchema = registry.register(
  'Staff',
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string(),
    role: z.enum(['admin', 'staff']),
    phone_number: z.string().nullable(),
    is_active: z.boolean(),
    last_login: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
  }),
);
