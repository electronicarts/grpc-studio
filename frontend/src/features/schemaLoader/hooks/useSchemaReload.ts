// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reloadSchemas, type SchemaData } from '../api'
import { SCHEMA_QUERY_KEY, useSchemas } from './useSchemas'
import type { SchemaLoaderState } from '../types'

export function useSchemaLoader(): SchemaLoaderState {
  const queryClient = useQueryClient()
  const { loading, error, lastFetchedAt } = useSchemas()
  const [reloadingServer, setReloadingServer] = useState<string | null>(null)

  const {
    mutate,
    isPending: reloading,
    isSuccess: reloadSucceeded,
    isError: reloadFailed,
    error: mutationError,
  } = useMutation({
    mutationFn: async (target?: string) => {
      if (target) setReloadingServer(target)
      const current = queryClient.getQueryData<SchemaData>(SCHEMA_QUERY_KEY)?.servers ?? []
      const timeoutMs = 60_000
      try {
        return await Promise.race([
          reloadSchemas(current, target),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Schema reload timed out. Please try again.')), timeoutMs)
          ),
        ])
      } finally {
        setReloadingServer(null)
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData<SchemaData>(SCHEMA_QUERY_KEY, result)
    },
  })

  const reload = useCallback((target?: string) => { mutate(target) }, [mutate])

  const lastReloadSuccess: boolean | null =
    reloadSucceeded ? true : reloadFailed ? false : null

  return {
    loading,
    error,
    reloadError: mutationError instanceof Error ? mutationError.message : null,
    targetServer: '', // No longer relevant with multi-server
    lastFetchedAt,
    lastReloadSuccess,
    reloading,
    reloadingServer,
    reload,
  }
}
