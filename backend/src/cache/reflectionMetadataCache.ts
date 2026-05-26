// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import configManager from '../config/configManager.js';
import type { Cache } from './cache.js';
import { TimedCache } from './timedCache.js';

const DEFAULT_REFLECTION_CACHE_TTL_MS = 3600000;
const DEFAULT_REFLECTION_CACHE_MAX_ENTRIES = 1000;

export function createReflectionMetadataCache<Value>(): Cache<string, Value> {
  return new TimedCache<string, Value>({
    ttlMs: getReflectionCacheTtlMs,
    maxEntries: getReflectionCacheMaxEntries,
    metricsName: 'reflection',
  });
}

function getReflectionCacheTtlMs(): number {
  return configManager.getCacheConfig().reflection?.ttlMs ?? DEFAULT_REFLECTION_CACHE_TTL_MS;
}

function getReflectionCacheMaxEntries(): number {
  return configManager.getCacheConfig().reflection?.maxEntries ?? DEFAULT_REFLECTION_CACHE_MAX_ENTRIES;
}
