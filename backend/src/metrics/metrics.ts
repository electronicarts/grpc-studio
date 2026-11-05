// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Barrel re-export of the metric instruments defined by each collector.
 * The registry lifecycle (initialize/getMetrics/getRegistry) lives on
 * `metricsRegistry` in ./registry.js and is used directly by its callers.
 */

export * from '#src/metrics/collectors/cacheMetrics.js'
export * from '#src/metrics/collectors/grpcMetrics.js'
export * from '#src/metrics/collectors/httpMetrics.js'
export * from '#src/metrics/collectors/websocketMetrics.js'
