// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useQuery } from '@tanstack/react-query'
import type { ConnectionStatus } from '../types'
import { fetchConnectionStatus } from '../api/fetchConnectionStatus'

const POLL_INTERVAL = 10_000

const EMPTY: ConnectionStatus = {
  connected: false,
  targetServer: '',
  servicesCount: 0,
  error: null,
  loading: true,
}

export function useConnectionStatus(): ConnectionStatus {
  const { data, isPending, error } = useQuery({
    queryKey: ['connectionStatus'],
    queryFn: fetchConnectionStatus,
    refetchInterval: POLL_INTERVAL,
  })

  if (isPending) return EMPTY

  if (error) {
    return {
      connected: false,
      targetServer: '',
      servicesCount: 0,
      error: error instanceof Error ? error.message : 'Status check failed',
      loading: false,
    }
  }

  return data ?? EMPTY
}
