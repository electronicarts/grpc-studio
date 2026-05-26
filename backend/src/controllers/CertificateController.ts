// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Certificate Controller
 * Thin HTTP handler for configured client certificate metadata.
 */

import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/responseHelpers.js';
import certificateService from '../services/certificateService.js';
import type { CertificateResponse } from '@grpc-studio/shared';

/**
 * GET /api/grpc/config/certificate
 * Returns certificate metadata for the configured mTLS client cert.
 */
export async function getCertificateInfo(_req: Request, res: Response) {
  const responseBody: CertificateResponse = await certificateService.getConfiguredCertificateInfo();
  sendSuccess(res, responseBody);
}
