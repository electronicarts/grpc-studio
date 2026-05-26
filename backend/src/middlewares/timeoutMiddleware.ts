// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Timeout Middleware
 * Request timeout handling
 *
 * Note: this controls HTTP response behaviour only. It does not cancel
 * in-flight work (e.g. gRPC calls). Enforce operation-level timeouts
 * separately via gRPC deadlines or AbortController.
 */

/**
 * Request timeout middleware
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Function} Express middleware
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { isResponseFinished } from '../utils/responseLifecycle.js';

export const requestTimeout = (timeoutMs = 30000) => (_req: Request, res: Response, next: NextFunction): void => {
  const timer = setTimeout(() => {
    if (!isResponseFinished(res)) {
      next(new AppError('Request timeout', 408, 'REQUEST_TIMEOUT'));
    }
  }, timeoutMs);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  next();
};
