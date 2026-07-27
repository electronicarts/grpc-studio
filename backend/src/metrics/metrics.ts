// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Barrel re-export of the metric instruments defined by each collector.
 * The registry lifecycle (initialize/getMetrics/getRegistry) lives on
 * `metricsRegistry` in ./registry.js and is used directly by its callers.
 */

export * from './collectors/cacheMetrics.js'
export * from './collectors/grpcMetrics.js'
export * from './collectors/httpMetrics.js'
export * from './collectors/websocketMetrics.js'
