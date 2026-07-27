// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import discoveryService from '../services/discoveryService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import type { DiscoveryResponse } from '@grpc-studio/shared';

export async function discover(req: Request, res: Response) {
  const forceReload = req.query.reload === 'true' || req.body?.reload === true;
  const targetFilter = (req.query.target as string | undefined) ?? (req.body?.target as string | undefined);

  const servers = await discoveryService.discoverServers({ forceReload, targetFilter });

  const responseBody: DiscoveryResponse = { servers };
  sendSuccess(res, responseBody);
}
