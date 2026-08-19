# Backend Integration Guide

For a developer picking up this codebase after the Clerk + React Query
integration. This explains **why** things are wired the way they are, not
just how to call a hook — read this once, and `docs/API_USAGE.md` +
`helpers.ts` become self-explanatory.

Companion docs:
- `docs/API_USAGE.md` — quick reference for `apiClient`/`ENDPOINTS`/query params
- `helpers.ts` — the actual hooks (source of truth for what's implemented)
- `types.ts` — the actual types (source of truth for shapes)
- `backend/docs/API_DOCUMENTATION.md` — the backend's own spec (the real contract)

---

## 1. The big picture

Two separate apps, two separate repos-in-one:

```
frontend/   React + Vite + Clerk + React Query   -> talks to ->   backend/   Express + Prisma + Postgres + Clerk
```

They agree on one contract: **JSON over HTTP, snake_case field names,
Clerk session tokens for anything under `/admin/*`.** Nothing about React
Query or the frontend's file layout is known to the backend — it's a
plain REST API that happens to be consumed by this frontend.

Auth model (this is the part most likely to trip someone up — see §4):

| Audience | Routes | Auth |
|---|---|---|
| Public website | `/categories`, `/treatments`, `/booking-requests` | None |
| Staff dashboard | everything under `/admin/*` | Clerk session token, **and** a matching active `staff` DB row |
| Clerk webhook | `/webhooks/clerk` | Svix signature (not a user session — the frontend never calls this) |

---

## 2. Local setup — both sides running together

### Backend

```bash
cd backend
cp .env.example .env
npm install
docker compose up -d   # local Postgres
psql "$DATABASE_URL" -f sql/001_base_schema.sql
psql "$DATABASE_URL" -f sql/002_clerk_integration_and_fixes.sql
psql "$DATABASE_URL" -f sql/003_realtime_notifications.sql
npm run db:seed        # sample categories/treatments/customers
npm run dev             # listens on PORT, default 4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # Vite dev server, default port 5173
```

### ⚠️ The one thing that will silently break local dev: CORS

`backend/src/config/env.ts` defaults `DASHBOARD_URL` to
`http://localhost:3000`. Vite's default dev port is **5173**, not 3000.
The backend's CORS middleware (`backend/src/app.ts`) only allows a single
configured origin:

```ts
app.use(cors({ origin: env.DASHBOARD_URL, credentials: true }));
```

If these don't match, every request from the frontend fails as a CORS
error in the browser console — **not** a 401/403, so it's easy to
mistake for an auth bug. Fix it once, in `backend/.env`:

```
DASHBOARD_URL=http://localhost:5173
```

(Or run the frontend on port 3000 instead — either side works, they just
have to agree.)

---

## 3. Environment variables — both sides

| File | Variable | Purpose |
|---|---|---|
| `frontend/.env.local` | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key — same Clerk **application** as the backend |
| `frontend/.env.local` | `VITE_API_BASE_URL` | Where the frontend sends requests, e.g. `http://localhost:4000` |
| `backend/.env` | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | Same Clerk application, server-side keys |
| `backend/.env` | `CLERK_WEBHOOK_SECRET` | Svix secret for `/webhooks/clerk` — needed for staff sync (§4) |
| `backend/.env` | `DASHBOARD_URL` | CORS allowed origin — must equal the frontend's dev/prod URL |
| `backend/.env` | `DATABASE_URL` | Postgres connection string |

**The Clerk keys on both sides must belong to the same Clerk application.**
Mixing a frontend publishable key from one Clerk app with a backend secret
key from another will fail token verification with a generic 401 — worth
double-checking first if auth "just doesn't work."

---

## 4. Auth deep dive — this is the part that actually matters

Signing in through Clerk on the frontend is **not** sufficient to use
`/admin/*`. There are two independent checks, both must pass:

1. **Clerk verifies the session token is valid.** Handled by
   `clerkMiddleware()` (mounted globally in `backend/src/app.ts`) plus
   `requireAuth` (`backend/src/middleware/auth.ts`), which reads the
   `Authorization: Bearer <token>` header our `apiClient` interceptor
   attaches automatically (see `docs/API_USAGE.md` §3).

2. **The Clerk user must map to an active row in the `staff` table**,
   via `staff.clerk_user_id`. This is the part that's easy to miss:

   ```ts
   // backend/src/lib/resolveStaff.ts
   export async function resolveActiveStaff(clerkUserId: string) {
     const staff = await prisma.staff.findUnique({ where: { clerkUserId } });
     if (!staff || !staff.isActive) return null;
     return staff;
   }
   ```

   If this returns `null`, every `/admin/*` request 403s with
   `"No active staff account is linked to this session."` — **even
   though the Clerk session itself is perfectly valid.** This is a
   config problem, not a credentials problem, and it's the single most
   likely thing to confuse a new developer testing locally: you sign in
   fine, then every admin API call fails.

   How a `staff` row gets created: **not** automatically on sign-up.
   It's created by the `user.created` Clerk webhook
   (`backend/src/routes/webhooks.ts`), which only fires after someone
   accepts an invitation sent via `POST /admin/staff/invite`
   (`useInviteStaff()` in `helpers.ts`). There's no seed data for staff
   (`prisma/seed.ts` seeds categories/treatments/customers only) — for
   local dev, either:
   - go through the real invite flow once (needs `CLERK_WEBHOOK_SECRET`
     configured and a way for Clerk to reach your webhook, e.g. `ngrok`), or
   - manually insert a `staff` row with your Clerk dev user's `clerk_user_id`
     via `npm run db:studio`.

3. **Role matters for one route group.** `/admin/staff/*` additionally
   requires `staff.role === 'admin'` (`requireRole` in `auth.ts`) — a
   regular `'staff'` role gets 403 there specifically, even with a valid
   session and an active staff row. `useAdminStaff`/`useInviteStaff`/etc.
   in `helpers.ts` don't hide this — the backend enforces it, the
   frontend just surfaces whatever error comes back.

**None of this is the frontend's job to work around.** `apiClient`
attaches the token; the backend decides who's allowed in. If you're
debugging an auth issue, check in this order: (1) is the token being
sent at all — Network tab, `Authorization` header present? (2) is
`window.Clerk.session` populated yet (see §5, timing gotcha)? (3) does a
`staff` row exist for this Clerk user and is it active? (4) does the
role match, if it's a `/admin/staff/*` call?

---

## 5. How a request actually goes out — tracing one call

Say a component calls `useAdminCustomers({ page: 2, search: "uwase" })`.
Here's every hop:

1. **`helpers.ts`** — the hook builds a `useQuery` with
   `queryKey: ["admin", "customers", "list", { page: 2, search: "uwase" }]`
   and a `queryFn` that calls `apiClient.get(...)`.
2. **`endpoints.ts`** — `ENDPOINTS.admin.customers.getAllCustomers()`
   resolves to the path `"/admin/customers"`. No query string here —
   endpoints are pure paths.
3. **`apiClient.ts`** — `apiClient.get(path, { params })`:
   - axios serializes `{ page: 2, search: "uwase" }` onto the URL:
     `/admin/customers?page=2&search=uwase`
   - the request interceptor runs **before** the request is sent:
     `await window.Clerk?.session?.getToken()`, attaches
     `Authorization: Bearer <token>` if a session exists
   - request goes to `VITE_API_BASE_URL` + that path
4. **Backend `clerkMiddleware()`** (global) parses the token, attaches
   auth state to `req` — doesn't block anything by itself.
5. **Backend `requireAuth`** (`adminRouter`, currently applied per the
   comment in `backend/src/routes/admin/index.ts` — see the note below)
   calls `resolveActiveStaff`, 401s if no token, 403s if no active
   staff row.
6. **`backend/src/routes/admin/customers.ts`** parses `page`/`search`
   from `req.query` via `parsePagination`/`asString`, queries Postgres,
   serializes the result through `serializeCustomerSummary` (this is
   where the snake_case shape in `types.ts` comes from), returns
   `{ success: true, data: [...], meta: { page, limit, total, total_pages } }`.
7. Back in `helpers.ts`, the `queryFn` returns that whole envelope, React
   Query caches it under the query key from step 1, and the component
   re-renders with `data`, `isLoading`, `isError`.

> **Note:** `backend/src/routes/admin/index.ts` currently has
> `requireAuth`/`adminLimiter` **commented out** on `adminRouter`
> (`// adminRouter.use(requireAuth, adminLimiter);`). Confirm with
> whoever owns the backend whether that's intentional for this stage of
> the project before assuming `/admin/*` is actually locked down — as
> written today, the routes may be reachable without a valid session
> until that line is uncommented. This doesn't change anything on the
> frontend (`apiClient` always sends the token when a session exists
> regardless), but it matters for anyone reasoning about what's
> currently protected.

### Timing gotcha: `window.Clerk` isn't there instantly

`apiClient`'s interceptor reads `window.Clerk?.session?.getToken()`.
`window.Clerk` is set by clerk-js after it finishes loading
asynchronously — there's a brief window on initial page load where it's
`undefined`. In practice this is rarely an issue because:
- `ProtectedRoute` already waits on `useAuth()`'s `isLoaded` before
  rendering any dashboard page, and Clerk is loaded by the time
  `isLoaded` is true, so any query fired from inside a protected page
  already has a live session.
- Public queries don't need a token anyway.

If you ever see an admin request go out **without** an Authorization
header, look for a `useQuery` that isn't gated behind `ProtectedRoute`
(or a `useEffect` firing before Clerk finishes loading) rather than
assuming the interceptor is broken.

---

## 6. The response envelope — always the same shape

Every backend response, success or error, follows one of three shapes
(`backend/src/lib/response.ts`, `backend/src/middleware/errorHandler.ts`):

```ts
// Single-item success (types.ts: ApiSuccess<T>)
{ "success": true, "data": { ... } }

// List success (types.ts: ApiListSuccess<T>)
{ "success": true, "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 57, "total_pages": 3 } }

// Error (types.ts: ApiError)
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ { "field": "email", "issue": "Invalid email" } ] } }
```

`helpers.ts` hooks already unwrap `data.data` (or return the full
`data` for list endpoints, so you get `meta` alongside the array) — you
shouldn't need to reach into `.data.data` yourself in a component. If
you're writing a **new** hook, follow that same pattern: return
`response.data.data` for single items, `response.data` (whole envelope)
for lists.

### Handling errors

`apiClient` doesn't do anything special with error responses — a
non-2xx status rejects the axios promise as normal, and the rejected
error's `error.response.data` is that `ApiError` shape. In a component:

```tsx
const { mutate, error } = useUpdateBookingRequest(id);

// error is an AxiosError; the backend's structured error is at:
const apiError = (error as AxiosError<ApiError>)?.response?.data?.error;
apiError?.code;     // e.g. "VALIDATION_ERROR"
apiError?.message;  // human-readable
apiError?.details;  // field-level issues, when present (validation errors)
```

`error.code` is one of the `ErrorCode` union in `types.ts` — worth
switching on for anything you want to handle specially (e.g. a `409
CONFLICT` on staff invite means "this email already has an account").

---

## 7. Business rules the frontend must respect

These aren't enforced by TypeScript — the backend rejects violations at
runtime, but the UI should guide toward valid states rather than let a
user hit an avoidable 400/422:

- **Booking request status transitions are a state machine**
  (`backend/src/lib/bookingStatusMachine.ts`). You can't jump straight
  from `new_request` to `completed`, for example. `useUpdateBookingRequest`
  will surface the backend's rejection, but the UI (a status dropdown,
  say) should only offer valid next-states for the current status.
- **`cancellation_reason` is required when setting `status: "cancelled"`**
  on a booking request — enforced by a Zod `.refine()` server-side, not
  reflected in the `BookingRequestUpdateInput` type (it's optional there
  because it's *conditionally* required). Validate this in the form
  before submitting, don't rely on the type system to catch it.
- **`customer.phone_number` is not editable** via `useUpdateCustomer` —
  it's the dedupe key new bookings upsert against. Don't render it as an
  editable field even though nothing stops you from putting it in the
  PATCH body (the backend will just ignore it since `customerUpdateSchema`
  doesn't include it).
- **`POST /booking-requests` is rate-limited to 5/min per IP**
  (`backend/src/middleware/rateLimit.ts`) — much stricter than the
  general public limit of 60/min. A booking form that retries
  aggressively on failure will hit this fast. Use the `Idempotency-Key`
  support already built into `useCreateBookingRequest` (pass a stable
  key, e.g. a UUID generated once per form session) so a legitimate
  retry after a network blip returns the original booking instead of
  creating a duplicate or burning rate-limit budget.
- **`/admin/*` is rate-limited to 300/min per staff member** (not per
  IP) — generous, but a runaway polling `useQuery` (very short
  `refetchInterval`) across many open tabs could theoretically hit it.
- **`display_order` on categories/treatments has no server-side gap
  filling** — if you build drag-to-reorder UI, you own the logic for
  reassigning `display_order` values across all affected rows.

---

## 8. Extending this: adding a new endpoint end-to-end

Say the backend adds `GET /admin/treatments/:id/booking-history`. Here's
the full loop, in order:

1. **Confirm the contract with the backend dev** — exact path, method,
   query params, request body, response shape, auth requirements. Don't
   guess; the whole point of `types.ts`/`endpoints.ts` being hand-matched
   to the backend is that they don't drift.
2. **`endpoints.ts`** — add one line to the right group:
   ```ts
   admin: {
     treatments: {
       // ...existing...
       getTreatmentBookingHistory: (id: string) => `/admin/treatments/${id}/booking-history`,
     },
   }
   ```
3. **`types.ts`** — add the response type (and a `*ListParams` type if
   it's paginated), matching the backend's serializer field-for-field,
   snake_case included.
4. **`helpers.ts`** — add a hook, following the existing pattern for
   that resource (query key prefix, `enabled` guard if it takes an id,
   invalidation targets if it's a mutation):
   ```ts
   export function useTreatmentBookingHistory(id: string, options?: ExtraQueryOptions<...>) {
     return useQuery({
       queryKey: ["admin", "treatments", "detail", id, "booking-history"],
       queryFn: async () => {
         const { data } = await apiClient.get<ApiSuccess<...>>(
           ENDPOINTS.admin.treatments.getTreatmentBookingHistory(id)
         );
         return data.data;
       },
       enabled: !!id,
       ...options,
     });
   }
   ```
5. **Use it in a component.** Nothing else needs to change —
   `apiClient`'s auth interceptor and `queryClient`'s defaults already
   apply.

Don't hardcode a path string or reach for raw `axios`/`fetch` in a
component — if you're tempted to, it usually means step 2 was skipped.

---

## 9. What's genuinely not built yet

Being explicit so nobody assumes more is wired up than actually is:

- **No page currently calls `helpers.ts`.** Dashboard, Booking, Services,
  and Categories admin pages still render mocked `useState` data. Wiring
  a page over means: replace the `useState` initial value + setters with
  the matching `use*` hook from `helpers.ts`, handle `isLoading`/`isError`,
  and replace direct state mutation (`setBookings(...)`) with calling the
  relevant mutation hook and letting its `onSuccess` invalidation refetch.
- **No realtime/Socket.IO integration on the frontend.** The backend has
  a Socket.IO layer (`backend/src/realtime/`) for live booking
  notifications with its own Clerk handshake auth — completely separate
  from anything in `apiClient.ts`/`helpers.ts`. Out of scope until
  someone explicitly picks it up.
- **No global error boundary / toast wiring.** `helpers.ts` hooks
  surface errors via React Query's normal `error` state; nothing
  currently displays them to the user automatically.
- **Staff invite flow needs `CLERK_WEBHOOK_SECRET`** configured and
  reachable (see §4) before it does anything beyond sending the Clerk
  invite email — the local `staff` row won't appear until the webhook
  fires.