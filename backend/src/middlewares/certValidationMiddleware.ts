// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Certificate Validation Middleware
 *
 * Checks mTLS certificate validity before allowing requests through to
 * controllers that make gRPC connections. Returns a standardised 401 if
 * the certificate is invalid or unreadable.
 */

import type { Request, Response, NextFunction } from 'express';
import certificateService from '../services/certificateService.js';
import type { CertCheckResult } from '../types/index.js';
import { sendError } from '../utils/responseHelpers.js';

export async function requireValidCertificate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const certCheck = await certificateService.checkCertificateValidity() as CertCheckResult;

  if (!certCheck.valid) {
    sendError(req, res, 401, 'CERTIFICATE_INVALID', certCheck.error || 'Client certificate is invalid or expired');
    return;
  }

  // Attach to request so controllers can read cert metadata without re-checking
  req.certCheck = certCheck;
  next();
}
