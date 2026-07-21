// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response, NextFunction } from 'express';
import configManager from '../config/configManager.js';
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
} from '../metrics/collectors/httpMetrics.js';
import logger from '../utils/logger.js';

const metricsLogger = logger.child({ module: 'metrics-middleware' });

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isMetricsEnabled()) {
    next();
    return;
  }

  const start = process.hrtime.bigint();
  const normalizedPath = normalizePath(req.path);

  const requestSize = parseInt(req.get('content-length') || '0', 10);
  if (requestSize > 0) {
    httpRequestSizeBytes.observe(
      { method: req.method, path: normalizedPath },
      requestSize
    );
  }

  res.on('finish', () => {
    try {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const status = res.statusCode.toString();

      httpRequestsTotal.inc({
        method: req.method,
        path: normalizedPath,
        status,
      });

      httpRequestDuration.observe(
        { method: req.method, path: normalizedPath },
        durationSeconds
      );

      const responseSize = parseInt(res.get('content-length') || '0', 10);
      if (responseSize > 0) {
        httpResponseSizeBytes.observe(
          { method: req.method, path: normalizedPath, status },
          responseSize
        );
      }

      if (res.statusCode >= 400) {
        httpErrorsTotal.inc({
          method: req.method,
          path: normalizedPath,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        });
      }
    } catch (error) {
      metricsLogger.warn('Failed to record HTTP metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  next();
}

const httpMetricsMiddleware = metricsMiddleware;

function isMetricsEnabled(): boolean {
  const observabilityConfig = configManager.getObservabilityConfig();
  return observabilityConfig.enabled && observabilityConfig.metrics?.enabled === true;
}

function normalizePath(path: string): string {
  let normalized = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id'
  );

  normalized = normalized.replace(/\/\d+/g, '/:id');

  if (normalized.length > 100) {
    normalized = `${normalized.substring(0, 100)}...`;
  }

  return normalized;
}
