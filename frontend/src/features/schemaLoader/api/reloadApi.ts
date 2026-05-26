// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { schemaCache } from '../lib/schemaCache'
import { apiClient } from '../../../lib/http/apiClient'
import { createLogger } from '../../../utils/debugLogger'
import { parseDiscoveryResponse } from './discoveryParser'
import type { BackendDiscoveryResponse } from './discoveryTypes'
import type { GrpcService } from '../../../types/grpc'
import type { ConfigResponse } from '@grpc-studio/shared'

const schemaLogger = createLogger('schema-loader')

export interface LoadResult {
  fetchedAt: Date
}

interface FetchSchemasResult extends LoadResult {
  services: GrpcService[]
}

// ---------------------------------------------------------------------------
// Initial load — returns from registry/localStorage if available
// ---------------------------------------------------------------------------

export async function loadSchemas(): Promise<LoadResult> {
  if (schemaCache.restoreFromStorage()) {
    const fetchedAt = schemaCache.getFetchedAt()!
    schemaLogger.debug(`Using cached services (fetched ${fetchedAt.toISOString()})`)
    return { fetchedAt }
  }

  return fetchAndCacheSchemas()
}

// ---------------------------------------------------------------------------
// Force reload — clears all caches, re-discovers from backend
// ---------------------------------------------------------------------------

export async function reloadSchemas(): Promise<LoadResult> {
  schemaLogger.debug('Force-reloading schemas (bypassing cache)')
  const result = await fetchSchemas()
  schemaCache.replaceServices(result.services, result.fetchedAt)
  return { fetchedAt: result.fetchedAt }
}

// ---------------------------------------------------------------------------
// Fetch target server config
// ---------------------------------------------------------------------------

export async function fetchTargetServer(): Promise<string> {
  try {
    const data = await apiClient.get<ConfigResponse>('config')
    const target = data.config.client.target
    if (target?.host && target?.port) {
      return `${target.host}:${target.port}`
    }
    return ''
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Private — HTTP call to backend discovery endpoint
// ---------------------------------------------------------------------------

async function fetchAndCacheSchemas(): Promise<LoadResult> {
  const result = await fetchSchemas()
  schemaCache.setServices(result.services, result.fetchedAt)
  return { fetchedAt: result.fetchedAt }
}

async function fetchSchemas(): Promise<FetchSchemasResult> {
  schemaLogger.debug('Calling backend discovery API')

  const data = await apiClient.post<BackendDiscoveryResponse>('discover', undefined, {
    retries: 3,
    onRetry: (attempt, error) => {
      schemaLogger.debug(`Discovery retry ${attempt}/3: ${error.message}`)
    },
  })

  const services = parseDiscoveryResponse(data)

  const fetchedAt = new Date()
  return { services, fetchedAt }
}
