// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Router } from 'express'
import { discover } from '#src/controllers/DiscoveryController.js'
import { getDescriptorSet } from '#src/controllers/DescriptorSetController.js'
import { invoke } from '#src/controllers/InvocationController.js'
import { getConfig } from '#src/controllers/ConfigController.js'
import { getCertificateInfo } from '#src/controllers/CertificateController.js'
import { getStatus } from '#src/controllers/StatusController.js'
import { refreshAllCertificates, refreshTargetCertificate } from '#src/controllers/CertificateRefreshController.js'
import { debugCertificates } from '#src/controllers/CertificateDebugController.js'
import { requireValidCertificate } from '#src/middlewares/certValidationMiddleware.js'
import { isMethodKind, isNonEmptyString, validate } from '#src/middlewares/validateMiddleware.js'

const router = Router()

// gRPC service discovery
router.post('/discover', requireValidCertificate, discover)

// Descriptor set operations
router.post('/descriptor-set', validate({ body: { messageType: isNonEmptyString('messageType') } }), getDescriptorSet)

// Method invocation
router.post(
  '/invoke',
  validate({
    body: {
      service: isNonEmptyString('service'),
      method: isNonEmptyString('method'),
      methodKind: isMethodKind('methodKind'),
    },
  }),
  requireValidCertificate,
  invoke,
)

// Connection status
router.get('/status', requireValidCertificate, getStatus)

// Configuration
router.get('/config', getConfig)
router.get('/config/certificate', getCertificateInfo)

// Certificate refresh
router.post('/certificates/refresh', refreshAllCertificates)
router.post('/certificates/refresh/:targetName', refreshTargetCertificate)
router.get('/certificates/debug', debugCertificates)

export default router
