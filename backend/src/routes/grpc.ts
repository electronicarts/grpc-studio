// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { Router } from 'express';
import { discover } from '../controllers/DiscoveryController.js';
import { getDescriptorSet } from '../controllers/DescriptorSetController.js';
import { invoke } from '../controllers/InvocationController.js';
import { getConfig } from '../controllers/ConfigController.js';
import { getCertificateInfo } from '../controllers/CertificateController.js';
import { getStatus } from '../controllers/StatusController.js';
import { refreshAllCertificates, refreshTargetCertificate } from '../controllers/CertificateRefreshController.js';
import { debugCertificates } from '../controllers/CertificateDebugController.js';
import { requireValidCertificate } from '../middlewares/certValidationMiddleware.js';
import { isMethodKind, isNonEmptyString, validate } from '../middlewares/validateMiddleware.js';

const router = Router();

// gRPC service discovery
router.post('/discover', requireValidCertificate, discover);

// Descriptor set operations
router.post('/descriptor-set',
  validate({ body: { messageType: isNonEmptyString('messageType') } }),
  getDescriptorSet
);

// Method invocation
router.post('/invoke',
  validate({ body: {
    service: isNonEmptyString('service'),
    method:  isNonEmptyString('method'),
    methodKind: isMethodKind('methodKind'),
  } }),
  requireValidCertificate,
  invoke
);

// Connection status
router.get('/status', requireValidCertificate, getStatus);

// Configuration
router.get('/config', getConfig);
router.get('/config/certificate', getCertificateInfo);

// Certificate refresh
router.post('/certificates/refresh', refreshAllCertificates);
router.post('/certificates/refresh/:targetName', refreshTargetCertificate);
router.get('/certificates/debug', debugCertificates);

export default router;
