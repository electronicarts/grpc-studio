// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadSchemas } from '../api'
import type { ApiServer, GrpcService } from '../../../types/grpc'

/** Shared React Query key — the single source of truth for discovered servers. */
export const SCHEMA_QUERY_KEY = ['schemas'] as const

export interface UseSchemasResult {
  servers: ApiServer[]
  services: GrpcService[]
  loading: boolean
  error: string | null
  lastFetchedAt: Date | null
}

const EMPTY_SERVERS: ApiServer[] = []

/**
 * Read access to the discovered servers and their flattened services.
 * Every consumer shares one query (by key), so this never re-fetches.
 */
export function useSchemas(): UseSchemasResult {
  const { data, isPending: loading, error } = useQuery({
    queryKey: SCHEMA_QUERY_KEY,
    queryFn: loadSchemas,
    retry: 1,
    staleTime: Infinity,
  })

  const servers = data?.servers ?? EMPTY_SERVERS
  const services = useMemo(() => servers.flatMap(s => s.services), [servers])

  return {
    servers,
    services,
    loading,
    error: error instanceof Error ? error.message : null,
    lastFetchedAt: data?.fetchedAt ?? null,
  }
}
