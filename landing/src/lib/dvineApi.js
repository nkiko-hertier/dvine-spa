import db from '@/api/base44Client';


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

// Centralized single call point for the spa API proxy. Components never use
// fetch directly - this is the only place that talks to the backend function.
async function call(payload) {
  let res;
  try {
    res = await db.functions.invoke('dvineApi', payload);
  } catch {
    throw new ApiError('Unable to reach the spa service. Please try again.', { code: 'NETWORK', status: 0 });
  }
  const body = res && res.data ? res.data : {};
  if (body.success === true) return body.data;
  const err = body.error || {};
  if (import.meta.env && import.meta.env.DEV) {
    console.debug('[dvineApi] error', payload.op, err);
  }
  throw new ApiError(err.message || 'Something went wrong. Please try again.', {
    code: err.code || 'INTERNAL_ERROR',
    status: res && res.status ? res.status : 500,
    details: err.details || null,
  });
}

export const dvineApi = {
  getCategories: () => call({ op: 'categories' }),
  getCategory: (id) => call({ op: 'category', id }),
  getCategoryTreatments: (id) => call({ op: 'categoryTreatments', id }),
  getTreatments: (params = {}) => call({ op: 'treatments', ...params }),
  getTreatment: (id) => call({ op: 'treatment', id }),
  createBookingRequest: (data) => call({ op: 'createBooking', data }),
  lookupBookingRequest: (reference, phone_number) => call({ op: 'lookup', reference, phone_number }),
};