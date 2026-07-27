// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

export const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:4173']

type OriginPolicyRejectReason =
  | 'missing_origin'
  | 'origin_not_allowed'

export interface OriginPolicyOptions {
  enabled?: boolean
  origins?: string[]
  credentials?: boolean
  allowMissingOrigin?: boolean
}

export interface OriginPolicyDecision {
  allowed: boolean
  reason?: OriginPolicyRejectReason
}

export function validateOriginPolicy({
  enabled = true,
  origins = DEFAULT_ALLOWED_ORIGINS,
  credentials = true,
}: OriginPolicyOptions = {}): void {
  if (!enabled) return

  if (origins.includes('*') && credentials) {
    throw new Error(
      'CORS misconfiguration: wildcard origin (*) cannot be combined with credentials=true. ' +
      'Specify explicit origins instead.'
    )
  }
}

export function evaluateOriginPolicy(
  origin: string | undefined,
  {
    enabled = true,
    origins = DEFAULT_ALLOWED_ORIGINS,
    credentials = true,
    allowMissingOrigin = true,
  }: OriginPolicyOptions = {}
): OriginPolicyDecision {
  validateOriginPolicy({ enabled, origins, credentials })

  if (!enabled) {
    return { allowed: true }
  }

  if (!origin) {
    return allowMissingOrigin
      ? { allowed: true }
      : { allowed: false, reason: 'missing_origin' }
  }

  if (origins.includes(origin) || (!credentials && origins.includes('*'))) {
    return { allowed: true }
  }

  return { allowed: false, reason: 'origin_not_allowed' }
}
