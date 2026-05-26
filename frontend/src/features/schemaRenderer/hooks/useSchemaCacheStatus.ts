// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { DescMessage } from '@bufbuild/protobuf'
import { schemaCache } from '../../schemaLoader/lib/schemaCache'

export interface UseSchemaCacheStatusResult {
  schemasLoaded: boolean
}

export function useSchemaCacheStatus(
  schema: DescMessage | null,
): UseSchemaCacheStatusResult {
  const cacheVersion = useSyncExternalStore(
    (callback) => schemaCache.subscribe(callback),
    () => schemaCache.getCacheSize(),
  )

  const [schemasLoaded, setSchemasLoaded] = useState(false)

  useEffect(() => {
    setSchemasLoaded(schemaCache.allLoaded)
  }, [cacheVersion])

  useEffect(() => {
    if (!schema?.fields?.length) setSchemasLoaded(true)
  }, [schema])

  return { schemasLoaded }
}
