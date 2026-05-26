// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import { isResponseFinished } from './responseLifecycle.js';

/**
 * Send a success response with the standard envelope the frontend expects:
 * { success: true, data, timestamp }
 */
export function sendSuccess(res: Response, data: unknown, status = 200): void {
  if (isResponseFinished(res)) return;
  res.status(status).json({ success: true, data, timestamp: Date.now() });
}

/**
 * Send an error response with the standard envelope:
 * { error: { code, message }, timestamp, requestId }
 *
 * Use this in middlewares that short-circuit before the error handler (e.g. CORS, cert validation).
 * Controllers should throw AppError instead — the error middleware handles formatting.
 */
export function sendError(req: Request, res: Response, status: number, code: string, message: string): void {
  if (isResponseFinished(res)) return;
  res.status(status).json({
    error: { code, message },
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
}

// Kept for backward compat with existing test
export const responseHelpers = { success: sendSuccess };
