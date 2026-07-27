// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import { metricsRegistry } from '../metrics/registry.js';
import { AppError } from '../errors/AppError.js';
import { errorMessage } from '../utils/errorMessage.js';

export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await metricsRegistry.getMetrics();
    res.setHeader('Content-Type', metricsRegistry.getRegistry().contentType);
    res.send(metrics);
  } catch (error) {
    throw new AppError(`Failed to export metrics: ${errorMessage(error)}`, 500, 'METRICS_ERROR', false);
  }
}
