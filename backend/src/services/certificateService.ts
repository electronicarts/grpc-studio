// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Reads configured mTLS certificate info for the API and request guard.
 */

import type {
  CertificateConfiguredResponse,
  CertificateNotConfiguredResponse,
  CertificateResponse,
} from '@grpc-studio/shared'
import configManager from '../config/configManager.js'
import certificateRepository, { type CertificateRepository } from '../repositories/certificateRepository.js'
import type { CertCheckResult } from '../types/index.js'
import logger from '../utils/logger.js'
import { buildCertificateInfo, checkCertificateMetadata } from '../utils/certificateStatus.js'

const certLogger = logger.child({ module: 'certificate-service' })

export class CertificateService {
  constructor(private readonly repository: CertificateRepository = certificateRepository) {}

  async checkCertificateValidity(): Promise<CertCheckResult> {
    const certPath = getConfiguredCertificatePath()
    if (!certPath) {
      return { valid: true }
    }

    const metadata = await this.repository.getCertificateMetadata(certPath)
    const result = checkCertificateMetadata(metadata)
    logCertificateResult(result, configManager.getCertificateConfig().warnDaysCritical)

    return result
  }

  async getConfiguredCertificateInfo(): Promise<CertificateResponse> {
    const certPath = getConfiguredCertificatePath()
    if (!certPath) {
      const response: CertificateNotConfiguredResponse = { configured: false }
      return response
    }

    const metadata = await this.repository.getCertificateMetadata(certPath)
    const { warnDaysCritical, warnDaysWarning } = configManager.getCertificateConfig()
    const certificate = buildCertificateInfo(metadata, warnDaysCritical, warnDaysWarning)
    const response: CertificateConfiguredResponse = { configured: true, certificate }
    return response
  }

  clearCache(): void {
    this.repository.clearCache()
  }
}

export default new CertificateService()

function getConfiguredCertificatePath(): string | null {
  const clientConfig = configManager.getClientConfig()
  if (clientConfig.mode !== 'mtls' || !clientConfig.security.clientCertPath) return null

  return clientConfig.security.clientCertPath
}

function logCertificateResult(result: CertCheckResult, warnDaysCritical: number): void {
  if (!result.valid && result.daysRemaining !== undefined && result.daysRemaining < 0) {
    certLogger.error('Certificate expired', {
      daysRemaining: result.daysRemaining,
      expiryDate: result.expiryDate,
    })
    return
  }

  if (result.valid && result.daysRemaining !== undefined && result.daysRemaining < warnDaysCritical) {
    certLogger.warn('Certificate expiring soon', {
      daysRemaining: result.daysRemaining,
      expiryDate: result.expiryDate,
    })
  }
}
