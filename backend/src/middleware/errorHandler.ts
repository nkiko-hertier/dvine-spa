import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../lib/errors.js';

/**
 * Catches unmatched routes and turns them into the standard 404 envelope,
 * instead of Express's default HTML "Cannot GET /x" page.
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: `No route matches ${req.method} ${req.path}.` },
  });
};

/**
 * Global error handler — must be registered last, after all routes.
 * Maps AppError, ZodError (validation), and unknown errors to
 * { success: false, error: {...} } per API_DOCUMENTATION.md §4.1–4.2.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request failed validation.',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        })),
      },
    });
    return;
  }

  req.log?.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong on our end.' },
  });
};
