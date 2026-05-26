// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export const HealthStatus = {
  HEALTHY: 'healthy',
  READY: 'ready',
  NOT_READY: 'not ready',
  ALIVE: 'alive',
} as const

export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus]

export const HEALTH_STATUSES = Object.values(HealthStatus)

/**
 * GET /health
 * Request body: none.
 * Response body: application health probe payload.
 */
export type HealthRequest = undefined

export interface HealthResponse {
  status: typeof HealthStatus.HEALTHY
  timestamp: string
  uptime: number
  version?: string
}

/**
 * GET /ready
 * Request body: none.
 * Response body: Kubernetes readiness probe payload.
 */
export type ReadinessRequest = undefined

export interface ReadinessReadyResponse {
  status: typeof HealthStatus.READY
  timestamp: string
}

export interface ReadinessNotReadyResponse {
  status: typeof HealthStatus.NOT_READY
  timestamp: string
}

export type ReadinessResponse =
  | ReadinessReadyResponse
  | ReadinessNotReadyResponse

/**
 * GET /live
 * Request body: none.
 * Response body: Kubernetes liveness probe payload.
 */
export type LivenessRequest = undefined

export interface LivenessResponse {
  status: typeof HealthStatus.ALIVE
  timestamp: string
}
