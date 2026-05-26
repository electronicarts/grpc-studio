// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Logging Middleware
 * Request logging and tracking
 */

import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { randomUUID } from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateRequestId() {
  return randomUUID();
}

function validateRequestId(input: string | undefined): string {
  if (!input) return generateRequestId();

  // Only accept valid UUID format to prevent header injection
  if (UUID_REGEX.test(input)) {
    return input;
  }

  // Reject invalid input and log attempt
  logger.warn('Invalid X-Request-Id format received', { input });
  return generateRequestId();
}

/**
 * Request logging middleware
 * Logs request start and completion with timing
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  req.id = validateRequestId(req.get('X-Request-Id'));
  res.setHeader('X-Request-Id', req.id);

  const reqLogger = logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path
  });

  reqLogger.info('Request started', {
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    reqLogger.info('Request completed', {
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};
