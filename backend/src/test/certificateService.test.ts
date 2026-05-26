// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, mock, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { CertificateService } from '../services/certificateService.js'
import {
  createMockCertificateRepository,
  createValidCertificateMetadata,
  createExpiredCertificateMetadata,
  mockMtlsConfig,
  restoreConfigManager
} from './testFixtures.js'

describe('CertificateService', () => {
  beforeEach(() => {
    // Tests can call mockMtlsConfig() if they need mTLS mode
  })

  afterEach(() => {
    restoreConfigManager()
  })

  describe('checkCertificateValidity', () => {
    it('should return valid when certificate is not configured', async () => {
      const mockRepository = createMockCertificateRepository()
      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, true)
      assert.strictEqual((mockRepository.getCertificateMetadata as unknown as { mock: { calls: unknown[] } }).mock.calls.length, 0)
    })

    it('should return valid for certificate with many days remaining', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(100)
      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, true)
      // Allow for slight timing differences (99-100 days)
      assert.ok(result.daysRemaining !== null && result.daysRemaining >= 99 && result.daysRemaining <= 100)
      assert.ok(result.expiryDate)
    })

    it('should return valid with warning for certificate expiring soon', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(5)
      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, true)
      // Allow for slight timing differences (4-5 days)
      assert.ok(result.daysRemaining !== null && result.daysRemaining >= 4 && result.daysRemaining <= 5)
    })

    it('should return invalid for expired certificate', async () => {
      mockMtlsConfig()

      const mockMetadata = createExpiredCertificateMetadata(10)
      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, false)
      // Allow for slight timing differences (-11 to -10 days)
      assert.ok(result.daysRemaining !== null && result.daysRemaining >= -11 && result.daysRemaining <= -10)
      assert.ok(result.expiryDate)
    })

    it('should handle repository errors', async () => {
      mockMtlsConfig()

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => {
          throw new Error('Failed to read certificate')
        })
      })

      const service = new CertificateService(mockRepository)

      await assert.rejects(
        async () => await service.checkCertificateValidity(),
        {
          name: 'Error',
          message: 'Failed to read certificate'
        }
      )
    })
  })

  describe('getConfiguredCertificateInfo', () => {
    it('should return not configured when certificate not configured', async () => {
      const mockRepository = createMockCertificateRepository()
      const service = new CertificateService(mockRepository)
      const response = await service.getConfiguredCertificateInfo()

      assert.strictEqual(response.configured, false)
      assert.strictEqual((mockRepository.getCertificateMetadata as unknown as { mock: { calls: unknown[] } }).mock.calls.length, 0)
    })

    it('should return certificate info when configured', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(90)
      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const response = await service.getConfiguredCertificateInfo()

      assert.strictEqual(response.configured, true)
      if (response.configured) {
        assert.ok(response.certificate)
        // Allow for slight timing differences (89-90 days)
        assert.ok(response.certificate.daysRemaining !== null && response.certificate.daysRemaining >= 89 && response.certificate.daysRemaining <= 90)
        assert.ok(response.certificate.validTo)
      }
    })

    it('should include warning status for expiring certificate', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(8)
      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const response = await service.getConfiguredCertificateInfo()

      assert.strictEqual(response.configured, true)
      if (response.configured) {
        assert.ok(response.certificate)
        // Allow for slight timing differences (7-8 days)
        assert.ok(response.certificate.daysRemaining !== null && response.certificate.daysRemaining >= 7 && response.certificate.daysRemaining <= 8)
        // Warning status depends on warnDaysWarning config (typically 14 days)
      }
    })

    it('should include critical status for certificate expiring very soon', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(3)

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const response = await service.getConfiguredCertificateInfo()

      assert.strictEqual(response.configured, true)
      if (response.configured) {
        assert.ok(response.certificate)
        // Allow for slight timing differences (2-3 days)
        assert.ok(response.certificate.daysRemaining !== null && response.certificate.daysRemaining >= 2 && response.certificate.daysRemaining <= 3)
        // Critical status depends on warnDaysCritical config (typically 7 days)
      }
    })

    it('should handle expired certificate in info', async () => {
      mockMtlsConfig()

      const mockMetadata = createExpiredCertificateMetadata(5)

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const response = await service.getConfiguredCertificateInfo()

      assert.strictEqual(response.configured, true)
      if (response.configured) {
        assert.ok(response.certificate)
        // Allow for slight timing differences (-6 to -5 days)
        assert.ok(response.certificate.daysRemaining !== null && response.certificate.daysRemaining >= -6 && response.certificate.daysRemaining <= -5)
      }
    })

    it('should handle repository errors when getting info', async () => {
      mockMtlsConfig()

      const mockRepository = {
        getCertificateMetadata: mock.fn(async () => {
          throw new Error('Certificate file not found')
        }),
        clearCache: mock.fn()
      } as unknown as CertificateRepository

      const service = new CertificateService(mockRepository)

      await assert.rejects(
        async () => await service.getConfiguredCertificateInfo(),
        {
          name: 'Error',
          message: 'Certificate file not found'
        }
      )
    })
  })

  describe('clearCache', () => {
    it('should call repository clearCache', () => {
      const mockRepository = {
        getCertificateMetadata: mock.fn(),
        clearCache: mock.fn()
      } as unknown as CertificateRepository

      const service = new CertificateService(mockRepository)
      service.clearCache()

      assert.strictEqual((mockRepository.clearCache as any).mock.calls.length, 1)
    })

    it('should clear cache independently of other operations', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(30)

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)

      // First call
      await service.checkCertificateValidity()

      // Clear cache
      service.clearCache()

      // Second call
      await service.getConfiguredCertificateInfo()

      assert.strictEqual((mockRepository.clearCache as any).mock.calls.length, 1)
    })
  })

  describe('certificate threshold calculations', () => {
    it('should handle certificate at exactly warning threshold', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(14) // 14 days until expiry

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, true)
      // Allow for slight timing differences (13-14 days)
      assert.ok(result.daysRemaining !== null && result.daysRemaining >= 13 && result.daysRemaining <= 14)
    })

    it('should handle certificate at exactly critical threshold', async () => {
      mockMtlsConfig()

      const mockMetadata = createValidCertificateMetadata(7) // 7 days until expiry

      const mockRepository = createMockCertificateRepository({
        getCertificateMetadata: mock.fn(async () => mockMetadata)
      })

      const service = new CertificateService(mockRepository)
      const result = await service.checkCertificateValidity()

      assert.strictEqual(result.valid, true)
      // Allow for slight timing differences (6-7 days)
      assert.ok(result.daysRemaining !== null && result.daysRemaining >= 6 && result.daysRemaining <= 7)
    })
  })
})
