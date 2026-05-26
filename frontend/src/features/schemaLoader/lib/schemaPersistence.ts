// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * SchemaPersistence — localStorage read/write for the services list.
 * Schema descriptors are not persisted (they're fetched on demand and
 * cached in memory by SchemaCache).
 */
import type { GrpcService } from '../../../types/grpc'
import { safeGetJSON, safeSetJSON } from '../../../utils/storageHelpers'

const LS_SERVICES_KEY = 'grpc-services'
const LS_FETCHED_AT_KEY = 'grpc-services-ts'

export interface PersistedServices {
  services: GrpcService[]
  fetchedAt: Date
}

export function restoreServices(): PersistedServices | null {
  const services = safeGetJSON<GrpcService[]>(LS_SERVICES_KEY)
  if (!services) return null
  const rawTs = localStorage.getItem(LS_FETCHED_AT_KEY)
  return { services, fetchedAt: rawTs ? new Date(rawTs) : new Date() }
}

export function persistServices(services: GrpcService[], fetchedAt: Date) {
  safeSetJSON(LS_SERVICES_KEY, services)
  try {
    localStorage.setItem(LS_FETCHED_AT_KEY, fetchedAt.toISOString())
  } catch { /* best-effort */ }
}

export function clearPersistedServices() {
  try {
    localStorage.removeItem(LS_SERVICES_KEY)
    localStorage.removeItem(LS_FETCHED_AT_KEY)
  } catch { /* best-effort */ }
}

