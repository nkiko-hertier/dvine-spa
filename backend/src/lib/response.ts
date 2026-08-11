import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Standard success envelope, per API_DOCUMENTATION.md §4.1.
 */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

/**
 * Success envelope for list endpoints, including the `meta` pagination block.
 */
export function okList<T>(res: Response, data: T[], meta: PaginationMeta, status = 200) {
  return res.status(status).json({ success: true, data, meta });
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Parses & clamps ?page and ?limit per API_DOCUMENTATION.md §4.3
 * (default page=1, limit=20, max limit=100).
 */
export function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}
