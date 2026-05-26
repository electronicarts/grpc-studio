// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import type { Cache } from './cache.js';
import {
  cacheEntries,
  cacheEvictionsTotal,
  cacheOperationsTotal,
} from '../metrics/collectors/cacheMetrics.js';

type OptionValue = number | (() => number);

export interface TimedCacheOptions {
  ttlMs: OptionValue;
  maxEntries: OptionValue;
  nowMs?: () => number;
  metricsName?: string;
}

interface CacheEntry<V> {
  value: V;
  timestamp: number;
  lastAccessTime: number;
}

export class TimedCache<K, V> implements Cache<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly nowMs: () => number;
  private readonly metricsName?: string;

  constructor(private readonly options: TimedCacheOptions) {
    this.nowMs = options.nowMs ?? Date.now;
    this.metricsName = options.metricsName;
    this.recordSize();
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.recordOperation('get', 'miss');
      return undefined;
    }

    if (!this.isFresh(entry.timestamp)) {
      this.entries.delete(key);
      this.recordOperation('get', 'miss');
      this.recordEviction('ttl');
      this.recordSize();
      return undefined;
    }

    // Update access time for LRU tracking
    entry.lastAccessTime = this.nowMs();
    this.recordOperation('get', 'hit');
    return entry.value;
  }

  set(key: K, value: V): void {
    if (!this.entries.has(key)) {
      this.evictIfNeeded();
    }

    const now = this.nowMs();
    this.entries.set(key, { value, timestamp: now, lastAccessTime: now });
    this.recordOperation('set', 'success');
    this.recordSize();
  }

  delete(key: K): boolean {
    const deleted = this.entries.delete(key);
    this.recordOperation('delete', deleted ? 'success' : 'miss');
    this.recordSize();
    return deleted;
  }

  clear(): void {
    this.entries.clear();
    this.recordOperation('clear', 'success');
    this.recordSize();
  }

  private isFresh(timestamp: number): boolean {
    return this.nowMs() - timestamp < resolveOption(this.options.ttlMs);
  }

  /**
   * Evicts the least recently used (LRU) entry when cache reaches capacity.
   *
   * Previously used FIFO which would evict hot entries. Now uses LRU to keep
   * frequently accessed entries in cache while evicting cold entries.
   */
  private evictIfNeeded(): void {
    const maxEntries = resolveOption(this.options.maxEntries);
    if (this.entries.size < maxEntries) return;

    // Find LRU entry by oldest access time
    let oldestKey: K | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries.entries()) {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.entries.delete(oldestKey);
      this.recordEviction('capacity');
      this.recordSize();
    }
  }

  private recordOperation(operation: string, result: string): void {
    if (!this.metricsName) return;

    try {
      cacheOperationsTotal.inc({ cache: this.metricsName, operation, result });
    } catch {
      // Cache behavior must not depend on metrics availability.
    }
  }

  private recordEviction(reason: string): void {
    if (!this.metricsName) return;

    try {
      cacheEvictionsTotal.inc({ cache: this.metricsName, reason });
    } catch {
      // Cache behavior must not depend on metrics availability.
    }
  }

  private recordSize(): void {
    if (!this.metricsName) return;

    try {
      cacheEntries.set({ cache: this.metricsName }, this.entries.size);
    } catch {
      // Cache behavior must not depend on metrics availability.
    }
  }
}

function resolveOption(value: OptionValue): number {
  return typeof value === 'function' ? value() : value;
}
