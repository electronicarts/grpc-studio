// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Pre-configured histogram buckets for different metric types.
 *
 * Buckets follow Prometheus best practices:
 * - Exponential distribution
 * - Cover expected range + outliers
 * - Keep bucket count reasonable (<20)
 */

export const HISTOGRAM_BUCKETS = {
  // HTTP request duration (milliseconds → seconds)
  // Covers: 1ms to 5s
  http: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],

  // gRPC request duration (milliseconds → seconds)
  // Covers: 5ms to 10s (gRPC typically slower than HTTP)
  grpc: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],

  // WebSocket connection duration (seconds)
  // Covers: 1s to 1 hour
  websocket: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],

  // Payload size (bytes)
  // Covers: 100 bytes to 10MB
  size: [100, 1000, 10000, 100000, 1000000, 10000000],

  // Cache operation duration (microseconds → seconds)
  // Covers: 100µs to 100ms
  cache: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
}

export type HistogramType = keyof typeof HISTOGRAM_BUCKETS

export function getHistogramBuckets(type: HistogramType): number[] {
  return HISTOGRAM_BUCKETS[type]
}
