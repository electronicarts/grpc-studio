// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

import type { Request, Response, ErrorRequestHandler } from 'express';
import logger from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { isResponseFinished } from '../utils/responseLifecycle.js';
import type { ApiErrorResponse, NotFoundResponse } from '@grpc-studio/shared';

/**
 * Error handling middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (isResponseFinished(res)) return;

  const requestLogger = logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url
  });

  if (err instanceof AppError) {
    if (!err.isOperational) {
      requestLogger.error('Unexpected application error', { code: err.code, error: err.message });
    } else {
      requestLogger.warn('Operational error', { code: err.code, error: err.message });
    }

    const responseBody: ApiErrorResponse = {
      error: { code: err.code, message: err.message },
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };

    try {
      return res.status(err.statusCode).json(responseBody);
    } catch (sendError) {
      requestLogger.error('Failed to send error response - response already finished', {
        originalError: err.message,
        sendError: sendError instanceof Error ? sendError.message : 'unknown'
      });
      return;
    }
  }

  // Unknown error — never expose internals
  requestLogger.error('Unhandled error', { error: err.message, stack: err.stack });

  const responseBody: ApiErrorResponse = {
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' },
    timestamp: new Date().toISOString(),
    requestId: req.id,
  };

  try {
    return res.status(500).json(responseBody);
  } catch (sendError) {
    requestLogger.error('Failed to send error response - response already finished', {
      originalError: err.message,
      sendError: sendError instanceof Error ? sendError.message : 'unknown'
    });
  }
};

/**
 * Not found handler
 * Returns 404 for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const responseBody: NotFoundResponse = {
    error: { code: 'NOT_FOUND', message: 'Not Found' },
    path: req.path,
    timestamp: new Date().toISOString(),
    requestId: req.id
  };

  res.status(404).json(responseBody);
};
