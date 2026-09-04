// Booking status -> human label (no em dashes, per house style)
export const STATUS_LABELS = {
  new_request: 'Request received',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export function statusLabel(s) {
  return STATUS_LABELS[s] || (s ? s.replace(/_/g, ' ') : '');
}

export const SOURCE_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  website: 'Website',
  referral: 'Referral',
  hotel: 'Hotel guest',
  corporate: 'Corporate',
  walk_in: 'Walk-in',
  other: 'Other',
};

// Format a decimal price string ("30000.00") -> "30,000 RWF"
export function formatPrice(p) {
  if (p == null || p === '') return '';
  const n = Number(String(p).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return String(p);
  return Math.round(n).toLocaleString('en-US') + ' RWF';
}

export function formatDuration(min) {
  if (min == null || min === '') return '';
  const n = Number(min);
  if (Number.isNaN(n)) return '';
  if (n < 60) return n + ' min';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function formatDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'INTERNAL_ERROR';
    this.status = status || 500;
    this.details = details || null;
  }
}

// Every request goes to `/api/*`, which is proxied straight to the D'Vine Spa
// API (API_URL, default https://cms-api.pixelspringmarketing.com — override
// via .env.local, see vite.config.js). Dev: vite.config.js server/preview
// proxy. Prod: vercel.json rewrite. Components never call fetch directly -
// this is the only place that talks to the backend.
const API_PREFIX = '/api';
const enc = encodeURIComponent;

async function request(path, { method = 'GET', query, body } = {}) {
  let url = API_PREFIX + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the spa service. Please try again.', { code: 'NETWORK', status: 0 });
  }

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (res.ok && payload && payload.success === true) return payload.data;

  const err = (payload && payload.error) || {};
  if (import.meta.env && import.meta.env.DEV) {
    console.debug('[dvineApi] error', method, path, res.status, err);
  }
  throw new ApiError(err.message || 'Something went wrong. Please try again.', {
    code: err.code || 'INTERNAL_ERROR',
    status: res.status || 500,
    details: err.details || null,
  });
}

// Trim/shape the booking form payload to what the API expects; the server does
// the real validation and returns field-level `details` on failure.
function shapeBooking(d = {}) {
  const out = {
    full_name: (d.full_name || '').trim(),
    phone_number: (d.phone_number || '').trim(),
    treatment_id: d.treatment_id,
    preferred_date: d.preferred_date,
    preferred_time: d.preferred_time,
    channel: d.channel || 'website',
  };
  if (d.whatsapp_number && d.whatsapp_number.trim()) out.whatsapp_number = d.whatsapp_number.trim();
  if (d.email && d.email.trim()) out.email = d.email.trim();
  if (d.source) out.source = d.source;
  if (d.notes) out.notes = String(d.notes).slice(0, 2000);
  return out;
}

export const dvineApi = {
  getCategories: () => request('/categories'),
  getCategory: (id) => request(`/categories/${enc(id)}`),
  getCategoryTreatments: (id) => request(`/categories/${enc(id)}/treatments`),
  getTreatments: ({ categoryId, search, page, limit } = {}) =>
    request('/treatments', { query: { category_id: categoryId, search, page, limit } }),
  getTreatment: (id) => request(`/treatments/${enc(id)}`),
  createBookingRequest: (data) => request('/booking-requests', { method: 'POST', body: shapeBooking(data) }),
  lookupBookingRequest: (reference, phone_number) =>
    request('/booking-requests/lookup', { query: { reference, phone_number } }),
};