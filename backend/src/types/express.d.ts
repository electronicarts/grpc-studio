// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.
// Express Request augmentation — extends the base Request with app-level fields.

import type { UserContext, CertCheckResult } from './index.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Unique request ID (set by loggingMiddleware) */
      id?: string;
      /** Authenticated user context from SSO proxy headers */
      userContext?: UserContext;
      /** mTLS certificate check result (set by requireValidCertificate) */
      certCheck?: CertCheckResult;
    }
  }
}

export {};
