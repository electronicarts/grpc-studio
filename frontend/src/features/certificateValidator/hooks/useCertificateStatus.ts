// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCertificateInfo } from '../api/fetchCertificateInfo'
import { statusConfigs } from '../constants/statusConfigs'
import type { CertificateInfo } from '@grpc-studio/shared'
import type { StatusConfig } from '../types'

type ReadableCertificateInfo = Exclude<CertificateInfo, { status: 'unreadable' }>

function isReadableCertificate(certificate: CertificateInfo | null): certificate is ReadableCertificateInfo {
  return certificate !== null && certificate.status !== 'unreadable'
}

function sameDayExpiryDelta(validTo: string): { hours: number; minutes: number } {
  const now = new Date()
  const expiry = new Date(validTo)
  const millisecondsRemaining = expiry.getTime() - now.getTime()
  return {
    hours: Math.floor(millisecondsRemaining / (1000 * 60 * 60)),
    minutes: Math.floor(millisecondsRemaining / (1000 * 60)) % 60,
  }
}

export interface UseCertificateStatusOptions {
  pollingInterval?: number
  enabled?: boolean
}

export interface UseCertificateStatusResult {
  loading: boolean
  configured: boolean
  certificate: CertificateInfo | null
  refresh: () => Promise<void>
  formatTimeRemaining: () => string | null
  getShortDisplay: () => string
  getStatusConfig: () => StatusConfig
}

export function useCertificateStatus(
  options: UseCertificateStatusOptions = {}
): UseCertificateStatusResult {
  const {
    pollingInterval = 60000,
    enabled = true
  } = options

  const { data, isPending, refetch } = useQuery({
    queryKey: ['certificateInfo'],
    queryFn: fetchCertificateInfo,
    refetchInterval: pollingInterval,
    enabled,
  })

  const certificate: CertificateInfo | null = data?.configured ? data.certificate : null
  const configured = data?.configured ?? false

  const refresh = useCallback(async () => { await refetch() }, [refetch])

  const formatTimeRemaining = useCallback((): string | null => {
    if (!isReadableCertificate(certificate)) {
      return null
    }

    if (certificate.daysRemaining === null) {
      return null
    }

    const { daysRemaining, validTo } = certificate

    if (daysRemaining < 0) {
      return `Expired ${Math.abs(daysRemaining)} days ago`
    }

    if (daysRemaining === 0 && validTo) {
      const { hours, minutes } = sameDayExpiryDelta(validTo)

      if (hours > 0) {
        return `${hours}h ${minutes}m remaining`
      } else if (minutes > 0) {
        return `${minutes}m remaining`
      } else {
        return 'Expiring now!'
      }
    }

    if (daysRemaining <= 7) {
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
    }

    return `${daysRemaining} days remaining`
  }, [certificate])

  const getStatusConfig = useCallback((): StatusConfig => {
    return statusConfigs[certificate?.status || 'unknown']
  }, [certificate])

  const getShortDisplay = useCallback((): string => {
    const config = getStatusConfig()

    if (!isReadableCertificate(certificate) || certificate.daysRemaining === null) {
      return config.label
    }

    const { daysRemaining, validTo } = certificate

    if (daysRemaining < 0) {
      return 'Expired'
    }

    if (daysRemaining === 0 && validTo) {
      const { hours, minutes } = sameDayExpiryDelta(validTo)

      if (hours > 0) {
        return `${hours}h ${minutes}m`
      }
      return `${minutes}m`
    }

    return `${daysRemaining}d`
  }, [certificate, getStatusConfig])

  return {
    loading: isPending,
    configured,
    certificate,
    refresh,
    formatTimeRemaining,
    getShortDisplay,
    getStatusConfig
  }
}
