// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { apiClient } from '@/lib/http/apiClient'
import type { ServerConnectionStatus } from '../types'
import type { StatusResponse } from '@grpc-studio/shared'

export async function fetchConnectionStatus(): Promise<ServerConnectionStatus> {
  const data = await apiClient.get<StatusResponse>('status')
  return {
    servers: data.servers,
    loading: false,
  }
}
