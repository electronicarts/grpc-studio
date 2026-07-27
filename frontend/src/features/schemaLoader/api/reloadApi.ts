// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { schemaCache } from '../lib/schemaCache'
import { restoreServers, persistServers } from '../lib/schemaPersistence'
import { apiClient } from '../../../lib/http/apiClient'
import { createLogger } from '../../../utils/debugLogger'
import { parseDiscoveryResponse } from './discoveryParser'
import type { BackendDiscoveryResponse } from './discoveryTypes'
import type { ApiServer } from '../../../types/grpc'

const schemaLogger = createLogger('schema-loader')

export interface SchemaData {
  servers: ApiServer[]
  fetchedAt: Date
}

// ---------------------------------------------------------------------------
// Initial load — returns from localStorage if available, else discovers
// ---------------------------------------------------------------------------

export async function loadSchemas(): Promise<SchemaData> {
  const restored = restoreServers()
  if (restored) {
    schemaLogger.debug(`Using cached servers (fetched ${restored.fetchedAt.toISOString()})`)
    return restored
  }
  return fetchAndPersist()
}

// ---------------------------------------------------------------------------
// Force reload — re-discovers from backend, replacing cached descriptors
// ---------------------------------------------------------------------------

export async function reloadSchemas(current: ApiServer[], target?: string): Promise<SchemaData> {
  schemaLogger.debug('Force-reloading schemas (bypassing cache)', { target })

  if (target) {
    // Reload a single target: drop its cached descriptors and merge its fresh
    // service list into the existing servers, leaving other targets untouched.
    const result = await fetchSchemas(true, target)
    schemaCache.clearCache(target)
    const merged = mergeReloadedTarget(current, result.servers, target)
    return persist(merged, result.fetchedAt)
  }

  // Reload everything: the backend re-reads config, so the server set itself
  // may change. Drop all cached descriptors and replace wholesale.
  const result = await fetchSchemas(true)
  schemaCache.clearCache()
  return persist(result.servers, result.fetchedAt)
}

/**
 * Merge a single reloaded target's fresh service list into the current servers.
 * Only the matching server is replaced; the ordering of `current` is preserved.
 */
export function mergeReloadedTarget(
  current: ApiServer[],
  reloaded: ApiServer[],
  target: string,
): ApiServer[] {
  return current.map(server =>
    server.name === target
      ? (reloaded.find(rs => rs.name === target) ?? server)
      : server
  )
}

// ---------------------------------------------------------------------------
// Private — HTTP call to backend discovery endpoint + persistence
// ---------------------------------------------------------------------------

function persist(servers: ApiServer[], fetchedAt: Date): SchemaData {
  persistServers(servers, fetchedAt)
  return { servers, fetchedAt }
}

async function fetchAndPersist(): Promise<SchemaData> {
  const result = await fetchSchemas()
  return persist(result.servers, result.fetchedAt)
}

async function fetchSchemas(forceReload = false, target?: string): Promise<SchemaData> {
  schemaLogger.debug('Calling backend discovery API', { forceReload, target })

  const data = await apiClient.post<BackendDiscoveryResponse>(
    'discover',
    { reload: forceReload, target },
    {
      retries: 3,
      onRetry: (attempt, error) => {
        schemaLogger.debug(`Discovery retry ${attempt}/3: ${error.message}`)
      },
    }
  )

  const servers = parseDiscoveryResponse(data)
  return { servers, fetchedAt: new Date() }
}
