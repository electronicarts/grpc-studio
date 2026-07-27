// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useQuery } from '@tanstack/react-query'
import type { ServerConnectionStatus } from '../types'
import { fetchConnectionStatus } from '../api/fetchConnectionStatus'

const POLL_INTERVAL = 10_000

const EMPTY: ServerConnectionStatus = {
  servers: [],
  loading: true,
}

export function useConnectionStatus(): ServerConnectionStatus {
  const { data, isPending, error } = useQuery({
    queryKey: ['connectionStatus'],
    queryFn: fetchConnectionStatus,
    refetchInterval: POLL_INTERVAL,
  })

  if (isPending) return EMPTY

  if (error) {
    return {
      servers: [],
      loading: false,
    }
  }

  return data ?? EMPTY
}
