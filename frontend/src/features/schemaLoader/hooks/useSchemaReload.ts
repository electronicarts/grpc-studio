// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loadSchemas, reloadSchemas, fetchTargetServer } from '../api'
import type { SchemaLoaderState } from '../types'

const SCHEMA_QUERY_KEY = ['schemas'] as const

export function useSchemaLoader(): SchemaLoaderState {
  const queryClient = useQueryClient()

  const { isPending: loading, error: queryError, data } = useQuery({
    queryKey: SCHEMA_QUERY_KEY,
    queryFn: async () => {
      const server = await fetchTargetServer()
      const result = await loadSchemas()
      return { ...result, targetServer: server }
    },
    retry: 1,
    staleTime: Infinity,
  })

  const {
    mutate,
    isPending: reloading,
    isSuccess: reloadSucceeded,
    isError: reloadFailed,
    error: mutationError,
  } = useMutation({
    mutationFn: async () => {
      const timeoutMs = 60_000
      return Promise.race([
        reloadSchemas(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Schema reload timed out. Please try again.')), timeoutMs)
        ),
      ])
    },
    onSuccess: (result) => {
      queryClient.setQueryData(SCHEMA_QUERY_KEY, (prev: { targetServer: string } | undefined) => ({
        fetchedAt: result.fetchedAt,
        targetServer: prev?.targetServer ?? '',
      }))
    },
  })

  const reload = useCallback(() => { mutate() }, [mutate])

  const lastReloadSuccess: boolean | null =
    reloadSucceeded ? true : reloadFailed ? false : null

  return {
    loading,
    error: queryError instanceof Error ? queryError.message : null,
    reloadError: mutationError instanceof Error ? mutationError.message : null,
    targetServer: data?.targetServer ?? '',
    lastFetchedAt: data?.fetchedAt ?? null,
    lastReloadSuccess,
    reloading,
    reload,
  }
}
