// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { metricsRegistry } from '../registry.js'
import { getHistogramBuckets } from '../histograms.js'

// HTTP request metrics (RED method)
export const httpRequestsTotal = metricsRegistry.counter(
  'grpc_studio_http_requests_total',
  'Total HTTP requests',
  ['method', 'path', 'status']
)

export const httpRequestDuration = metricsRegistry.histogram(
  'grpc_studio_http_request_duration_seconds',
  'HTTP request duration in seconds',
  ['method', 'path'],
  getHistogramBuckets('http')
)

export const httpErrorsTotal = metricsRegistry.counter(
  'grpc_studio_http_errors_total',
  'Total HTTP errors',
  ['method', 'path', 'error_type']
)

export const httpRequestSizeBytes = metricsRegistry.histogram(
  'grpc_studio_http_request_size_bytes',
  'HTTP request size in bytes',
  ['method', 'path'],
  getHistogramBuckets('size')
)

export const httpResponseSizeBytes = metricsRegistry.histogram(
  'grpc_studio_http_response_size_bytes',
  'HTTP response size in bytes',
  ['method', 'path', 'status'],
  getHistogramBuckets('size')
)
