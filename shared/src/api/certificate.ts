// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * GET /api/grpc/config/certificate
 * Request body: none.
 * Response body: configured mTLS client certificate metadata, when available.
 */
export type CertificateRequest = undefined

export const CertificateStatus = {
  VALID: 'valid',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EXPIRED: 'expired',
  UNKNOWN: 'unknown',
  UNREADABLE: 'unreadable',
} as const

export type CertificateStatus = typeof CertificateStatus[keyof typeof CertificateStatus]

export const CERTIFICATE_STATUSES = Object.values(CertificateStatus)

export interface CertificateReadableInfo {
  status: Exclude<CertificateStatus, typeof CertificateStatus.UNREADABLE>
  subject: string | null
  validFrom?: string
  validTo?: string
  daysRemaining: number | null
  isNotYetValid: boolean
  isExpiringSoon: boolean
  isExpired: boolean
}

export interface CertificateUnreadableInfo {
  status: typeof CertificateStatus.UNREADABLE
  error: string
}

export type CertificateInfo =
  | CertificateReadableInfo
  | CertificateUnreadableInfo

export interface CertificateNotConfiguredResponse {
  configured: false
}

export interface CertificateConfiguredResponse {
  configured: true
  certificate: CertificateInfo
}

export type CertificateResponse =
  | CertificateNotConfiguredResponse
  | CertificateConfiguredResponse
