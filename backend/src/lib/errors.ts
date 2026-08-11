/**
 * Error codes and status mapping, matching API_DOCUMENTATION.md §4.2.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

const STATUS_BY_CODE: Record<ErrorCodeType, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export interface ErrorDetail {
  field?: string;
  issue: string;
}

/**
 * Throw this anywhere in a route handler / service; the global error
 * handler (see middleware/errorHandler.ts) turns it into the standard
 * { success: false, error: {...} } envelope with the right HTTP status.
 */
export class AppError extends Error {
  readonly code: ErrorCodeType;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCodeType, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static notFound(message = 'Resource not found.') {
    return new AppError(ErrorCode.NOT_FOUND, message);
  }

  static unauthorized(message = 'Missing or invalid session token.') {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }

  static conflict(message: string) {
    return new AppError(ErrorCode.CONFLICT, message);
  }

  static validation(message: string, details?: ErrorDetail[]) {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
  }
}
