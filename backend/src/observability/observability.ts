// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ObservabilityConfig } from '../config/schemas/observabilitySchema.js'
import { metricsRegistry } from '../metrics/registry.js'
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

    this.initialized = true
    observabilityLogger.info('Observability fully initialized')
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return

    metricsRegistry.clear()

    this.initialized = false
    observabilityLogger.info('Observability shut down')
  }
}

export const observabilityManager = new ObservabilityManager()

// Re-export public APIs
export { metricsRegistry } from '../metrics/registry.js'
export { metricsMiddleware, httpMetricsMiddleware } from '../middlewares/metricsMiddleware.js'
export { metricsEndpoint } from '../controllers/MetricsController.js'
export { instrumentUnaryCall, instrumentStreamCall, recordStreamMessageSent } from '../grpc/instrumentation/grpcInstrumentation.js'
export type {
  MetricsConfig,
  ObservabilityConfig,
  PerformanceConfig,
} from '../config/schemas/observabilitySchema.js'
