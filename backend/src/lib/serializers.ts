import type { Category, Treatment, AuditLog, Customer, CustomerSummary, DailyRequestsSummary } from '@prisma/client';

/** BigInt (from view COUNT() columns) doesn't survive JSON.stringify/res.json
 * as-is — it throws "Do not know how to serialize a BigInt". Counts here
 * are booking/customer volumes for a single spa, nowhere near
 * Number.MAX_SAFE_INTEGER, so a plain Number conversion is safe. */
function toNumber(value: bigint | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'bigint' ? Number(value) : value;
}

export function serializeCategory(c: Category) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    cover_image_url: c.coverImageUrl,
    is_active: c.isActive,
    display_order: c.displayOrder,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

type TreatmentWithCategory = Treatment & { category?: Category | null };

/** Public-facing shape (§6 list/detail) — deliberately omits is_active,
 * display_order, created_at, updated_at, which are admin-only fields. */
export function serializePublicTreatment(t: TreatmentWithCategory) {
  return {
    id: t.id,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    name: t.name,
    description: t.description,
    duration_minutes: t.durationMinutes,
    price: t.price.toFixed(2),
    image_url: t.imageUrl,
    benefits: t.benefits,
    recommended_for: t.recommendedFor,
  };
}

export function serializeTreatment(t: TreatmentWithCategory) {
  return {
    id: t.id,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    name: t.name,
    description: t.description,
    duration_minutes: t.durationMinutes,
    price: t.price.toFixed(2),
    image_url: t.imageUrl,
    benefits: t.benefits,
    recommended_for: t.recommendedFor,
    is_active: t.isActive,
    display_order: t.displayOrder,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function serializeCustomer(c: Customer) {
  return {
    id: c.id,
    full_name: c.fullName,
    phone_number: c.phoneNumber,
    whatsapp_number: c.whatsappNumber,
    email: c.email,
    source: c.source,
    customer_since: c.customerSince,
    notes: c.notes,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export function serializeCustomerSummary(c: CustomerSummary) {
  return {
    id: c.id,
    full_name: c.fullName,
    phone_number: c.phoneNumber,
    whatsapp_number: c.whatsappNumber,
    source: c.source,
    customer_since: c.customerSince,
    total_requests: toNumber(c.totalRequests),
    total_visits: toNumber(c.totalVisits),
    last_visit_date: c.lastVisitDate,
    most_recent_treatment: c.mostRecentTreatment,
    pending_requests: toNumber(c.pendingRequests),
    last_activity: c.lastActivity,
  };
}

export function serializeAuditLog(a: AuditLog) {
  return {
    id: a.id,
    booking_request_id: a.bookingRequestId,
    user_id: a.userId,
    action: a.action,
    old_status: a.oldStatus,
    new_status: a.newStatus,
    notes: a.notes,
    ip_address: a.ipAddress,
    user_agent: a.userAgent,
    created_at: a.createdAt,
  };
}

export function serializeDailySummary(d: DailyRequestsSummary) {
  return {
    request_date: d.requestDate,
    total_requests: toNumber(d.totalRequests),
    new_requests: toNumber(d.newRequests),
    contacted: toNumber(d.contacted),
    confirmed: toNumber(d.confirmed),
    completed: toNumber(d.completed),
    cancelled: toNumber(d.cancelled),
    no_show: toNumber(d.noShow),
  };
}
