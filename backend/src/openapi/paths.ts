import { z } from 'zod';
import { registry, successEnvelope, successListEnvelope, paginationQuerySchema, commonErrorResponses } from './setup.js';
import {
  categorySchema, treatmentSchema, customerSchema, customerSummarySchema,
  bookingRequestSchema, bookingRequestCreateResponseSchema, bookingLookupResponseSchema,
  auditLogSchema, dailySummarySchema, dashboardStatsSchema, staffSchema,
} from './schemas.js';
import {
  categoryCreateSchema, categoryUpdateSchema, treatmentCreateSchema, treatmentUpdateSchema,
  bookingRequestCreateSchema, bookingRequestUpdateSchema, customerUpdateSchema,
  staffInviteSchema, staffUpdateSchema,
} from '../schemas/index.js';

const json = <T extends z.ZodTypeAny>(schema: T) => ({ 'application/json': { schema } });
const okJson = <T extends z.ZodTypeAny>(description: string, schema: T) => ({
  description,
  content: json(successEnvelope(schema)),
});
const okListJson = <T extends z.ZodTypeAny>(description: string, schema: T) => ({
  description,
  content: json(successListEnvelope(schema)),
});
const body = <T extends z.ZodTypeAny>(schema: T) => ({ content: json(schema), required: true });

// ------------------------------------------------------------
// Public — categories & treatments (API_DOCUMENTATION.md §5-6)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/categories', tags: ['Public / Categories'],
  summary: 'List active categories',
  request: { query: z.object({ is_active: z.string().optional() }) },
  responses: { 200: okListJson('Active categories', categorySchema), ...commonErrorResponses },
});

registry.registerPath({
  method: 'get', path: '/categories/{id}', tags: ['Public / Categories'],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Category', categorySchema), ...commonErrorResponses },
});

registry.registerPath({
  method: 'get', path: '/categories/{id}/treatments', tags: ['Public / Categories'],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Treatments in this category', z.array(treatmentSchema)), ...commonErrorResponses },
});

registry.registerPath({
  method: 'get', path: '/treatments', tags: ['Public / Treatments'],
  request: {
    query: z.object({
      category_id: z.string().uuid().optional(),
      search: z.string().optional(),
      min_price: z.string().optional(),
      max_price: z.string().optional(),
      min_duration: z.string().optional(),
      max_duration: z.string().optional(),
      sort: z.string().optional(),
      ...paginationQuerySchema.shape,
    }),
  },
  responses: { 200: okListJson('Active treatments', treatmentSchema), ...commonErrorResponses },
});

registry.registerPath({
  method: 'get', path: '/treatments/{id}', tags: ['Public / Treatments'],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Treatment', treatmentSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Public — booking requests (§8.1-8.2)
// ------------------------------------------------------------

registry.registerPath({
  method: 'post', path: '/booking-requests', tags: ['Public / Booking Requests'],
  summary: 'Create a booking request',
  request: {
    body: body(bookingRequestCreateSchema),
    headers: z.object({ 'Idempotency-Key': z.string().optional() }),
  },
  responses: { 201: okJson('Created', bookingRequestCreateResponseSchema), ...commonErrorResponses },
});

registry.registerPath({
  method: 'get', path: '/booking-requests/lookup', tags: ['Public / Booking Requests'],
  summary: 'Look up a booking request by reference + phone number',
  request: { query: z.object({ reference: z.string(), phone_number: z.string() }) },
  responses: { 200: okJson('Booking status', bookingLookupResponseSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — categories (§5)
// ------------------------------------------------------------

const bearerAuth = [{ clerkSession: [] }];

registry.registerPath({
  method: 'get', path: '/admin/categories', tags: ['Admin / Categories'], security: bearerAuth,
  request: { query: z.object({ is_active: z.string().optional(), search: z.string().optional(), sort: z.string().optional(), ...paginationQuerySchema.shape }) },
  responses: { 200: okListJson('All categories', categorySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'post', path: '/admin/categories', tags: ['Admin / Categories'], security: bearerAuth,
  request: { body: body(categoryCreateSchema) },
  responses: { 201: okJson('Created', categorySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/categories/{id}', tags: ['Admin / Categories'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Category', categorySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'patch', path: '/admin/categories/{id}', tags: ['Admin / Categories'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }), query: z.object({ cascade: z.string().optional() }), body: body(categoryUpdateSchema) },
  responses: { 200: okJson('Updated', categorySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'delete', path: '/admin/categories/{id}', tags: ['Admin / Categories'], security: bearerAuth,
  summary: 'Soft delete (is_active=false)',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Deactivated', categorySchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — treatments (§6)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/treatments', tags: ['Admin / Treatments'], security: bearerAuth,
  request: { query: z.object({ is_active: z.string().optional(), category_id: z.string().uuid().optional(), search: z.string().optional(), sort: z.string().optional(), ...paginationQuerySchema.shape }) },
  responses: { 200: okListJson('All treatments', treatmentSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'post', path: '/admin/treatments', tags: ['Admin / Treatments'], security: bearerAuth,
  request: { body: body(treatmentCreateSchema) },
  responses: { 201: okJson('Created', treatmentSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/treatments/{id}', tags: ['Admin / Treatments'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Treatment', treatmentSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'patch', path: '/admin/treatments/{id}', tags: ['Admin / Treatments'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }), body: body(treatmentUpdateSchema) },
  responses: { 200: okJson('Updated', treatmentSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'delete', path: '/admin/treatments/{id}', tags: ['Admin / Treatments'], security: bearerAuth,
  summary: 'Soft delete (is_active=false)',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Deactivated', treatmentSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — customers (§7)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/customers', tags: ['Admin / Customers'], security: bearerAuth,
  request: { query: z.object({ search: z.string().optional(), source: z.string().optional(), has_pending: z.string().optional(), sort: z.string().optional(), ...paginationQuerySchema.shape }) },
  responses: { 200: okListJson('Customers (customer_summary view)', customerSummarySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/customers/{id}', tags: ['Admin / Customers'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Customer summary + recent bookings', customerSummarySchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'patch', path: '/admin/customers/{id}', tags: ['Admin / Customers'], security: bearerAuth,
  summary: 'phone_number is intentionally not editable — it is the dedupe key',
  request: { params: z.object({ id: z.string().uuid() }), body: body(customerUpdateSchema) },
  responses: { 200: okJson('Updated', customerSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — booking requests (§8.3-8.5)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/booking-requests', tags: ['Admin / Booking Requests'], security: bearerAuth,
  request: {
    query: z.object({
      status: z.array(z.string()).optional(),
      treatment_id: z.string().uuid().optional(),
      category_id: z.string().uuid().optional(),
      customer_id: z.string().uuid().optional(),
      channel: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      created_from: z.string().optional(),
      created_to: z.string().optional(),
      search: z.string().optional(),
      sort: z.string().optional(),
      ...paginationQuerySchema.shape,
    }),
  },
  responses: { 200: okListJson('Booking requests', bookingRequestSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/booking-requests/{id}', tags: ['Admin / Booking Requests'], security: bearerAuth,
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: okJson('Booking request + audit_trail', bookingRequestSchema.extend({ audit_trail: z.array(auditLogSchema) })),
    ...commonErrorResponses,
  },
});
registry.registerPath({
  method: 'patch', path: '/admin/booking-requests/{id}', tags: ['Admin / Booking Requests'], security: bearerAuth,
  summary: 'Status transitions enforced server-side; invalid transitions return 409. cancellation_reason required when status=cancelled.',
  request: { params: z.object({ id: z.string().uuid() }), body: body(bookingRequestUpdateSchema) },
  responses: { 200: okJson('Updated', bookingRequestSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — audit logs (§10) & dashboard (§11)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/audit-logs', tags: ['Admin / Audit Logs'], security: bearerAuth,
  summary: 'Read-only — rows are written only by the log_booking_status_change DB trigger',
  request: {
    query: z.object({
      booking_request_id: z.string().uuid().optional(),
      user_id: z.string().uuid().optional(),
      action: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      ...paginationQuerySchema.shape,
    }),
  },
  responses: { 200: okListJson('Audit log entries', auditLogSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/dashboard/summary', tags: ['Admin / Dashboard'], security: bearerAuth,
  request: { query: z.object({ date_from: z.string().optional(), date_to: z.string().optional() }) },
  responses: { 200: okJson('Daily requests summary (daily_requests_summary view)', z.array(dailySummarySchema)), ...commonErrorResponses },
});
registry.registerPath({
  method: 'get', path: '/admin/dashboard/stats', tags: ['Admin / Dashboard'], security: bearerAuth,
  responses: { 200: okJson('Point-in-time KPIs', dashboardStatsSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — me (any authenticated staff member)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/me', tags: ['Admin / Me'], security: bearerAuth,
  summary: "The signed-in staff member's own record, including role — lets the frontend gate admin-only UI (e.g. User Management) without guessing from Clerk metadata.",
  responses: { 200: okJson('Current staff member', staffSchema), ...commonErrorResponses },
});

// ------------------------------------------------------------
// Admin — staff (§9, admin role only)
// ------------------------------------------------------------

registry.registerPath({
  method: 'get', path: '/admin/staff', tags: ['Admin / Staff'], security: bearerAuth,
  summary: 'Admin role required',
  request: { query: z.object({ is_active: z.string().optional(), role: z.string().optional() }) },
  responses: { 200: okListJson('Staff', staffSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'post', path: '/admin/staff/invite', tags: ['Admin / Staff'], security: bearerAuth,
  summary: 'Admin role required. Sends a Clerk invitation; the staff row is created by the user.created webhook once accepted. If a pending invitation for this email already exists it is revoked and re-sent (reinvited=true).',
  request: { body: body(staffInviteSchema) },
  responses: {
    202: { description: 'Invitation sent', content: json(successEnvelope(z.object({ invitation_status: z.literal('pending'), email: z.string().email(), reinvited: z.boolean() }))) },
    ...commonErrorResponses,
  },
});
registry.registerPath({
  method: 'patch', path: '/admin/staff/{id}', tags: ['Admin / Staff'], security: bearerAuth,
  summary: 'Admin role required. Role changes sync back to Clerk public_metadata.',
  request: { params: z.object({ id: z.string().uuid() }), body: body(staffUpdateSchema) },
  responses: { 200: okJson('Updated', staffSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'delete', path: '/admin/staff/{id}', tags: ['Admin / Staff'], security: bearerAuth,
  summary: 'Admin role required. Soft delete + revokes active Clerk sessions.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: okJson('Deactivated', staffSchema), ...commonErrorResponses },
});
registry.registerPath({
  method: 'delete', path: '/admin/staff/{id}/permanent', tags: ['Admin / Staff'], security: bearerAuth,
  summary: 'Admin role required. HARD delete — removes the linked Clerk user and the local staff row for good. Irreversible; cannot target your own account.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: okJson('Permanently deleted', z.object({ id: z.string().uuid(), deleted: z.literal(true) })),
    ...commonErrorResponses,
  },
});
