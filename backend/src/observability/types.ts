// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Type definitions for observability infrastructure.
 */

export interface ObservabilityConfig {
  enabled: boolean
  metrics?: MetricsConfig
  tracing?: TracingConfig
  performance?: PerformanceConfig
}

export interface MetricsConfig {
  enabled: boolean
  path: string
  includeSystemMetrics: boolean
  defaultLabels?: Record<string, string>
}

export interface TracingConfig {
  enabled: boolean
  serviceName: string
  exporter: 'console' | 'otlp'
  otlpEndpoint?: string
  sampleRate: number
}

export interface PerformanceConfig {
  trackSlowOperations: boolean
  slowThresholdMs: number
}

export interface MetricLabels {
  [key: string]: string | number
}

export type HistogramType = 'http' | 'grpc' | 'websocket' | 'size' | 'cache'
