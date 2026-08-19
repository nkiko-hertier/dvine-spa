# Frontend API & Auth Usage

How authentication, data fetching, and typing are wired up in `frontend/`.
Four pieces work together so a page only ever writes `useQuery(...)`:

- **Clerk** — session/auth
- **`apiClient`** (`src/lib/apiClient.ts`) — one axios instance, auto-attaches the auth token
- **`ENDPOINTS`** (`src/lib/endpoints.ts`) — every backend path, in plain English
- **`types.ts`** (`src/lib/types.ts`) — every request/response shape, matched to the backend

---

## 1. Setup

### 1.1 Environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose | Example |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (Clerk dashboard → API Keys) | `pk_test_xxxxxxxx` |
| `VITE_API_BASE_URL` | Backend base URL | `http://localhost:4000` |

`.env.local` is git-ignored — never commit real keys.

### 1.2 Install

```bash
npm install
```

Adds `@clerk/clerk-react`, `@tanstack/react-query`, and
`@tanstack/react-query-devtools`.

---

## 2. How the pieces fit together

```
main.tsx
 └─ ClerkProvider            (src/lib/clerk.ts reads VITE_CLERK_PUBLISHABLE_KEY)
     └─ QueryClientProvider  (src/lib/queryClient.ts)
         └─ App
             └─ ProtectedRoute   (guards /dashboard/*, redirects to /login)
                 └─ Dashboard / Services / Bookings / Categories pages
                     └─ useQuery / useMutation
                         └─ apiClient.get(ENDPOINTS.xxx, { params }) 
                             └─ interceptor attaches Clerk session token
```

- **Clerk** owns the session. `ProtectedRoute` (`src/components/ProtectedRoute.tsx`)
  keeps signed-out users out of `/dashboard/*`. `Login.tsx` renders Clerk's
  `<SignIn>` themed to match the site.
- **React Query** (`src/lib/queryClient.ts`) owns server-state caching —
  loading/error states, refetching, cache invalidation.
- **`apiClient`** is the one axios instance every request should go
  through. It automatically attaches the Clerk session token — you never
  call `getToken()` or set headers yourself.
- **`ENDPOINTS`** is the single source of truth for backend *paths*.
- **`types.ts`** is the single source of truth for every *shape* — what
  a `Customer` looks like, what a list endpoint returns, what a create
  payload requires.

---

## 3. `apiClient` — automatic auth, every request

```ts
import { apiClient } from "../lib/apiClient";
```

Every call — `.get()`, `.post()`, `.patch()`, `.delete()` — automatically
sends `Authorization: Bearer <token>` using Clerk's **default** session
token (no JWT template needed). A request interceptor reads
`window.Clerk.session.getToken()` right before the request goes out:

```ts
apiClient.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

This matches the backend exactly: `backend/src/middleware/auth.ts` uses
`@clerk/express`'s `clerkMiddleware()`, which reads that same header.

**You don't call `getToken()` yourself, ever.** Just call `apiClient`:

```ts
const { data } = await apiClient.get(ENDPOINTS.admin.customers.getAllCustomers());
```

On public (unauthenticated) routes, if there's no session yet, the header
is silently skipped — those routes don't require it anyway.

**Base URL:** `VITE_API_BASE_URL`, defaults to `http://localhost:4000`.

---

## 4. `ENDPOINTS` — every backend path, named in plain English

```ts
import { ENDPOINTS } from "../lib/endpoints";
```

Grouped by audience (`public` / `admin`), then by resource. Every leaf is
a function — even parameterless ones — so usage is always a call:

```ts
ENDPOINTS.admin.customers.getAllCustomers()        // "/admin/customers"
ENDPOINTS.admin.customers.getCustomerById(id)      // "/admin/customers/:id"
ENDPOINTS.admin.customers.updateCustomerById(id)   // "/admin/customers/:id"

ENDPOINTS.admin.treatments.getAllTreatments()
ENDPOINTS.admin.treatments.createTreatment()
ENDPOINTS.admin.bookingRequests.updateBookingRequestById(id)
ENDPOINTS.admin.dashboard.getSummary()
ENDPOINTS.public.categories.getTreatmentsByCategoryId(id)
```

`ENDPOINTS` only ever returns a **path**. It never builds a query string —
that's `apiClient`'s job, covered next. Keeping the two separate means an
endpoint's path can't drift out of sync with its filters.

Adding a new backend route? Add one line to the matching group in
`src/lib/endpoints.ts`. Don't hardcode path strings in components/hooks.

---

## 5. Passing query params — `?page=3&limit=20&...`

Every list endpoint takes pagination (and most take filters/sort) as a
**query string**, e.g. `GET /admin/customers?page=3&limit=20&search=alice`.

Don't build that string by hand. Pass a plain object as axios's `params`
option — axios serializes it onto the URL for you:

```ts
import { apiClient } from "../lib/apiClient";
import { ENDPOINTS } from "../lib/endpoints";
import type { CustomerListParams, CustomerSummary, ApiListSuccess } from "../lib/types";

const params: CustomerListParams = {
  page: 3,
  limit: 20,
  search: "alice",
};

const { data } = await apiClient.get<ApiListSuccess<CustomerSummary>>(
  ENDPOINTS.admin.customers.getAllCustomers(),
  { params } // <-- becomes ?page=3&limit=20&search=alice
);

data.data;        // CustomerSummary[]
data.meta.total;  // total row count
data.meta.total_pages;
```

The path (`ENDPOINTS...`) and the query (`params`) are always two separate
arguments — never concatenate them into the path string yourself.

### Every list endpoint accepts `page` / `limit`

Defined once as `PaginationParams` in `types.ts` and extended per resource:

```ts
export interface PaginationParams {
  page?: number;  // default 1
  limit?: number; // default 20, max 100 (enforced server-side)
}
```

### Filters and sort are resource-specific

Each resource has its own `*ListParams` type in `types.ts` extending
`PaginationParams`. Examples:

```ts
// GET /admin/treatments?page=1&limit=50&is_active=true&category_id=...&sort=-price
const params: TreatmentListParams = {
  page: 1,
  limit: 50,
  is_active: true,
  category_id: someCategoryId,
  sort: "-price", // "-" prefix = descending
};
await apiClient.get(ENDPOINTS.admin.treatments.getAllTreatments(), { params });
```

```ts
// GET /admin/booking-requests?status=confirmed&status=completed&date_from=2026-08-01
const params: BookingRequestListParams = {
  status: ["confirmed", "completed"], // array -> repeated ?status=... params
  date_from: "2026-08-01",
  date_to: "2026-08-31",
};
await apiClient.get(ENDPOINTS.admin.bookingRequests.getAllBookingRequests(), { params });
```

Array values (like `status` above) are serialized by axios as repeated
keys and are parsed back into an array by Express's query parser on the
backend — no special handling needed on either side.

### Full list of `*ListParams` types (all in `types.ts`)

| Type | Endpoint | Extra filters |
|---|---|---|
| `CategoryListParams` | `admin.categories.getAllCategories` | `is_active`, `search`, `sort` |
| `TreatmentListParams` | `admin.treatments.getAllTreatments` | `is_active`, `category_id`, `search`, `sort` |
| `PublicTreatmentListParams` | `public.treatments.getAllTreatments` | `category_id`, `search`, `min_price`, `max_price`, `min_duration`, `max_duration`, `sort` |
| `CustomerListParams` | `admin.customers.getAllCustomers` | `search`, `source`, `has_pending`, `sort` |
| `BookingRequestListParams` | `admin.bookingRequests.getAllBookingRequests` | `status[]`, `treatment_id`, `category_id`, `customer_id`, `channel`, `date_from`/`date_to`, `created_from`/`created_to`, `search`, `sort` |
| `StaffListParams` | `admin.staff.getAllStaff` | `is_active`, `role` |
| `AuditLogListParams` | `admin.auditLogs.getAllAuditLogs` | `booking_request_id`, `user_id`, `action`, `date_from`/`date_to` |
| `DashboardSummaryParams` | `admin.dashboard.getSummary` | `date_from`/`date_to` (30-day window if omitted) |

`sort` is always a string: a bare field name for ascending, a `-`-prefixed
field name for descending (e.g. `sort: "-created_at"`).

---

## 6. `types.ts` — every request/response shape

```ts
import type {
  Customer,
  CustomerSummary,
  CustomerDetail,
  CustomerUpdateInput,
  BookingRequest,
  BookingStatus,
  ApiSuccess,
  ApiListSuccess,
  ApiError,
} from "../lib/types";
```

What's in there:

- **Enums** — `BookingStatus`, `CustomerSource`, `UserRole`
- **Entities** — `Category`, `Treatment`, `PublicTreatment`, `Customer`,
  `CustomerSummary`, `CustomerDetail`, `BookingRequest`,
  `BookingRequestDetail`, `Staff`, `AuditLog`, `DailyRequestsSummary`,
  `DashboardStats`
- **Create/update payloads** — `CategoryCreateInput`, `TreatmentUpdateInput`,
  `BookingRequestCreateInput`, `StaffInviteInput`, etc. — one per
  request body the backend actually validates
- **List query params** — the `*ListParams` types from §5
- **Response envelopes** — `ApiSuccess<T>`, `ApiListSuccess<T>`, `ApiError`,
  `PaginationMeta`, matching the backend's exact success/error JSON shape

All field names are `snake_case`, matching the API contract exactly (the
backend's schemas file is explicit that this is intentional — don't
camelCase these types).

---

## 7. Full example: query + mutation with types and params

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { ENDPOINTS } from "../../lib/endpoints";
import type {
  ApiListSuccess,
  ApiSuccess,
  CustomerSummary,
  CustomerListParams,
  CustomerUpdateInput,
} from "../../lib/types";

// --- Reads ---

function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: ["customers", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiListSuccess<CustomerSummary>>(
        ENDPOINTS.admin.customers.getAllCustomers(),
        { params }
      );
      return data; // { success, data: CustomerSummary[], meta }
    },
  });
}

// --- Writes ---

function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: CustomerUpdateInput) => {
      const { data } = await apiClient.patch<ApiSuccess<CustomerSummary>>(
        ENDPOINTS.admin.customers.updateCustomerById(id),
        updates
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// --- Component ---

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useCustomers({ page, limit: 20 });
  const updateCustomer = useUpdateCustomer("some-id");

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Couldn't load customers.</p>;

  return (
    <>
      <ul>
        {data?.data.map((c) => (
          <li key={c.id}>{c.full_name} — {c.phone_number}</li>
        ))}
      </ul>
      <p>Page {data?.meta.page} of {data?.meta.total_pages}</p>
      <button onClick={() => setPage((p) => p + 1)}>Next page</button>
    </>
  );
}
```

Query key convention: include the params object in the key
(`["customers", params]`) so React Query caches each page/filter
combination separately, and invalidate the bare `["customers"]` prefix
after any mutation (React Query invalidates prefix matches, so it also
invalidates every `["customers", params]` variant).

---

## 8. Query client defaults

Defined once in `src/lib/queryClient.ts`, applied everywhere:

| Option | Value | Why |
|---|---|---|
| `staleTime` | 30s | Avoids refetching data that's still fresh |
| `gcTime` | 5min | How long unused cache is kept before eviction |
| `refetchOnWindowFocus` | `false` | Admin dashboard — avoid refetch storms on tab switch |
| `retry` (queries) | 1 | One retry on transient failure |
| `retry` (mutations) | 0 | Don't silently retry writes |

React Query Devtools are mounted in dev only (`import.meta.env.DEV`).

---

## 9. What's NOT wired up yet

Dashboard, Booking, Services, and Categories admin pages still use mocked
`useState` data — they haven't been switched over to `useQuery`/`useMutation`
against `ENDPOINTS.admin.*` yet. This doc describes the plumbing; swapping
each page's mock data for real calls is a separate, deliberate step.