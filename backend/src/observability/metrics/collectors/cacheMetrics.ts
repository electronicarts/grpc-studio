// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { metricsRegistry } from '../registry.js'

export const cacheOperationsTotal = metricsRegistry.counter(
  'grpc_studio_cache_operations_total',
  'Total cache operations',
  ['cache', 'operation', 'result']  // operation: get/set/delete, result: hit/miss/success
)

export const cacheEntries = metricsRegistry.gauge(
  'grpc_studio_cache_entries',
  'Current cache entries',
  ['cache']
)

export const cacheEvictionsTotal = metricsRegistry.counter(
  'grpc_studio_cache_evictions_total',
  'Total cache evictions',
  ['cache', 'reason']  // reason: capacity/ttl
)
