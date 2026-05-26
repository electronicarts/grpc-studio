// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ObservabilityConfig } from './types.js'
import { metricsRegistry } from './metrics/registry.js'
import { initializeTracing, shutdownTracing } from './tracing/tracer.js'
import logger from '../utils/logger.js'

const observabilityLogger = logger.child({ module: 'observability' })

export class ObservabilityManager {
  private initialized = false

  initialize(config: ObservabilityConfig): void {
    if (!config.enabled) {
      observabilityLogger.info('Observability disabled')
      return
    }

    if (this.initialized) {
      observabilityLogger.warn('Observability already initialized')
      return
    }

    // Initialize metrics
    if (config.metrics?.enabled) {
      metricsRegistry.initialize({
        includeSystemMetrics: config.metrics.includeSystemMetrics,
        defaultLabels: config.metrics.defaultLabels,
      })
      observabilityLogger.info('Metrics initialized')
    }

    // Initialize tracing
    if (config.tracing?.enabled) {
      initializeTracing(config.tracing)
      observabilityLogger.info('Tracing initialized')
    }

    this.initialized = true
    observabilityLogger.info('Observability fully initialized')
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return

    await shutdownTracing()
    metricsRegistry.clear()

    this.initialized = false
    observabilityLogger.info('Observability shut down')
  }
}

export const observabilityManager = new ObservabilityManager()

// Re-export public APIs
export { metricsRegistry } from './metrics/registry.js'
export { httpMetricsMiddleware } from './metrics/middleware/metricsMiddleware.js'
export { metricsEndpoint } from './metrics/middleware/metricsEndpoint.js'
export { instrumentUnaryCall, instrumentStreamCall, recordStreamMessageSent } from './instrumentation/grpcInstrumentation.js'
export * from './types.js'
