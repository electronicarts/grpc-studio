// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import discoveryService from '../services/discoveryService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import type { ApiService, DiscoveryResponse } from '@grpc-studio/shared';

const controllerLogger = logger.child({ controller: 'discovery' });

export async function discover(_req: Request, res: Response) {
  controllerLogger.info('Discovering services');

  const serviceNames = await discoveryService.listServices();
  const detailedServices: ApiService[] = [];

  for (const serviceName of serviceNames) {
    try {
      controllerLogger.info(`Describing service ${serviceName}`);
      const serviceDetails = await discoveryService.describeService(serviceName) as ApiService;
      detailedServices.push(serviceDetails);
    } catch (error) {
      controllerLogger.warn(`Failed to describe service ${serviceName}`, { error: error instanceof Error ? error.message : String(error) });
      detailedServices.push({
        name: serviceName.split('.').pop(),
        fullName: serviceName,
        methods: [],
      });
    }
  }

  controllerLogger.info('Discovery completed', { servicesFound: serviceNames.length });
  const responseBody: DiscoveryResponse = { services: detailedServices };
  sendSuccess(res, responseBody);
}
