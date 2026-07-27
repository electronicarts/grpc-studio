// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * SchemaPersistence — localStorage read/write for the servers list.
 * Schema descriptors are not persisted (they're fetched on demand and
 * cached in memory by SchemaCache).
 */
import type { ApiServer } from '../../../types/grpc'
import { safeGetJSON, safeSetJSON, safeGetString, safeSetString } from '../../../utils/storageHelpers'

const LS_SERVERS_KEY = 'grpc-servers'
const LS_FETCHED_AT_KEY = 'grpc-servers-ts'

export interface PersistedServers {
  servers: ApiServer[]
  fetchedAt: Date
}

export function restoreServers(): PersistedServers | null {
  const servers = safeGetJSON<ApiServer[]>(LS_SERVERS_KEY)
  if (!servers) return null
  const rawTs = safeGetString(LS_FETCHED_AT_KEY)
  return { servers, fetchedAt: rawTs ? new Date(rawTs) : new Date() }
}

export function persistServers(servers: ApiServer[], fetchedAt: Date) {
  safeSetJSON(LS_SERVERS_KEY, servers)
  safeSetString(LS_FETCHED_AT_KEY, fetchedAt.toISOString())
}

