/**
 * React Query hooks for every endpoint in ENDPOINTS.
 *
 * One hook per operation, named after what it does (useCustomers,
 * useUpdateCustomer, ...). Every hook:
 *  - builds its URL from ENDPOINTS (src/lib/endpoints.ts) — never a
 *    hardcoded path
 *  - types its params/body/response from types.ts (src/lib/types.ts)
 *  - goes through apiClient (src/lib/apiClient.ts), which attaches the
 *    Clerk session token automatically — nothing here touches auth
 *  - invalidates the right query keys after a mutation so lists refetch
 *
 * Query key convention:
 *   list:   [domain, resource, "list", params]
 *   detail: [domain, resource, "detail", id]
 * A mutation invalidates the resource's "list" prefix (React Query
 * matches prefixes, so ["admin","customers","list"] invalidates every
 * ["admin","customers","list", params] variant) and, when it targets one
 * record, that record's "detail" key too.
 *
 * See docs/API_USAGE.md for the full write-up (query params, auth, etc).
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import { connectDashboardSocket, getDashboardSocket } from "./socket";
import type {
  ApiSuccess,
  ApiListSuccess,
  Category,
  PublicCategory,
  CategoryListParams,
  CategoryCreateInput,
  CategoryUpdateInput,
  Treatment,
  PublicTreatment,
  TreatmentListParams,
  PublicTreatmentListParams,
  TreatmentCreateInput,
  TreatmentUpdateInput,
  CustomerSummary,
  CustomerDetail,
  CustomerListParams,
  CustomerUpdateInput,
  BookingRequest,
  BookingRequestDetail,
  BookingRequestListParams,
  BookingStatus,
  BookingRequestCreateInput,
  BookingRequestCreateResult,
  BookingRequestUpdateInput,
  BookingRequestLookupInput,
  BookingRequestLookupResult,
  BookingConfirmationPublic,
  Staff,
  StaffListParams,
  StaffInviteInput,
  StaffInviteResult,
  StaffUpdateInput,
  CurrentStaff,
  AuditLog,
  AuditLogListParams,
  DailyRequestsSummary,
  DashboardStats,
  DashboardSummaryParams,
} from "../types";

// A couple of query options callers might reasonably want to override
// (e.g. `enabled`), without letting them override queryKey/queryFn.
type ExtraQueryOptions<T> = Omit<
  UseQueryOptions<T>,
  "queryKey" | "queryFn"
>;

// =============================================================================
// PUBLIC — categories
// =============================================================================

/** GET /categories — public, active only. */
export function usePublicCategories(options?: ExtraQueryOptions<PublicCategory[]>) {
  return useQuery({
    queryKey: ["public", "categories", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<PublicCategory[]>>(
        ENDPOINTS.public.categories.getAllCategories()
      );
      return data.data;
    },
    ...options,
  });
}

/** GET /categories/:id — public, active only. */
export function usePublicCategory(id: string, options?: ExtraQueryOptions<PublicCategory>) {
  return useQuery({
    queryKey: ["public", "categories", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<PublicCategory>>(
        ENDPOINTS.public.categories.getCategoryById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

/** GET /categories/:id/treatments — public shortcut for treatments filtered by category. */
export function usePublicCategoryTreatments(
  categoryId: string,
  options?: ExtraQueryOptions<PublicTreatment[]>
) {
  return useQuery({
    queryKey: ["public", "categories", "detail", categoryId, "treatments"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<PublicTreatment[]>>(
        ENDPOINTS.public.categories.getTreatmentsByCategoryId(categoryId)
      );
      return data.data;
    },
    enabled: !!categoryId,
    ...options,
  });
}

// =============================================================================
// PUBLIC — treatments
// =============================================================================

/** GET /treatments — public, active only, paginated. */
export function usePublicTreatments(
  params: PublicTreatmentListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<PublicTreatment>>
) {
  return useQuery({
    queryKey: ["public", "treatments", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<PublicTreatment>>(
        ENDPOINTS.public.treatments.getAllTreatments(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

/** GET /treatments/:id — public, active only. */
export function usePublicTreatment(id: string, options?: ExtraQueryOptions<PublicTreatment>) {
  return useQuery({
    queryKey: ["public", "treatments", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<PublicTreatment>>(
        ENDPOINTS.public.treatments.getTreatmentById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

// =============================================================================
// PUBLIC — booking requests (create + lookup; no auth, so no invalidation
// against admin's cached data — the admin side just refetches on its own
// polling/interval or next visit)
// =============================================================================

/** POST /booking-requests — public. Supports an idempotency key so a
 * double-submit (e.g. a retried network request) doesn't create two
 * bookings; pass the same key again to get the original response back. */
export function useCreateBookingRequest() {
  return useMutation({
    mutationFn: async (input: {
      body: BookingRequestCreateInput;
      idempotencyKey?: string;
    }) => {
      const { data } = await apiClient.post<ApiSuccess<BookingRequestCreateResult>>(
        ENDPOINTS.public.bookingRequests.createBookingRequest(),
        input.body,
        input.idempotencyKey
          ? { headers: { "Idempotency-Key": input.idempotencyKey } }
          : undefined
      );
      return data.data;
    },
  });
}

/**
 * GET /booking-requests/lookup — public. Modeled as a mutation (not a
 * query) because it's an on-demand "look this up" action from a form
 * submit, not data you'd want auto-cached/refetched in the background.
 */
export function useLookupBookingRequest() {
  return useMutation({
    mutationFn: async (params: BookingRequestLookupInput) => {
      const { data } = await apiClient.get<ApiSuccess<BookingRequestLookupResult>>(
        ENDPOINTS.public.bookingRequests.lookupBookingRequest(),
        { params }
      );
      return data.data;
    },
  });
}

/** GET /booking-requests/easy-lookup — public. Same shape/usage as above. */
export function useEasyLookupBookingRequest() {
  return useMutation({
    mutationFn: async (params: BookingRequestLookupInput) => {
      const { data } = await apiClient.get<ApiSuccess<BookingRequestLookupResult>>(
        ENDPOINTS.public.bookingRequests.easyLookupBookingRequest(),
        { params }
      );
      return data.data;
    },
  });
}

/**
 * GET /booking-requests/:id/confirmation — public. Powers the
 * /booking-confirmation/:id page that a completed booking's downloaded
 * PDF QR code links to. Only resolves for completed bookings — 404s
 * otherwise, which the page treats as "not available".
 */
export function useBookingConfirmation(
  id: string | undefined,
  options?: ExtraQueryOptions<BookingConfirmationPublic>
) {
  return useQuery({
    queryKey: ["public", "bookingRequests", "confirmation", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<BookingConfirmationPublic>>(
        ENDPOINTS.public.bookingRequests.getBookingConfirmation(id as string)
      );
      return data.data;
    },
    enabled: !!id && (options?.enabled ?? true),
    retry: false,
    ...options,
  });
}

// =============================================================================
// ADMIN — current staff identity (who am I / what can I do)
// =============================================================================

/**
 * GET /admin/me — resolves the signed-in Clerk session to its local
 * staff row, including `role`. This is what the UI (Sidebar's "User
 * Management" link, the /dashboard/users route guard) reads to decide
 * what to show — the backend's requireRole() checks are the real
 * enforcement, this just avoids flashing admin-only controls at staff
 * who'll get a 403 the moment they click.
 */
export function useCurrentStaff(options?: ExtraQueryOptions<CurrentStaff>) {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<CurrentStaff>>(
        ENDPOINTS.admin.me.getMe()
      );
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// =============================================================================
// ADMIN — dashboard
// =============================================================================

/** GET /admin/dashboard/summary — daily rollups, 30-day window by default. */
export function useDashboardSummary(
  params: DashboardSummaryParams = {},
  options?: ExtraQueryOptions<DailyRequestsSummary[]>
) {
  return useQuery({
    queryKey: ["admin", "dashboard", "summary", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<DailyRequestsSummary[]>>(
        ENDPOINTS.admin.dashboard.getSummary(),
        { params }
      );
      return data.data;
    },
    ...options,
  });
}

/** GET /admin/dashboard/stats — point-in-time KPIs. */
export function useDashboardStats(options?: ExtraQueryOptions<DashboardStats>) {
  return useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<DashboardStats>>(
        ENDPOINTS.admin.dashboard.getStats()
      );
      return data.data;
    },
    ...options,
  });
}

// =============================================================================
// ADMIN — categories
// =============================================================================

export function useAdminCategories(
  params: CategoryListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<Category>>
) {
  return useQuery({
    queryKey: ["admin", "categories", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<Category>>(
        ENDPOINTS.admin.categories.getAllCategories(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

export function useAdminCategory(id: string, options?: ExtraQueryOptions<Category>) {
  return useQuery({
    queryKey: ["admin", "categories", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<Category>>(
        ENDPOINTS.admin.categories.getCategoryById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CategoryCreateInput) => {
      const { data } = await apiClient.post<ApiSuccess<Category>>(
        ENDPOINTS.admin.categories.createCategory(),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories", "list"] });
    },
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CategoryUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<Category>>(
        ENDPOINTS.admin.categories.updateCategoryById(id),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories", "detail", id] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ENDPOINTS.admin.categories.deleteCategoryById(id));
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories", "list"] });
      queryClient.removeQueries({ queryKey: ["admin", "categories", "detail", id] });
    },
  });
}

// =============================================================================
// ADMIN — treatments
// =============================================================================

export function useAdminTreatments(
  params: TreatmentListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<Treatment>>
) {
  return useQuery({
    queryKey: ["admin", "treatments", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<Treatment>>(
        ENDPOINTS.admin.treatments.getAllTreatments(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

export function useAdminTreatment(id: string, options?: ExtraQueryOptions<Treatment>) {
  return useQuery({
    queryKey: ["admin", "treatments", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<Treatment>>(
        ENDPOINTS.admin.treatments.getTreatmentById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

export function useCreateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TreatmentCreateInput) => {
      const { data } = await apiClient.post<ApiSuccess<Treatment>>(
        ENDPOINTS.admin.treatments.createTreatment(),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "treatments", "list"] });
    },
  });
}

export function useUpdateTreatment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: TreatmentUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<Treatment>>(
        ENDPOINTS.admin.treatments.updateTreatmentById(id),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "treatments", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "treatments", "detail", id] });
    },
  });
}

export function useDeleteTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(ENDPOINTS.admin.treatments.deleteTreatmentById(id));
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "treatments", "list"] });
      queryClient.removeQueries({ queryKey: ["admin", "treatments", "detail", id] });
    },
  });
}

// =============================================================================
// ADMIN — customers (no create/delete route — customers are created
// implicitly by a public booking request, and only updated/read here)
// =============================================================================

export function useAdminCustomers(
  params: CustomerListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<CustomerSummary>>
) {
  return useQuery({
    queryKey: ["admin", "customers", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<CustomerSummary>>(
        ENDPOINTS.admin.customers.getAllCustomers(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

/** GET /admin/customers/:id — summary + notes + last 10 bookings. */
export function useAdminCustomer(id: string, options?: ExtraQueryOptions<CustomerDetail>) {
  return useQuery({
    queryKey: ["admin", "customers", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<CustomerDetail>>(
        ENDPOINTS.admin.customers.getCustomerById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

/** PATCH /admin/customers/:id — phone_number isn't editable (dedupe key). */
export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CustomerUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<CustomerSummary>>(
        ENDPOINTS.admin.customers.updateCustomerById(id),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "detail", id] });
    },
  });
}

// =============================================================================
// ADMIN — booking requests (no create/delete — created publicly, status
// moves through a fixed state machine via PATCH only)
// =============================================================================

export function useAdminBookingRequests(
  params: BookingRequestListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<BookingRequest>>
) {
  return useQuery({
    queryKey: ["admin", "bookingRequests", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<BookingRequest>>(
        ENDPOINTS.admin.bookingRequests.getAllBookingRequests(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

/** GET /admin/booking-requests/:id — full detail + last 10 audit_logs entries. */
export function useAdminBookingRequest(
  id: string,
  options?: ExtraQueryOptions<BookingRequestDetail>
) {
  return useQuery({
    queryKey: ["admin", "bookingRequests", "detail", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiSuccess<BookingRequestDetail>>(
        ENDPOINTS.admin.bookingRequests.getBookingRequestById(id)
      );
      return data.data;
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * PATCH /admin/booking-requests/:id — moves status through the pipeline
 * (new_request -> contacted -> confirmed -> completed, or -> cancelled /
 * no_show). `cancellation_reason` is required by the backend when
 * `status` is "cancelled" — TypeScript won't catch that for you, the
 * server will reject the request if it's missing.
 * Also invalidates dashboard stats, since status changes move its counts.
 */
export function useUpdateBookingRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BookingRequestUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<BookingRequestDetail>>(
        ENDPOINTS.admin.bookingRequests.updateBookingRequestById(id),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      // A status change can also affect the customer's pending/visit counts.
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "list"] });
      // Keep the notification panel's tracked-status list (defined below) in sync too.
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

// =============================================================================
// ADMIN — realtime notification panel
// =============================================================================

/**
 * Statuses the notification bell tracks by default — the booking requests
 * that still need staff attention (submitted, being contacted, or
 * confirmed but not yet completed). Terminal states (completed, cancelled,
 * no_show) are deliberately excluded.
 */
export const NOTIFICATION_TRACKED_STATUSES: BookingStatus[] = [
  "new_request",
];

const NOTIFICATIONS_QUERY_KEY = ["admin", "bookingRequests", "list", "notifications"] as const;

/**
 * GET /admin/booking-requests filtered to NOTIFICATION_TRACKED_STATUSES,
 * newest first. This is the data source for the notification panel — kept
 * fresh by useRealtimeNotifications() invalidating this exact query key
 * whenever the backend's Socket.IO bridge reports a relevant change,
 * rather than trying to hand-merge partial socket payloads (which don't
 * carry customer/treatment names) into local state.
 */
export function useAdminPendingNotifications(
  options?: ExtraQueryOptions<ApiListSuccess<BookingRequest>>
) {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<BookingRequest>>(
        ENDPOINTS.admin.bookingRequests.getAllBookingRequests(),
        { params: { status: NOTIFICATION_TRACKED_STATUSES, sort: "-created_at", limit: 20 } }
      );
      return data;
    },
    ...options,
  });
}

/**
 * Connects to the dashboard's Socket.IO feed (backend/src/realtime/socket.ts)
 * and keeps booking-related queries live:
 *  - `booking:updated` fires on every INSERT/UPDATE to booking_requests
 *    (new submissions and status/reschedule changes alike).
 *  - `notification:new` fires for the lighter "toast" events (new
 *    requests, cancellations, no-shows).
 * Both just trigger a targeted refetch — the payloads are partial (no
 * customer/treatment names), so re-fetching via REST is what keeps the
 * notification panel and booking lists showing complete, accurate data.
 * Returns the live connection status so callers can show a subtle
 * "reconnecting" indicator if they want one.
 */
export function useRealtimeNotifications(): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState<boolean>(() => getDashboardSocket().connected);

  useEffect(() => {
    const socket = connectDashboardSocket();

    const invalidateBookingQueries = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin", "bookingRequests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    };

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("booking:updated", invalidateBookingQueries);
    socket.on("notification:new", invalidateBookingQueries);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("booking:updated", invalidateBookingQueries);
      socket.off("notification:new", invalidateBookingQueries);
    };
  }, [queryClient]);

  return { connected };
}

// =============================================================================
// ADMIN — staff (admin role only — the backend enforces this, not the UI)
// =============================================================================

export function useAdminStaff(
  params: StaffListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<Staff>>
) {
  return useQuery({
    queryKey: ["admin", "staff", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<Staff>>(
        ENDPOINTS.admin.staff.getAllStaff(),
        { params }
      );
      return data;
    },
    ...options,
  });
}

/** POST /admin/staff/invite — sends a Clerk invite; no local staff row
 * until the invite is accepted, so there's nothing to invalidate by id. */
export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: StaffInviteInput) => {
      const { data } = await apiClient.post<ApiSuccess<StaffInviteResult>>(
        ENDPOINTS.admin.staff.inviteStaff(),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff", "list"] });
    },
  });
}

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: StaffUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<Staff>>(
        ENDPOINTS.admin.staff.updateStaffById(id),
        body
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff", "list"] });
    },
  });
}

/** DELETE /admin/staff/:id — soft delete (deactivates + revokes Clerk
 * sessions); the backend still returns the updated row, not a 204. */
export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiSuccess<Staff>>(
        ENDPOINTS.admin.staff.deleteStaffById(id)
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff", "list"] });
    },
  });
}

// =============================================================================
// ADMIN — audit logs (read-only; rows are written by a DB trigger, never
// by this API, so there are no mutations here)
// =============================================================================

export function useAdminAuditLogs(
  params: AuditLogListParams = {},
  options?: ExtraQueryOptions<ApiListSuccess<AuditLog>>
) {
  return useQuery({
    queryKey: ["admin", "auditLogs", "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<AuditLog>>(
        ENDPOINTS.admin.auditLogs.getAllAuditLogs(),
        { params }
      );
      return data;
    },
    ...options,
  });
}