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

/**
 * @deprecated CertificateService is deprecated in multi-server mode.
 * Certificate status is now included in the per-server status response from StatusController.
 * This service is kept for backward compatibility but should not be used for new code.
 */
export class CertificateService {
  constructor(private readonly repository: CertificateRepository = certificateRepository) {}

  /**
   * @deprecated Use StatusController which returns certificate info per-server
   */
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

  /**
   * @deprecated Use StatusController which returns certificate info per-server
   */
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
  // TODO: In multi-server mode, this should return certificate info for ALL mTLS targets,
  // not just the first one. For now, this is a known limitation.
  // Consider refactoring to return Map<targetName, certificatePath> or moving certificate
  // status into the per-server discovery/status response.

  const targets = configManager.getTargets()
  const mtlsTarget = targets.find(t => t.mode === 'mtls')

  if (!mtlsTarget || !mtlsTarget.security?.clientCertPath) return null

  certLogger.warn('Certificate service only checks first mTLS target in multi-server mode', {
    target: mtlsTarget.name,
    totalTargets: targets.length,
    mtlsTargets: targets.filter(t => t.mode === 'mtls').length
  })

  return mtlsTarget.security.clientCertPath
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
