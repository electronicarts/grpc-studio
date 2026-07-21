// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import statusService from '../services/statusService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import type { StatusResponse } from '@grpc-studio/shared';

/**
 * Controller for /api/grpc/status endpoint
 * Returns connection status and certificate info for all configured targets
 */
export async function getStatus(_req: Request, res: Response) {
  const servers = await statusService.getAllServerStatuses();
  const responseBody: StatusResponse = { servers };
  sendSuccess(res, responseBody);
}
