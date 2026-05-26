// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { apiClient } from '../../../lib/http/apiClient'
import type { InvokeUnaryRequest, InvokeUnaryResponse } from '@grpc-studio/shared'

export type { InvokeUnaryRequest, InvokeUnaryResponse } from '@grpc-studio/shared'

export async function invokeUnary(req: InvokeUnaryRequest): Promise<InvokeUnaryResponse> {
  return apiClient.postCustom<InvokeUnaryResponse>('/api/grpc/invoke', req)
}
