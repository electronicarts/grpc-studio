// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import configManager from '../config/configManager.js'
import type { CertificateMetadata } from '../types/index.js'
import type { Cache } from './cache.js'
import { TimedCache } from './timedCache.js'

const DEFAULT_CERTIFICATE_CACHE_TTL_MS = 60000
const DEFAULT_CERTIFICATE_CACHE_MAX_ENTRIES = 1

export function createCertificateMetadataCache(): Cache<string, CertificateMetadata> {
  return new TimedCache<string, CertificateMetadata>({
    ttlMs: getCertificateCacheTtlMs,
    maxEntries: getCertificateCacheMaxEntries,
    metricsName: 'certificate',
  })
}

function getCertificateCacheTtlMs(): number {
  return configManager.getCacheConfig().certificate?.ttlMs ?? DEFAULT_CERTIFICATE_CACHE_TTL_MS
}

function getCertificateCacheMaxEntries(): number {
  return configManager.getCacheConfig().certificate?.maxEntries ?? DEFAULT_CERTIFICATE_CACHE_MAX_ENTRIES
}
