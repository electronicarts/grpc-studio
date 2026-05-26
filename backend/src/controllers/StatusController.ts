// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import discoveryService from '../services/discoveryService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import * as reflectionClient from '../grpc/reflection/reflectionClient.js';
import logger from '../utils/logger.js';
import type { StatusResponse } from '@grpc-studio/shared';

const controllerLogger = logger.child({ controller: 'status' });

export async function getStatus(_req: Request, res: Response) {
  const host = reflectionClient.getConfiguredHost();

  try {
    const services = await discoveryService.listServices();
    const responseBody: StatusResponse = {
      connected: true,
      targetServer: host,
      servicesCount: services.length,
      error: null,
    };
    sendSuccess(res, responseBody);
  } catch (error) {
    controllerLogger.warn('Status check failed', { error: error instanceof Error ? error.message : String(error), host });
    const responseBody: StatusResponse = {
      connected: false,
      targetServer: host,
      servicesCount: 0,
      error: 'Unable to connect to target server',
    };
    sendSuccess(res, responseBody);
  }
}
