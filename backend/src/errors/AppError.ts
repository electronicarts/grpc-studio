// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Typed application error.
 *
 * isOperational = true  → expected failure (404, 400, auth) — log at warn
 * isOperational = false → unexpected bug — log at error, trigger alerting
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
