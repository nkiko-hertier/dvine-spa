export const fmtDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) =>
  value ? new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric' }).format(new Date(value)) : '—';

export const fmtMoney = (value?: string | number | null) =>
  value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));

export const titleCase = (value?: string | null) => (value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());

export const initials = (name?: string) => (name ?? 'DV').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
