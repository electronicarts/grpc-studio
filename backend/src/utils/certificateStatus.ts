// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { CertificateStatus, type CertificateInfo } from '@grpc-studio/shared'
import type { CertificateMetadata, CertCheckResult } from '../types/index.js'

const MILLISECONDS_PER_HOUR = 1000 * 60 * 60
const HOURS_PER_DAY = 24

export function buildCertificateInfo(
  metadata: CertificateMetadata,
  warnDaysCritical: number,
  warnDaysWarning: number,
  now = new Date()
): CertificateInfo {
  if (isEmptyCertificateMetadata(metadata)) {
    return { status: CertificateStatus.UNREADABLE, error: 'Could not read certificate metadata' }
  }

  const validFrom = parseDate(metadata.validFrom)
  const validTo = parseDate(metadata.validTo)
  const daysRemaining = getDaysUntil(validTo, now.getTime())

  return {
    status: getCertificateStatus(daysRemaining, warnDaysCritical, warnDaysWarning),
    subject: metadata.subject ?? null,
    validFrom: metadata.validFrom,
    validTo: metadata.validTo,
    daysRemaining,
    isNotYetValid: validFrom !== null && validFrom > now,
    isExpiringSoon: daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining < warnDaysWarning,
    isExpired: daysRemaining !== null && daysRemaining < 0,
  }
}

export function checkCertificateMetadata(metadata: CertificateMetadata, nowMs = Date.now()): CertCheckResult {
  if (isEmptyCertificateMetadata(metadata)) {
    return { valid: false, error: 'Could not read certificate metadata' }
  }

  const expiryDate = parseDate(metadata.validTo)
  if (!expiryDate) {
    return { valid: false, error: 'Could not read certificate expiry date' }
  }

  const hoursRemaining = getHoursUntil(expiryDate, nowMs)
  const daysRemaining = Math.floor(hoursRemaining / HOURS_PER_DAY)
  const resultBase = {
    daysRemaining,
    expiryDate,
    subject: metadata.subject ?? 'Unknown',
  }

  if (daysRemaining < 0) {
    return {
      valid: false,
      error: `mTLS certificate expired ${formatExpiredAge(daysRemaining, hoursRemaining)}`,
      ...resultBase,
    }
  }

  return {
    valid: true,
    ...resultBase,
  }
}

function isEmptyCertificateMetadata(metadata: CertificateMetadata): boolean {
  return Object.keys(metadata).length === 0
}

function getCertificateStatus(
  daysRemaining: number | null,
  warnDaysCritical: number,
  warnDaysWarning: number
): Exclude<CertificateStatus, typeof CertificateStatus.UNREADABLE> {
  if (daysRemaining === null) return CertificateStatus.UNKNOWN
  if (daysRemaining < 0) return CertificateStatus.EXPIRED
  if (daysRemaining < warnDaysCritical) return CertificateStatus.CRITICAL
  if (daysRemaining < warnDaysWarning) return CertificateStatus.WARNING

  return CertificateStatus.VALID
}

function getDaysUntil(date: Date | null, nowMs: number): number | null {
  if (!date) return null

  return Math.floor(getHoursUntil(date, nowMs) / HOURS_PER_DAY)
}

function getHoursUntil(date: Date, nowMs: number): number {
  return Math.floor((date.getTime() - nowMs) / MILLISECONDS_PER_HOUR)
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatExpiredAge(daysRemaining: number, hoursRemaining: number): string {
  const absHours = Math.abs(hoursRemaining)

  if (absHours < HOURS_PER_DAY) {
    return formatUnit(absHours, 'hour')
  }

  return formatUnit(Math.abs(daysRemaining), 'day')
}

function formatUnit(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}
