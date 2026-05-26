// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Registry } from 'prom-client'
import { metricsRegistry } from './registry.js'

export { metricsRegistry } from './registry.js'
export * from './collectors/cacheMetrics.js'
export * from './collectors/grpcMetrics.js'
export * from './collectors/httpMetrics.js'
export * from './collectors/websocketMetrics.js'

export function initializeMetrics(
  includeSystemMetrics = true,
  defaultLabels?: Record<string, string>
): void {
  metricsRegistry.initialize({ includeSystemMetrics, defaultLabels })
}

export async function getMetrics(): Promise<string> {
  return metricsRegistry.getMetrics()
}

export function getRegistry(): Registry {
  return metricsRegistry.getRegistry()
}
