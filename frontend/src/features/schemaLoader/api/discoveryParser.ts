// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { ApiServer } from '../../../types/grpc'
import type { BackendDiscoveryResponse } from './discoveryTypes'

export function parseDiscoveryResponse(data: BackendDiscoveryResponse): ApiServer[] {
  if (!data.servers || !Array.isArray(data.servers)) {
    throw new Error('Invalid backend discovery response format')
  }
  return data.servers
}

