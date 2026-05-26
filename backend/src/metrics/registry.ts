// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client'
import logger from '../utils/logger.js'

const observabilityLogger = logger.child({ module: 'observability' })

class MetricsRegistry {
  private readonly registry: Registry
  private initialized = false

  constructor() {
    this.registry = new Registry()
  }

  initialize(config: { includeSystemMetrics?: boolean; defaultLabels?: Record<string, string> }): void {
    if (this.initialized) {
      observabilityLogger.warn('Metrics registry already initialized')
      return
    }

    // Set default labels if provided
    if (config.defaultLabels) {
      this.registry.setDefaultLabels(config.defaultLabels)
    }

    // Register default Node.js metrics
    if (config.includeSystemMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: 'grpc_studio_',
      })
      observabilityLogger.info('System metrics collection enabled')
    }

    this.initialized = true
    observabilityLogger.info('Metrics registry initialized')
  }

  counter(name: string, help: string, labelNames: string[] = []): Counter {
    const existing = this.registry.getSingleMetric(name)
    if (existing) return existing as Counter

    return new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry],
    })
  }

  gauge(name: string, help: string, labelNames: string[] = []): Gauge {
    const existing = this.registry.getSingleMetric(name)
    if (existing) return existing as Gauge

    return new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry],
    })
  }

  histogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram {
    const existing = this.registry.getSingleMetric(name)
    if (existing) return existing as Histogram

    return new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    })
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  getRegistry(): Registry {
    return this.registry
  }

  clear(): void {
    this.registry.clear()
    this.initialized = false
    observabilityLogger.info('Metrics registry cleared')
  }
}

// Singleton instance
export const metricsRegistry = new MetricsRegistry()
