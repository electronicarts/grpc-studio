// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { metricsRegistry } from '../registry.js'
import { getHistogramBuckets } from '../../performance/histograms.js'

export const wsConnectionsTotal = metricsRegistry.counter(
  'grpc_studio_ws_connections_total',
  'Total WebSocket connections',
  ['status']  // accepted, rejected
)

export const wsActiveConnections = metricsRegistry.gauge(
  'grpc_studio_ws_active_connections',
  'Active WebSocket connections'
)

export const wsConnectionDuration = metricsRegistry.histogram(
  'grpc_studio_ws_connection_duration_seconds',
  'WebSocket connection duration in seconds',
  [],
  getHistogramBuckets('websocket')
)

export const wsMessagesTotal = metricsRegistry.counter(
  'grpc_studio_ws_messages_total',
  'Total WebSocket messages',
  ['direction']  // received, sent
)

export const wsMessageSizeBytes = metricsRegistry.histogram(
  'grpc_studio_ws_message_size_bytes',
  'WebSocket message size in bytes',
  ['direction'],
  getHistogramBuckets('size')
)
