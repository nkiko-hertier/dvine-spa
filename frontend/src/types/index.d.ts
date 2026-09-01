/**
 * All TypeScript types for the D'vine Spa API.
 *
 * Mirrors backend/prisma/schema.prisma (enums, entities) and
 * backend/src/lib/serializers.ts (exact response field shapes) 1:1.
 * If a backend serializer changes, update the matching type here.
 *
 * Field naming: the API is snake_case end-to-end (see
 * backend/src/schemas/index.ts), so these types are snake_case too —
 * don't camelCase them, that would silently break the contract.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "new_request"
  | "contacted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type CustomerSource =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "google"
  | "website"
  | "referral"
  | "hotel"
  | "corporate"
  | "walk_in"
  | "other";

export type UserRole = "admin" | "staff";

// ---------------------------------------------------------------------------
// Response envelopes (backend/src/lib/response.ts, backend/src/lib/errors.ts)
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiListSuccess<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

// ---------------------------------------------------------------------------
// Category (backend/src/lib/serializers.ts -> serializeCategory)
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Public GET /categories — active only, admin-only fields omitted.
 * GET /categories/:id returns the same shape minus `treatment_count`.
 */
export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  display_order: number;
  treatment_count: number;
}

export interface CategoryCreateInput {
  name: string;
  description?: string;
  cover_image_url?: string;
  display_order?: number;
}

export type CategoryUpdateInput = Partial<CategoryCreateInput> & {
  is_active?: boolean;
};

// ---------------------------------------------------------------------------
// Treatment (backend/src/lib/serializers.ts -> serializeTreatment / serializePublicTreatment)
// ---------------------------------------------------------------------------

export interface TreatmentCategoryRef {
  id: string;
  name: string;
}

/** Admin shape — includes is_active/display_order/timestamps. */
export interface Treatment {
  id: string;
  category: TreatmentCategoryRef | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string; // serialized via price.toFixed(2), e.g. "45.00"
  image_url: string | null;
  benefits: string[];
  recommended_for: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Public shape — deliberately omits admin-only fields. */
export interface PublicTreatment {
  id: string;
  category: TreatmentCategoryRef | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: string;
  image_url: string | null;
  benefits: string[];
  recommended_for: string[];
}

export interface TreatmentCreateInput {
  category_id?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  image_url?: string;
  benefits?: string[];
  recommended_for?: string[];
  display_order?: number;
}

export type TreatmentUpdateInput = Partial<TreatmentCreateInput> & {
  is_active?: boolean;
};

// ---------------------------------------------------------------------------
// Customer (backend/src/lib/serializers.ts -> serializeCustomer / serializeCustomerSummary)
// ---------------------------------------------------------------------------

export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string | null;
  email: string | null;
  source: CustomerSource | null;
  customer_since: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /admin/customers list item — backed by the customer_summary view. */
export interface CustomerSummary {
  id: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string | null;
  source: CustomerSource | null;
  customer_since: string;
  total_requests: number | null;
  total_visits: number | null;
  last_visit_date: string | null;
  most_recent_treatment: string | null;
  pending_requests: number | null;
  last_activity: string | null;
}

export interface CustomerRecentBooking {
  id: string;
  request_reference: string | null;
  treatment_id: string;
  treatment_name: string;
  preferred_date: string;
  status: BookingStatus;
}

/** The treatment this customer books most often, across all of their
 * requests (not just the 10 shown in recent_bookings). Powers the
 * "Add Appointment" shortcut's pre-filled service. Null for a
 * customer with no booking history yet. */
export interface MostCommonTreatment {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
  times_booked: number;
}

/** GET /admin/customers/:id — summary + notes + last 10 bookings. */
export interface CustomerDetail extends CustomerSummary {
  notes: string | null;
  email: string | null;
  most_common_treatment: MostCommonTreatment | null;
  recent_bookings: CustomerRecentBooking[];
}

export interface CustomerUpdateInput {
  full_name?: string;
  whatsapp_number?: string;
  source?: CustomerSource;
  notes?: string;
  // phone_number is intentionally not editable — it's the dedupe key.
}

// ---------------------------------------------------------------------------
// Booking request (backend/src/routes/admin/bookingRequests.ts -> serializeBookingRequest)
// ---------------------------------------------------------------------------

export interface BookingRequestCustomerRef {
  id: string;
  full_name: string;
  phone_number: string;
  whatsapp_number: string | null;
  email: string | null;
  /** Total booking requests this customer has ever made (including this one). */
  total_requests: number;
  /** "repeating" once total_requests > 1 — same definition used by the
   * client_type filter on /admin/booking-requests and /admin/customers. */
  client_type: "new" | "repeating";
}

export interface BookingRequestTreatmentRef {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
  category_name: string | null;
}

export interface BookingRequest {
  id: string;
  request_reference: string | null;
  status: BookingStatus;
  customer: BookingRequestCustomerRef;
  treatment: BookingRequestTreatmentRef;
  preferred_date: string;
  preferred_time: string;
  confirmed_date: string | null;
  confirmed_time: string | null;
  channel: CustomerSource;
  /** Derived: "from_us" = customer has no source (staff-entered in the
   * dashboard); "from_pixelspring" = has a source (public booking site). */
  origin: BookingOrigin;
  staff_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export type BookingOrigin = "from_us" | "from_pixelspring";

/** GET /admin/booking-requests/:id adds the last 10 audit_logs rows. */
export interface BookingRequestDetail extends BookingRequest {
  audit_trail: AuditLog[];
}

/** POST /booking-requests — public, no auth. */
export interface BookingRequestCreateInput {
  full_name: string;
  phone_number: string;
  whatsapp_number?: string;
  email?: string;
  source?: CustomerSource;
  treatment_id: string;
  preferred_date: string; // ISO date string, e.g. "2026-09-01"
  preferred_time: string; // "HH:MM", 24h
  channel?: CustomerSource;
  notes?: string;
}

/** PATCH /admin/booking-requests/:id — status transitions are validated server-side. */
export interface BookingRequestUpdateInput {
  status?: BookingStatus;
  confirmed_date?: string;
  confirmed_time?: string; // "HH:MM"
  staff_notes?: string;
  /** Required by the backend when status is "cancelled". */
  cancellation_reason?: string;
}

export interface BookingRequestLookupInput {
  reference: string;
  phone_number: string;
}

/** GET /booking-requests/lookup and /booking-requests/easy-lookup — same shape. */
export interface BookingRequestLookupResult {
  request_reference: string | null;
  status: BookingStatus;
  treatment_name: string;
  confirmed_date: string | null;
  confirmed_time: string | null;
}

/**
 * GET /booking-requests/:id/confirmation — public, no auth. Only resolves
 * for completed bookings; this is what the QR code on the downloaded PDF
 * confirmation links to (frontend route /booking-confirmation/:id).
 */
export interface BookingConfirmationPublic {
  id: string;
  request_reference: string | null;
  status: BookingStatus;
  customer_name: string;
  treatment_name: string;
  category_name: string | null;
  duration_minutes: number;
  confirmed_date: string | null;
  confirmed_time: string | null;
  completed_at: string | null;
}

/** POST /booking-requests response — leaner than the admin BookingRequest shape. */
export interface BookingRequestCreateResult {
  id: string;
  request_reference: string | null;
  status: BookingStatus;
  treatment: {
    id: string;
    name: string;
    price: string;
    duration_minutes: number;
  };
  preferred_date: string;
  preferred_time: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Staff (backend/src/routes/admin/staff.ts -> serializeStaff)
// ---------------------------------------------------------------------------

export interface Staff {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface StaffInviteInput {
  email: string;
  full_name: string;
  role?: UserRole; // defaults to "staff" server-side
}

export interface StaffInviteResult {
  invitation_status: "pending";
  email: string;
  /** true when a prior pending invitation was revoked and re-sent. */
  reinvited: boolean;
}

export interface StaffUpdateInput {
  role?: UserRole;
  is_active?: boolean;
  phone_number?: string;
}

/** GET /admin/me — the signed-in staff member's own record. Used to
 * gate role-restricted UI (e.g. the User Management page/nav item). */
export interface CurrentStaff {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Audit log (backend/src/lib/serializers.ts -> serializeAuditLog)
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  booking_request_id: string | null;
  user_id: string | null;
  action: string;
  old_status: BookingStatus | null;
  new_status: BookingStatus | null;
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Dashboard (backend/src/routes/admin/dashboard.ts)
// ---------------------------------------------------------------------------

/** One row per day, GET /admin/dashboard/summary. */
export interface DailyRequestsSummary {
  request_date: string;
  total_requests: number;
  new_requests: number;
  contacted: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface TopTreatment {
  id: string;
  name: string;
  bookings: number;
}

/** GET /admin/dashboard/stats — point-in-time KPIs. */
export interface DashboardStats {
  pending_requests: number;
  todays_bookings: number;
  this_week_confirmed: number;
  this_month_completed: number;
  top_treatment_30d: TopTreatment | null;
  new_customers_30d: number;
}

// ---------------------------------------------------------------------------
// List query params — what you pass as axios's `{ params }` for each
// GET-list endpoint. See docs/API_USAGE.md §5 for how these are used.
// ---------------------------------------------------------------------------

/** Every list endpoint accepts these (backend/src/lib/response.ts -> parsePagination). */
export interface PaginationParams {
  /** Default 1. */
  page?: number;
  /** Default 20, max 100. */
  limit?: number;
}

export interface CategoryListParams extends PaginationParams {
  is_active?: boolean;
  search?: string;
  /** "field" ascending, "-field" descending. Allowed: display_order | name | created_at */
  sort?: string;
}

export interface TreatmentListParams extends PaginationParams {
  is_active?: boolean;
  category_id?: string;
  search?: string;
  /** Allowed: display_order | name | price | duration_minutes | created_at */
  sort?: string;
}

/** Public GET /treatments — active-only, extra price/duration filters. */
export interface PublicTreatmentListParams extends PaginationParams {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  min_duration?: number;
  max_duration?: number;
  sort?: string;
}

export interface CustomerListParams extends PaginationParams {
  search?: string;
  source?: CustomerSource;
  has_pending?: boolean;
  /** "repeating" = more than one booking request on file. */
  client_type?: "new" | "repeating";
  /** Allowed: customer_since | full_name | last_activity */
  sort?: string;
}

export interface BookingRequestListParams extends PaginationParams {
  /** Repeatable — pass an array to filter by multiple statuses at once. */
  status?: BookingStatus | BookingStatus[];
  treatment_id?: string;
  category_id?: string;
  customer_id?: string;
  channel?: CustomerSource;
  /** "repeating" = more than one booking request on file for that customer. */
  client_type?: "new" | "repeating";
  /** "from_us" = customer has no source (dashboard-entered); "from_pixelspring" = has a source. */
  origin?: BookingOrigin;
  /** ISO date, e.g. "2026-09-01" — filters on preferred_date. */
  date_from?: string;
  date_to?: string;
  /** ISO date — filters on created_at. */
  created_from?: string;
  created_to?: string;
  search?: string;
  /** Allowed: created_at | preferred_date | status */
  sort?: string;
}

export interface StaffListParams extends PaginationParams {
  is_active?: boolean;
  role?: UserRole;
}

export interface AuditLogListParams extends PaginationParams {
  booking_request_id?: string;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}

export interface DashboardSummaryParams {
  /** Both default to a 30-day trailing window if omitted. */
  date_from?: string;
  date_to?: string;
}