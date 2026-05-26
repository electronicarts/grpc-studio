// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { GrpcService } from '../../../types/grpc'
import type { BackendDiscoveryResponse } from './discoveryTypes'

export function parseDiscoveryResponse(data: BackendDiscoveryResponse): GrpcService[] {
  if (!data.services || !Array.isArray(data.services)) {
    throw new Error('Invalid backend discovery response format')
  }
  return data.services
}

