// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { apiClient } from '@/lib/http/apiClient'
import type { ConnectionStatus } from '../types'
import type { StatusResponse } from '@grpc-studio/shared'

export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const data = await apiClient.get<StatusResponse>('status')
  return {
    connected: data.connected,
    targetServer: data.targetServer,
    servicesCount: data.servicesCount,
    error: data.error,
    loading: false,
  }
}
