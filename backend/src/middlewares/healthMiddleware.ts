// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Health Check Middleware
 * Application health and readiness checks
 */

import type { Request, Response, NextFunction } from 'express';
import * as version from '../utils/version.js';
import configManager from '../config/configManager.js';
import {
  HealthStatus,
  type HealthResponse,
  type LivenessResponse,
  type ReadinessResponse,
} from '@grpc-studio/shared';

const READY_PATH = '/ready';
const LIVE_PATH = '/live';

/**
 * Health check middleware
 * Responds to /health endpoint with application status
 */
export const healthCheck = (req: Request, res: Response, next: NextFunction): void => {
  const healthConfig = configManager.getHealthConfig();

  if (healthConfig.enabled && req.path === healthConfig.endpoint) {
    const responseBody: HealthResponse = {
      status: HealthStatus.HEALTHY,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: version.APP_VERSION || undefined
    };

    res.json(responseBody);
    return;
  }
  next();
};

/**
 * Readiness check middleware
 * Responds to /ready endpoint for Kubernetes readiness probes.
 * Responds to /ready endpoint for Kubernetes readiness probes.
 */
export const readinessCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.path !== READY_PATH) {
    return next();
  }

  const responseBody: ReadinessResponse = {
    status: HealthStatus.READY,
    timestamp: new Date().toISOString(),
  };

  res.json(responseBody);
};

/**
 * Liveness check middleware
 * Responds to /live endpoint for Kubernetes liveness probes
 */
export const livenessCheck = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === LIVE_PATH) {
    const responseBody: LivenessResponse = {
      status: HealthStatus.ALIVE,
      timestamp: new Date().toISOString(),
    };

    res.json(responseBody);
    return;
  }
  next();
};
