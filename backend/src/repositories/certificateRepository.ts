// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Reads client certificate metadata and caches it by certificate path.
 */

import * as certificateMetadataCache from '../cache/certificateMetadataCache.js'
import configManager from '../config/configManager.js'
import type { CertificateMetadata } from '../types/index.js'
import { readLocalCertificateFile } from '../utils/certificateUtils.js'
import logger from '../utils/logger.js'

const certLogger = logger.child({ module: 'certificate-repository' })

// Key: certificate path, for example '/etc/certs/client.pem'.
// Value: parsed certificate metadata, for example { subject, issuer, validFrom, validTo }.
const certificateCache = certificateMetadataCache.createCertificateMetadataCache()

export class CertificateRepository {
  async getCertificateMetadata(certPath: string): Promise<CertificateMetadata> {
    const cached = certificateCache.get(certPath)
    if (cached !== undefined) return cached

    try {
      const { certReadTimeoutMs } = configManager.getCertificateConfig()
      const certInfo = await readLocalCertificateFile(certPath, certReadTimeoutMs)

      if (!certInfo) {
        certLogger.warn('Failed to read certificate', { certPath })
        const certificate: CertificateMetadata = {}
        certificateCache.set(certPath, certificate)
        return certificate
      }

      // Convert to legacy CertificateMetadata format (ISO strings, optional fields)
      const certificate: CertificateMetadata = {
        subject: certInfo.subject,
        validFrom: certInfo.validFrom.toISOString(),
        validTo: certInfo.validTo.toISOString(),
      }

      certLogger.info('Certificate metadata read', {
        validTo: certificate.validTo,
        validFrom: certificate.validFrom,
        subject: certificate.subject,
      })

      certificateCache.set(certPath, certificate)
      return certificate
    } catch (certError) {
      const msg = certError instanceof Error ? certError.message : String(certError)
      certLogger.warn('Failed to read certificate', { error: msg })
      const certificate: CertificateMetadata = {}
      certificateCache.set(certPath, certificate)
      return certificate
    }
  }

  clearCache(): void {
    certificateCache.clear()
  }
}

const certificateRepository = new CertificateRepository()
export default certificateRepository
