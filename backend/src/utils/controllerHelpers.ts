// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Response } from 'express';
import { isResponseFinished } from './responseLifecycle.js';

/**
 * Send a success response with the standard envelope the frontend expects:
 * { success: true, data, timestamp }
 */
export function sendSuccess(res: Response, data: unknown, status = 200): void {
  if (isResponseFinished(res)) return;
  res.status(status).json({ success: true, data, timestamp: Date.now() });
}

// Kept for backward compat with existing test
export const responseHelpers = { success: sendSuccess };
