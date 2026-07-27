// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Request, Response } from 'express';
import serverCertificateService from '../services/serverCertificateService.js';
import { sendSuccess } from '../utils/responseHelpers.js';
import { AppError } from '../errors/AppError.js';
import logger from '../utils/logger.js';

const controllerLogger = logger.child({ controller: 'certificate-refresh' });

/**
 * POST /api/grpc/certificates/refresh
 * Trigger a manual refresh of all server certificates
 */
export async function refreshAllCertificates(_req: Request, res: Response) {
  controllerLogger.info('Manual certificate refresh triggered');

  try {
    const cached = await serverCertificateService.refreshAllCertificates();

    sendSuccess(res, {
      message: 'Certificates refreshed successfully',
      refreshed: cached.size,
      certificates: Array.from(cached.entries()).map(([target, cert]) => ({
        target,
        success: cert.info !== null,
        expiresIn: cert.info?.daysRemaining,
        lastUpdated: cert.lastUpdated,
        error: cert.error,
      })),
    });
  } catch (error) {
    controllerLogger.error('Certificate refresh failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError('Failed to refresh certificates', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/grpc/certificates/refresh/:targetName
 * Trigger a manual refresh for a specific target
 */
export async function refreshTargetCertificate(req: Request, res: Response) {
  const targetName = req.params.targetName as string;

  controllerLogger.info('Manual certificate refresh triggered for target', { target: targetName });

  try {
    const cached = await serverCertificateService.refreshCertificate(targetName);

    sendSuccess(res, {
      message: `Certificate refreshed for ${targetName}`,
      target: targetName,
      success: cached?.info !== null,
      expiresIn: cached?.info?.daysRemaining,
      lastUpdated: cached?.lastUpdated,
      error: cached?.error,
    });
  } catch (error) {
    controllerLogger.error('Certificate refresh failed for target', {
      target: targetName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(`Failed to refresh certificate for ${targetName}`, 500, 'INTERNAL_ERROR');
  }
}
