// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Global HTTP error response envelope.
 * Used by middleware for unmatched routes and unexpected application errors.
 */
export interface ApiErrorInfo {
  code: string
  message: string
}

export interface ApiErrorResponse {
  error: ApiErrorInfo
  timestamp: string
  requestId?: string
}

export interface NotFoundResponse extends ApiErrorResponse {
  error: {
    code: 'NOT_FOUND'
    message: 'Not Found'
  }
  path: string
}
