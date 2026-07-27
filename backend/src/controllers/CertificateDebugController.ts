// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import serverCertificateService from '../services/serverCertificateService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

const controllerLogger = logger.child({ controller: 'certificate-debug' });

/**
 * GET /api/grpc/certificates/debug
 * Show current certificate cache status for debugging
 */
export async function debugCertificates(_req: Request, res: Response) {
  controllerLogger.info('Certificate debug info requested');

  const allCerts = serverCertificateService.getAllCertificates();

  const debug = Array.from(allCerts.entries()).map(([target, cached]) => ({
    target,
    hasCertificate: cached.info !== null,
    lastUpdated: cached.lastUpdated,
    error: cached.error || (cached.info === null ? 'Certificate extraction returned null' : undefined),
    certificateInfo: cached.info ? {
      subject: cached.info.subject,
      issuer: cached.info.issuer,
      validFrom: cached.info.validFrom,
      validTo: cached.info.validTo,
      daysRemaining: cached.info.daysRemaining,
    } : null,
  }));

  sendSuccess(res, {
    totalCached: allCerts.size,
    certificates: debug,
  });
}
