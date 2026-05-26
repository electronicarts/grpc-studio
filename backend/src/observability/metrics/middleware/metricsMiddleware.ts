// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response, NextFunction } from 'express'
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpErrorsTotal,
  httpRequestSizeBytes,
  httpResponseSizeBytes,
} from '../collectors/httpMetrics.js'

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint()

  // Normalize path to avoid high cardinality (replace UUIDs/IDs with :id)
  const normalizedPath = normalizePath(req.path)

  // Record request size
  const requestSize = parseInt(req.get('content-length') || '0', 10)
  if (requestSize > 0) {
    httpRequestSizeBytes.observe(
      { method: req.method, path: normalizedPath },
      requestSize
    )
  }

  // Hook into response finish event
  res.on('finish', () => {
    try {
      // Calculate duration
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

      // Record metrics
      httpRequestsTotal.inc({
        method: req.method,
        path: normalizedPath,
        status: res.statusCode.toString(),
      })

      httpRequestDuration.observe(
        { method: req.method, path: normalizedPath },
        durationSeconds
      )

      // Record response size
      const responseSize = parseInt(res.get('content-length') || '0', 10)
      if (responseSize > 0) {
        httpResponseSizeBytes.observe(
          { method: req.method, path: normalizedPath, status: res.statusCode.toString() },
          responseSize
        )
      }

      // Track errors (4xx/5xx)
      if (res.statusCode >= 400) {
        httpErrorsTotal.inc({
          method: req.method,
          path: normalizedPath,
          error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        })
      }
    } catch {
      // Graceful degradation: don't crash on metrics failure
      // Error is already logged by the metrics registry
    }
  })

  next()
}

function normalizePath(path: string): string {
  // Replace UUIDs with :id
  let normalized = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id'
  )

  // Replace numeric IDs with :id
  normalized = normalized.replace(/\/\d+/g, '/:id')

  // Truncate very long paths (avoid unbounded cardinality)
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...'
  }

  return normalized
}
