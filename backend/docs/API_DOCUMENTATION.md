# D'Vine Spa API Documentation

**Version:** 1.1
**Base URL:** `https://api.dvinespa.com/v1`
**Schema:** `deepseek_sql_20260810_c2dcb2.sql` (v2.0) + `002_clerk_integration_and_fixes.sql` + `003_realtime_notifications.sql`
**Auth provider:** Clerk (dashboard only — public endpoints are unauthenticated)

> **TODO before launch:** this document is the source of truth for now, but it should be backed by a generated **OpenAPI 3.1 spec** (`openapi.yaml`) served at `/docs` via Swagger UI (`swagger-ui-express`) once the routes are implemented. Recommended approach: annotate route handlers with `zod-to-openapi` (if using Zod for validation, which pairs well with the request bodies below) so the spec can't drift from the actual validators, rather than hand-writing YAML separately from this markdown. Track this as a follow-up ticket — don't let the two docs diverge.

---

## 1. Overview

This is a **request-only booking system**: customers submit a booking request from the public site; staff review it in the dashboard and move it through a status pipeline. There is no online payment.

Two audiences, two auth models:

| Audience | Endpoints | Auth |
|---|---|---|
| Public website / booking widget | `/categories`, `/treatments`, `/booking-requests` (create + lookup) | None |
| Staff dashboard | everything under `/admin/*` | Clerk session token (Bearer JWT) |
| Staff dashboard (realtime) | Socket.IO — new/updated bookings, notifications (§12) | Clerk session token at handshake |
| Clerk | `/webhooks/clerk` | Svix signature (not a user session) |

All requests/responses are `application/json; charset=utf-8`. All timestamps are ISO 8601 UTC (`2026-08-10T14:00:00Z`). All IDs are UUIDv4 strings unless noted.

---

## 2. Authentication

### 2.1 Public endpoints
No `Authorization` header required. Rate-limited by IP (see §4.5) since these are open to the internet.

### 2.2 Dashboard endpoints (Clerk)
Every `/admin/*` route requires:

```
Authorization: Bearer <clerk_session_token>
```

The frontend obtains this token from Clerk's client SDK (`getToken()`) and attaches it to every request. The API verifies it server-side — it never trusts a client-supplied user ID.

**Custom claim required:** by default a Clerk session token does not include your app's role. Configure a **Clerk JWT template** named `spa-api` that adds:

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

`role` is either `admin` or `staff`, matching the `user_role` enum, and is set on the Clerk user's `publicMetadata` when the corresponding `staff` row is created (see §3).

### 2.3 Middleware

**Express:**

```js
import { clerkMiddleware, getAuth } from '@clerk/express';

app.use(clerkMiddleware());

function requireAuth(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid session token.' }
    });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    const { sessionClaims } = getAuth(req);
    if (sessionClaims?.role !== role) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Requires ${role} role.` }
      });
    }
    next();
  };
}

app.use('/admin', requireAuth);
app.use('/admin/staff', requireRole('admin'));
```

**Next.js (App Router) — `middleware.ts`:**

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isAdminRoute = createRouteMatcher(['/api/admin(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isAdminRoute(req)) auth().protect();
});

export const config = { matcher: ['/api/:path*'] };
```

Every handler then resolves the local `staff` row via `sessionClaims.sub` (the Clerk user ID) → `staff.clerk_user_id`, so business logic (audit logs, `staff_notes` attribution) uses your own primary key, not Clerk's.

### 2.4 Role matrix

| Action | `staff` | `admin` |
|---|---|---|
| View/update booking requests, customers | ✅ | ✅ |
| Create/edit categories & treatments | ✅ | ✅ |
| View audit logs | ✅ | ✅ |
| Manage staff accounts, change roles | ❌ | ✅ |
| View dashboard analytics | ✅ | ✅ |

---

## 3. Clerk Webhooks

### 3.1 Endpoint

```
POST /webhooks/clerk
```

No Clerk session on this route — it's server-to-server. Authenticity is proven by verifying the **Svix** signature Clerk attaches to every delivery, using `CLERK_WEBHOOK_SECRET`.

### 3.2 Signature verification

```js
import { Webhook } from 'svix';

app.post('/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  let evt;
  try {
    evt = wh.verify(req.body, {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook verification failed.' } });
  }

  // Idempotency: svix-id is the unique event id
  const inserted = await db.query(
    `INSERT INTO webhook_events (provider, event_id, event_type, payload)
     VALUES ('clerk', $1, $2, $3)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    [req.headers['svix-id'], evt.type, evt.data]
  );
  if (inserted.rowCount === 0) return res.status(200).json({ success: true, data: { deduped: true } });

  await handleClerkEvent(evt); // see 3.4
  res.status(200).json({ success: true });
});
```

Always return `200` quickly once the event is durably stored (row inserted), and do slower work (DB writes to `staff`) inside `handleClerkEvent`. Clerk retries on non-2xx, so failures should update `webhook_events.status = 'failed'` and rely on retry rather than throwing past the response.

### 3.3 Events handled

| Event | Action |
|---|---|
| `user.created` | Only acted on if the user was created via an **admin invitation** (see below) — insert/attach a `staff` row with `clerk_user_id`, `email`, `full_name`, `role` from `public_metadata.role`. |
| `user.updated` | Sync `email`, `full_name`, and `role` (if `public_metadata.role` changed) onto the matching `staff` row. |
| `user.deleted` | Set `staff.is_active = false` (never hard-delete — booking requests and audit logs reference staff). |
| `session.created` | Update `staff.last_login = now()` for the matching `clerk_user_id`. |

Staff accounts are **provisioned by an admin**, not self-signup: `POST /admin/staff/invite` calls `clerkClient.invitations.createInvitation({ emailAddress, publicMetadata: { role } })`. Clerk emails the invite; when the user accepts, `user.created` fires and the webhook attaches the pre-set role.

### 3.4 Handler flow

```js
async function handleClerkEvent(evt) {
  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
      const email = email_addresses.find(e => e.id === evt.data.primary_email_address_id)?.email_address;
      await db.query(
        `INSERT INTO staff (clerk_user_id, email, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (clerk_user_id) DO UPDATE
           SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role`,
        [id, email, `${first_name} ${last_name}`.trim(), public_metadata?.role ?? 'staff']
      );
      break;
    }
    case 'user.deleted':
      await db.query(`UPDATE staff SET is_active = false WHERE clerk_user_id = $1`, [evt.data.id]);
      break;
    case 'session.created':
      await db.query(`UPDATE staff SET last_login = now() WHERE clerk_user_id = $1`, [evt.data.user_id]);
      break;
  }
  await db.query(`UPDATE webhook_events SET status = 'processed', processed_at = now() WHERE event_id = $1`, [evt.svix_id]);
}
```

Configure these four events in the Clerk Dashboard → Webhooks, pointed at `POST /webhooks/clerk`.

---

## 4. Conventions

### 4.1 Response envelope

Success:
```json
{ "success": true, "data": { }, "meta": { } }
```
`meta` only appears on list endpoints (pagination — see §4.3).

Error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "preferred_date must be today or later.", "details": [ { "field": "preferred_date", "issue": "past_date" } ] } }
```

### 4.2 Error codes

| HTTP | code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/query failed validation |
| 401 | `UNAUTHORIZED` | Missing/invalid Clerk session |
| 403 | `FORBIDDEN` | Authenticated but role doesn't allow this action |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | e.g. duplicate `phone_number`, invalid status transition |
| 422 | `UNPROCESSABLE` | Well-formed but semantically invalid (e.g. inactive treatment) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

### 4.3 Pagination

List endpoints accept `?page=1&limit=20` (default `page=1`, `limit=20`, max `limit=100`) and return:

```json
"meta": { "page": 1, "limit": 20, "total": 143, "total_pages": 8 }
```

### 4.4 Filtering & sorting

- Filters are plain query params: `?status=new_request&category_id=<uuid>`.
- Multiple values: repeat the param — `?status=new_request&status=contacted` (OR'd within the same field).
- Date ranges: `?date_from=2026-08-01&date_to=2026-08-31` (inclusive, applies to `preferred_date` unless noted).
- Free text: `?search=` — matches name/phone/reference depending on resource (trigram search, case-insensitive, partial match).
- Sorting: `?sort=field` ascending, `?sort=-field` descending. Default is documented per endpoint.

### 4.5 Rate limiting

| Scope | Limit |
|---|---|
| Public endpoints, per IP | 60 req/min |
| `POST /booking-requests`, per IP | 5 req/min |
| `/admin/*`, per authenticated user | 300 req/min |
| `/webhooks/clerk` | not rate-limited (trusted, signature-verified) |

Exceeding a limit returns `429` with a `Retry-After` header.

### 4.6 Idempotency

`POST /booking-requests` accepts an optional `Idempotency-Key` header; replaying the same key within 24h returns the original response instead of creating a duplicate request.

---

## 5. Categories

Maps to `categories`.

### `GET /categories`
Public. Active categories only, ordered by `display_order`.

| Query param | Type | Default | Notes |
|---|---|---|---|
| `is_active` | bool | `true` | Public callers cannot pass `false` |

```json
{
  "success": true,
  "data": [
    {
      "id": "b1e2...",
      "name": "Massage Therapy",
      "description": "Professional massage treatments for relaxation and recovery",
      "cover_image_url": "/images/categories/massage.jpg",
      "display_order": 1,
      "treatment_count": 4
    }
  ]
}
```

### `GET /categories/:id`
Public. 404 if not found or `is_active = false`.

### `GET /categories/:id/treatments`
Public. Shortcut for `GET /treatments?category_id=:id`.

### `GET /admin/categories`
Auth: staff. Same shape, plus `is_active=false` rows, `created_at`, `updated_at`.

| Query param | Type | Notes |
|---|---|---|
| `is_active` | bool | omit to see all |
| `search` | string | matches `name` |
| `sort` | string | `display_order` (default), `name`, `-created_at` |

### `POST /admin/categories`
Auth: staff.

Request body:
```json
{ "name": "Wellness Rituals", "description": "string", "cover_image_url": "string", "display_order": 5 }
```
`name` required, unique. Response `201` with the created row.

### `PATCH /admin/categories/:id`
Auth: staff. Partial update, same fields as create. `422` if the category has active treatments and you set `is_active=false` without `?cascade=true` (which also deactivates its treatments).

### `DELETE /admin/categories/:id`
Auth: staff. Soft delete (`is_active=false`) — categories are never hard-deleted because `treatments.category_id` references them (`ON DELETE SET NULL`, which would orphan treatments otherwise).

---

## 6. Treatments

Maps to `treatments`.

### `GET /treatments`
Public. `is_active=true` only, ordered by `display_order`.

| Query param | Type | Notes |
|---|---|---|
| `category_id` | uuid | filter by category |
| `search` | string | matches `name` (trigram) |
| `min_price` / `max_price` | decimal | inclusive range |
| `min_duration` / `max_duration` | int (minutes) | inclusive range |
| `sort` | string | `display_order` (default), `price`, `-price`, `duration_minutes`, `name` |
| `page` / `limit` | int | pagination |

```json
{
  "success": true,
  "data": [
    {
      "id": "9f3a...",
      "category": { "id": "b1e2...", "name": "Massage Therapy" },
      "name": "Deep Tissue Massage",
      "description": "A deeper massage experience designed to help relieve muscle tension and support relaxation.",
      "duration_minutes": 60,
      "price": "30000.00",
      "image_url": "/images/deep-tissue.jpg",
      "benefits": ["Relieves muscle tension", "Improves circulation", "Reduces stress", "Speeds recovery"],
      "recommended_for": ["Muscle tension", "Physical fatigue", "Regular exercisers", "Deeper pressure seekers"]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 10, "total_pages": 1 }
}
```

### `GET /treatments/:id`
Public. 404 if not found or inactive.

### `GET /admin/treatments`
Auth: staff. Adds `is_active` filter (omit for all), `created_at`/`updated_at` in response.

### `POST /admin/treatments`
Auth: staff.

```json
{
  "category_id": "b1e2...",
  "name": "Bamboo Massage",
  "description": "string",
  "duration_minutes": 60,
  "price": 35000,
  "image_url": "string",
  "benefits": ["string"],
  "recommended_for": ["string"],
  "display_order": 5
}
```
Validation: `duration_minutes > 0`, `price > 0` (enforced at DB via `check_duration_positive`/`check_price_positive` — violations surface as `422`, not a raw `500`).

### `PATCH /admin/treatments/:id`
Auth: staff. Partial update.

### `DELETE /admin/treatments/:id`
Auth: staff. Soft delete (`is_active=false`) — never hard-deleted, since `booking_requests.treatment_id` has `ON DELETE RESTRICT`.

---

## 7. Customers

Maps to `customers`, enriched by the `customer_summary` view.

### `GET /admin/customers`
Auth: staff.

| Query param | Type | Notes |
|---|---|---|
| `search` | string | matches `full_name` or `phone_number` |
| `source` | enum | `instagram`,`facebook`,`tiktok`,`google`,`website`,`referral`,`hotel`,`corporate`,`walk_in`,`other` |
| `has_pending` | bool | only customers with `pending_requests > 0` |
| `sort` | string | `-customer_since` (default), `full_name`, `-last_activity` |
| `page` / `limit` | int | pagination |

```json
{
  "success": true,
  "data": [
    {
      "id": "c4d5...",
      "full_name": "Sarah Mucyo",
      "phone_number": "+250788999999",
      "whatsapp_number": "+250788999999",
      "source": "instagram",
      "customer_since": "2026-01-14T09:12:00Z",
      "total_requests": 2,
      "total_visits": 0,
      "last_visit_date": null,
      "most_recent_treatment": null,
      "pending_requests": 2,
      "last_activity": "2026-08-10T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "total_pages": 1 }
}
```

### `GET /admin/customers/:id`
Auth: staff. Same shape as one list row, plus `notes` and an embedded recent booking history:

```json
{
  "success": true,
  "data": {
    "...": "customer_summary fields",
    "notes": "First-time customer, interested in deep tissue",
    "recent_bookings": [
      { "id": "...", "request_reference": "DV-2026-000001", "treatment_name": "Deep Tissue Massage", "preferred_date": "2026-08-13", "status": "new_request" }
    ]
  }
}
```

### `PATCH /admin/customers/:id`
Auth: staff. Editable: `full_name`, `whatsapp_number`, `source`, `notes`. `phone_number` is intentionally **not** editable here (it's the dedupe key — changing it is a data-integrity operation, expose it via a separate `POST /admin/customers/:id/merge` if ever needed, not covered in v1).

Customers have no public endpoints — they're only created implicitly via `POST /booking-requests` (§8.1).

---

## 8. Booking Requests

Maps to `booking_requests`, enriched by the `booking_request_details` view.

### 8.1 `POST /booking-requests` (public)

Creates a booking request. If `phone_number` matches an existing customer, that customer is reused (`customers.phone_number` is `UNIQUE`); otherwise a new customer row is created first.

Request body:
```json
{
  "full_name": "Sarah Mucyo",
  "phone_number": "+250788999999",
  "whatsapp_number": "+250788999999",
  "source": "instagram",
  "treatment_id": "9f3a...",
  "preferred_date": "2026-08-13",
  "preferred_time": "15:00",
  "channel": "website",
  "notes": "First time, prefers a female therapist if possible"
}
```

| Field | Required | Notes |
|---|---|---|
| `full_name` | ✅ | |
| `phone_number` | ✅ | E.164 format recommended; dedupe key |
| `whatsapp_number` | | defaults to `phone_number` if omitted |
| `source` | | only used the *first* time this phone number is seen — ignored for existing customers |
| `treatment_id` | ✅ | must reference an active treatment |
| `preferred_date` | ✅ | must be today or later |
| `preferred_time` | ✅ | `HH:MM`, 24h |
| `channel` | | defaults `website`; how *this* request came in |
| `notes` | | freeform, stored as the *customer's* `notes` on first creation, not on `booking_requests` (staff-only notes live in `staff_notes`) |

Response `201`:
```json
{
  "success": true,
  "data": {
    "id": "a1b2...",
    "request_reference": "DV-2026-000007",
    "status": "new_request",
    "treatment": { "id": "9f3a...", "name": "Deep Tissue Massage", "price": "30000.00", "duration_minutes": 60 },
    "preferred_date": "2026-08-13",
    "preferred_time": "15:00",
    "created_at": "2026-08-10T08:00:00Z"
  }
}
```

Errors: `404` unknown `treatment_id`, `422` inactive treatment or past `preferred_date`, `409` if an `Idempotency-Key` replay is detected with a *different* body.

### 8.2 `GET /booking-requests/lookup` (public)

Status self-check for a customer, without exposing all bookings by reference alone.

| Query param | Required | Notes |
|---|---|---|
| `reference` | ✅ | e.g. `DV-2026-000007` |
| `phone_number` | ✅ | must match the booking's customer — acts as a shared secret |

```json
{ "success": true, "data": { "request_reference": "DV-2026-000007", "status": "confirmed", "treatment_name": "Deep Tissue Massage", "confirmed_date": "2026-08-13", "confirmed_time": "15:00" } }
```
`404` if the reference doesn't exist or the phone number doesn't match (same response either way, to avoid leaking which references are valid).

### 8.3 `GET /admin/booking-requests`

Auth: staff. Backed by `booking_request_details`.

| Query param | Type | Notes |
|---|---|---|
| `status` | enum (repeatable) | `new_request`,`contacted`,`confirmed`,`completed`,`cancelled`,`no_show` |
| `treatment_id` | uuid | |
| `category_id` | uuid | |
| `customer_id` | uuid | |
| `channel` | enum | same values as `customer_source` |
| `date_from` / `date_to` | date | applies to `preferred_date` |
| `created_from` / `created_to` | datetime | applies to `created_at` |
| `search` | string | matches customer name, phone, or `request_reference` |
| `sort` | string | `-created_at` (default), `preferred_date`, `-preferred_date`, `status` |
| `page` / `limit` | int | pagination |

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2...",
      "request_reference": "DV-2026-000007",
      "status": "new_request",
      "customer": { "id": "c4d5...", "full_name": "Sarah Mucyo", "phone_number": "+250788999999", "whatsapp_number": "+250788999999" },
      "treatment": { "id": "9f3a...", "name": "Deep Tissue Massage", "price": "30000.00", "duration_minutes": 60, "category_name": "Massage Therapy" },
      "preferred_date": "2026-08-13",
      "preferred_time": "15:00",
      "confirmed_date": null,
      "confirmed_time": null,
      "channel": "website",
      "staff_notes": null,
      "created_at": "2026-08-10T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 6, "total_pages": 1 }
}
```

### 8.4 `GET /admin/booking-requests/:id`
Auth: staff. Full detail, plus embedded `audit_trail` (last 10 entries from `audit_logs`).

### 8.5 `PATCH /admin/booking-requests/:id`
Auth: staff. Updates status and/or scheduling fields. `contacted_at`/`confirmed_at`/`completed_at`/`cancelled_at` and the `audit_logs` row are set automatically by DB triggers — do not send them.

```json
{ "status": "confirmed", "confirmed_date": "2026-08-13", "confirmed_time": "15:00", "staff_notes": "Confirmed via phone." }
```

If `status` is `cancelled`, `cancellation_reason` is required in the same request.

**Valid transitions** (enforced at the API layer, on top of the DB trigger that only timestamps changes):

```
new_request → contacted → confirmed → completed
     │             │           │
     └─────────────┴───────────┴──→ cancelled
                    confirmed ──→ no_show
```
Any other transition (e.g. `completed → new_request`) returns `409 CONFLICT`.

There is intentionally **no `DELETE`** on booking requests — cancel via `PATCH { "status": "cancelled" }` instead, so history and audit logs stay intact.

---

## 9. Staff

Maps to `staff`. Admin-only — never exposed publicly.

### `GET /admin/staff`
Auth: admin.

| Query param | Type | Notes |
|---|---|---|
| `is_active` | bool | omit for all |
| `role` | enum | `admin`, `staff` |

```json
{
  "success": true,
  "data": [
    { "id": "s1...", "email": "admin@dvinespa.com", "full_name": "D'Vine Admin", "role": "admin", "is_active": true, "last_login": "2026-08-10T07:45:00Z" }
  ]
}
```
Note: `password_hash` and `clerk_user_id` are never included in API responses.

### `POST /admin/staff/invite`
Auth: admin. Does **not** insert into `staff` directly — it calls Clerk to send an invitation; the `staff` row is created by the webhook once accepted (§3.3).

```json
{ "email": "new.staff@dvinespa.com", "full_name": "New Staff", "role": "staff" }
```
Response `202` (accepted, pending):
```json
{ "success": true, "data": { "invitation_status": "pending", "email": "new.staff@dvinespa.com" } }
```

### `PATCH /admin/staff/:id`
Auth: admin. Editable: `role`, `is_active`, `phone_number`. Changing `role` also updates `public_metadata.role` on the Clerk user via `clerkClient.users.updateUserMetadata`.

### `DELETE /admin/staff/:id`
Auth: admin. Soft delete only (`is_active=false`) — a hard delete would violate `audit_logs.user_id` and `booking_requests` history. Also revokes active Clerk sessions for that user.

---

## 10. Audit Logs

Maps to `audit_logs`. Read-only via the API — rows are written exclusively by the `log_booking_status_change` trigger.

### `GET /admin/audit-logs`
Auth: staff.

| Query param | Type | Notes |
|---|---|---|
| `booking_request_id` | uuid | |
| `user_id` | uuid | staff who made the change (may be `null` for system-generated changes) |
| `action` | string | e.g. `status_change` |
| `date_from` / `date_to` | datetime | applies to `created_at` |
| `page` / `limit` | int | pagination |

```json
{
  "success": true,
  "data": [
    {
      "id": "l1...",
      "booking_request_id": "a1b2...",
      "user_id": "s1...",
      "action": "status_change",
      "old_status": "new_request",
      "new_status": "contacted",
      "notes": "Status updated from new_request to contacted",
      "created_at": "2026-08-09T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2, "total_pages": 1 }
}
```

---

## 11. Dashboard / Analytics

### `GET /admin/dashboard/summary`
Auth: staff. Backed by `daily_requests_summary`.

| Query param | Type | Default |
|---|---|---|
| `date_from` | date | 30 days ago |
| `date_to` | date | today |

```json
{
  "success": true,
  "data": [
    { "request_date": "2026-08-10", "total_requests": 4, "new_requests": 2, "contacted": 1, "confirmed": 1, "completed": 0, "cancelled": 0, "no_show": 0 }
  ]
}
```

### `GET /admin/dashboard/stats`
Auth: staff. Point-in-time KPIs (no filters).

```json
{
  "success": true,
  "data": {
    "pending_requests": 3,
    "todays_bookings": 1,
    "this_week_confirmed": 2,
    "this_month_completed": 12,
    "top_treatment_30d": { "id": "9f3a...", "name": "Deep Tissue Massage", "bookings": 5 },
    "new_customers_30d": 8
  }
}
```

---

## 12. Realtime / WebSocket (dashboard only)

Public endpoints have no realtime channel — only the staff dashboard needs live updates (new requests, status changes, cancellations). Built on **Socket.IO** on top of the same Node process as the REST API, fed by **Postgres `LISTEN/NOTIFY`** so any DB write — from the API, a script, or a future second writer — reaches connected dashboards without extra application code at each call site.

### 12.1 Why LISTEN/NOTIFY instead of emitting from route handlers

The API already relies on DB triggers for `audit_logs` and `request_reference`; the same pattern keeps "what happened" defined once, in the database, instead of duplicated in every handler that touches `booking_requests`. See `003_realtime_notifications.sql` for the triggers.

### 12.2 Connecting

```
wss://api.dvinespa.com/socket.io/?EIO=4&transport=websocket
```

Auth happens at handshake, using the same Clerk session token as REST calls — there is no separate realtime token.

```ts
// dashboard client
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  auth: { token: await getToken() }, // Clerk session token
});

socket.on('connect_error', (err) => {
  if (err.message === 'unauthorized') redirectToSignIn();
});
```

Server-side handshake auth mirrors the REST middleware in §2.3:

```ts
import { Server } from 'socket.io';
import { clerkClient } from '@clerk/express';

const io = new Server(httpServer, {
  cors: { origin: process.env.DASHBOARD_URL, credentials: true },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const { sub, sessionClaims } = await clerkClient.verifyToken(token);
    socket.data.staffId = sub;
    socket.data.role = sessionClaims.role; // 'admin' | 'staff'
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join('dashboard'); // all authenticated staff
});
```

### 12.3 Bridging Postgres → Socket.IO

```ts
import { Client } from 'pg';

const pgListener = new Client({ connectionString: process.env.DATABASE_URL });
await pgListener.connect();
await pgListener.query('LISTEN booking_updates');
await pgListener.query('LISTEN dashboard_notifications');

pgListener.on('notification', (msg) => {
  const payload = JSON.parse(msg.payload!);
  if (msg.channel === 'booking_updates') {
    io.to('dashboard').emit('booking:updated', payload);
  } else if (msg.channel === 'dashboard_notifications') {
    io.to('dashboard').emit('notification:new', payload);
  }
});

// Reconnect the LISTEN client on drop — pg does not auto-resubscribe.
pgListener.on('error', () => setTimeout(() => bootstrapPgListener(), 1000));
```

### 12.4 Events

| Channel (Postgres) | Socket.IO event | Emitted when | Payload |
|---|---|---|---|
| `booking_updates` | `booking:updated` | any insert/update on `booking_requests` | `{ op, id, request_reference, customer_id, treatment_id, status, old_status, preferred_date, preferred_time, updated_at }` |
| `dashboard_notifications` | `notification:new` | new request created | `{ type: "new_booking_request", booking_request_id, request_reference, created_at }` |
| `dashboard_notifications` | `notification:new` | status → `cancelled` or `no_show` | `{ type: "booking_cancelled" \| "booking_no_show", booking_request_id, request_reference, reason }` |

Client-side handling:

```ts
socket.on('booking:updated', (payload) => {
  queryClient.invalidateQueries({ queryKey: ['admin', 'booking-requests'] });
  if (payload.id === currentlyOpenBookingId) {
    queryClient.invalidateQueries({ queryKey: ['admin', 'booking-requests', payload.id] });
  }
});

socket.on('notification:new', (payload) => {
  pushToast(payload);
  incrementNotificationBadge();
});
```

Prefer `invalidateQueries` (re-fetch from the REST API) over trusting the socket payload as the full source of truth — it's a small extra round trip but avoids the dashboard's local cache drifting from Postgres if an event is ever missed.

### 12.5 Reconnection & missed events

Socket.IO buffers nothing server-side across a disconnect by default, so a client that drops for 30s can miss events. On `socket.on('connect', ...)` (including reconnects), always do one `GET /admin/booking-requests?sort=-created_at&limit=20` (or refetch whatever view is open) to resync, treating the socket purely as a "something changed, go refetch" signal rather than a guaranteed delivery stream.

### 12.6 Scaling beyond one instance

Not needed at launch (single Node process). If you later run multiple API instances behind a load balancer, add `@socket.io/redis-adapter` — otherwise a notification received by instance A never reaches sockets connected to instance B:

```ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

Only one instance should run the `pgListener` (or all of them can — `pg_notify` broadcasts to every `LISTEN`ing connection, and the Redis adapter dedupes the resulting Socket.IO emits across instances).

---

## Appendix A — Environment variables

| Variable | Used by |
|---|---|
| `CLERK_SECRET_KEY` | server-side Clerk SDK (verify sessions, manage users/invitations) |
| `CLERK_PUBLISHABLE_KEY` | frontend Clerk SDK |
| `CLERK_WEBHOOK_SECRET` | Svix signature verification on `/webhooks/clerk` |
| `DATABASE_URL` | Postgres connection string (used by both the API and the `pgListener` realtime bridge) |
| `REDIS_URL` | only if scaling to >1 API instance (§12.6) |

## Appendix B — Database changes in this revision

See `002_clerk_integration_and_fixes.sql` and `003_realtime_notifications.sql` for the full migrations. Summary:

1. **`staff.clerk_user_id`** added (unique) — links a Clerk identity to a staff row; `password_hash` made nullable since Clerk now owns credentials.
2. **`webhook_events`** table added for idempotent webhook processing.
3. **Fixed a real bug**: `generate_request_reference()` cast a string containing a hyphen (`'2026-000006'`) to `INT`, which would throw once a second request existed in the same year; it was also not concurrency-safe. Replaced with an atomic counter table (`request_reference_counters`).
4. **`booking_requests.channel`** added to distinguish how a request arrived from the customer's original acquisition `source`.
5. Added trigram (`pg_trgm`) indexes for `?search=` on customers and treatments, and a composite `(status, preferred_date)` index for the dashboard's most common filter combination.
6. `staff.email` converted to `CITEXT` for case-insensitive matching against Clerk.
7. **`notify_booking_change`, `notify_new_booking_request`, `notify_booking_status_alert`** triggers added — `pg_notify` on `booking_updates` and `dashboard_notifications` channels, consumed by the Socket.IO bridge in §12.

## Appendix C — Backend stack recommendation

- **Runtime**: Node.js (TypeScript), on a long-running process — not serverless functions, since those can't hold a persistent WebSocket connection.
- **Framework**: Express (matches the middleware examples in §2.3) or Fastify.
- **ORM**: Prisma or Drizzle over the existing Postgres schema.
- **Realtime**: Socket.IO + Postgres `LISTEN/NOTIFY` (§12) — no extra infra (Redis, third-party realtime service) needed until you scale past one instance.
- **Host**: Railway, Render, or Fly.io — all support a single always-on process with WebSockets with minimal ops overhead compared to raw EC2/Kubernetes at this scale.
- **API docs**: Swagger UI generated from an OpenAPI spec, see the note at the top of this document.
