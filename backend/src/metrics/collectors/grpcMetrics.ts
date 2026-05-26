// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { metricsRegistry } from '../registry.js'
import { getHistogramBuckets } from '../histograms.js'

// gRPC invocation metrics
export const grpcRequestsTotal = metricsRegistry.counter(
  'grpc_studio_grpc_requests_total',
  'Total gRPC requests',
  ['service', 'method', 'rpc_type', 'status']
)

export const grpcRequestDuration = metricsRegistry.histogram(
  'grpc_studio_grpc_request_duration_seconds',
  'gRPC request duration in seconds',
  ['service', 'method', 'rpc_type'],
  getHistogramBuckets('grpc')
)

export const grpcActiveStreams = metricsRegistry.gauge(
  'grpc_studio_grpc_active_streams',
  'Active gRPC streams',
  ['service', 'method', 'rpc_type']
)

export const grpcStreamMessages = metricsRegistry.counter(
  'grpc_studio_grpc_stream_messages_total',
  'Total gRPC stream messages',
  ['service', 'method', 'direction']
)
