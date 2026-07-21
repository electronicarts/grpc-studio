// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /api/grpc/status
 * Request body: none.
 * Response body: current connection status for the configured gRPC target(s).
 */
export type StatusRequest = undefined

interface CertificateInfo {
  configured: boolean
  expiresAt?: string
  daysRemaining?: number
  status?: 'valid' | 'warning' | 'critical' | 'expired'
  issuer?: string
  subject?: string
}

export interface ServerStatus {
  /**
   * Target name from config
   */
  name: string
  /**
   * Target address (host:port)
   */
  target: string
  connected: boolean
  servicesCount: number
  error: string | null
  /**
   * Certificate information for this target
   */
  certificate?: {
    /**
     * Client certificate (gRPC Studio's cert used for mTLS auth to target)
     */
    clientCert?: CertificateInfo
    /**
     * Server certificate (target server's TLS cert)
     */
    serverCert?: CertificateInfo
  } | null
}

export interface StatusResponse {
  /**
   * Status for each configured target server
   */
  servers: ServerStatus[]
}
