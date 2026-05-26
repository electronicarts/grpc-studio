// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { apiClient } from '../../../lib/http/apiClient'
import type { CertificateResponse } from '@grpc-studio/shared'

export function fetchCertificateInfo(): Promise<CertificateResponse> {
  return apiClient.getCustom<CertificateResponse>('/api/grpc/config/certificate')
}
