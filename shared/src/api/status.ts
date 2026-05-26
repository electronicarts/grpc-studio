// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /api/grpc/status
 * Request body: none.
 * Response body: current connection status for the configured gRPC target.
 */
export type StatusRequest = undefined

export interface StatusResponse {
  connected: boolean
  targetServer: string
  servicesCount: number
  error: string | null
}
