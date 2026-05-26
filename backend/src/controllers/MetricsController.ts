// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import { metricsRegistry } from '../metrics/registry.js';
import logger from '../utils/logger.js';

const metricsLogger = logger.child({ module: 'metrics-controller' });

export async function metricsEndpoint(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await metricsRegistry.getMetrics();
    res.setHeader('Content-Type', metricsRegistry.getRegistry().contentType);
    res.send(metrics);
  } catch (error) {
    metricsLogger.error('Failed to export metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({ error: 'Failed to export metrics' });
  }
}
