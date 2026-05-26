// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import express from 'express';
import helmet from 'helmet';
import type { Application, Request, Response } from 'express';
import configManager from './config/configManager.js';
import logger from './utils/logger.js';
import * as version from './utils/version.js';
import grpcRoutes from './routes/grpc.js';
import metricsRoutes from './routes/metrics.js';
import { cors } from './middlewares/corsMiddleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorMiddleware.js';
import { healthCheck, livenessCheck, readinessCheck } from './middlewares/healthMiddleware.js';
import { metricsMiddleware } from './middlewares/metricsMiddleware.js';
import { requestLogger } from './middlewares/loggingMiddleware.js';
import { requestTimeout } from './middlewares/timeoutMiddleware.js';
import { userContextMiddleware } from './middlewares/userContextMiddleware.js';
import { sendSuccess } from './utils/responseHelpers.js';
import type { RootResponse } from '@grpc-studio/shared';

const serverLogger = logger.child({ module: 'express-app' });

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
export function createExpressApp() {
  const app = express();
  
  setupMiddleware(app);
  setupRoutes(app);
  setupErrorHandling(app);
  
  return app;
}

/**
 * Setup Express middleware stack
 */
function setupMiddleware(app: Application): void {
  serverLogger.info('Setting up middleware');

  const serverConfig = configManager.getServerConfig();

  // Secure HTTP headers — must come before any route handler
  app.use(helmet());

  // Health/probe checks run first so they are never timed out
  app.use(healthCheck);
  app.use(readinessCheck);
  app.use(livenessCheck);

  const observabilityConfig = configManager.getObservabilityConfig();
  if (observabilityConfig.enabled && observabilityConfig.metrics?.enabled) {
    // Mount before request logging and metrics recording to avoid self-measurement.
    app.use(observabilityConfig.metrics.path, metricsRoutes);
  }

  // HTTP metrics collection
  app.use(metricsMiddleware);

  // Request logging
  app.use(requestLogger);

  // CORS — shared origin policy is reused by HTTP and WebSocket upgrade checks
  app.use(cors(serverConfig.cors));

  // User context from SSO headers
  app.use(userContextMiddleware);

  // Request timeout
  app.use(requestTimeout(serverConfig.http.responseTimeoutMs));

  // Body parsing — limit comes from config
  const bodyLimit = `${serverConfig.http.bodyLimitBytes}b`;
  app.use(express.json({ limit: bodyLimit, strict: true }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  serverLogger.info('Middleware setup completed');
}

/**
 * Setup API routes
 */
function setupRoutes(app: Application): void {
  serverLogger.info('Setting up routes');

  // API routes
  app.use('/api/grpc', grpcRoutes);

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    const responseBody: RootResponse = {
      name: 'gRPC Studio API',
      version: version.APP_VERSION,
      status: 'running',
    };

    sendSuccess(res, responseBody);
  });

  // 404 handler — reuses the shared notFoundHandler from errorMiddleware
  app.use(notFoundHandler);

  serverLogger.info('Routes setup completed');
}

/**
 * Setup error handling
 */
function setupErrorHandling(app: Application): void {
  serverLogger.info('Setting up error handling');

  // Global error handler (must be last)
  app.use(errorHandler);

  serverLogger.info('Error handling setup completed');
}
