// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * SchemaCache — on-demand cache for protobuf message descriptors.
 *
 * This is NOT the source of truth for the server list — that lives in React
 * Query (see `useSchemas`). This cache only holds `DescMessage` instances,
 * fetched lazily and scoped by target server, so the schema renderer can read
 * them synchronously during render.
 */
import type { DescMessage } from '@bufbuild/protobuf'
import { schemaLogger } from '../../../utils/debugLogger'
import { fetchDescriptorSet } from './descriptorSetFetcher'

type Listener = () => void

function scopedKey(target: string, messageType: string): string {
  return `${target}:${messageType}`
}

class SchemaCache {
  private schemas = new Map<string, DescMessage>()
  private loadingPromises = new Map<string, Promise<DescMessage | null>>()
  private listeners = new Set<Listener>()

  // ── subscriptions ─────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  // ── synchronous reads ─────────────────────────────────────────

  getCachedSchema(target: string, messageType: string): DescMessage | null {
    return this.schemas.get(scopedKey(target, messageType)) ?? null
  }

  getSchemaMap(): Map<string, DescMessage> {
    return new Map(this.schemas)
  }

  getCacheSize(): number {
    return this.schemas.size
  }

  get allLoaded(): boolean {
    return this.loadingPromises.size === 0
  }

  // ── async fetching ────────────────────────────────────────────

  async getSchema(target: string, messageType: string): Promise<DescMessage | null> {
    const key = scopedKey(target, messageType)
    const cached = this.schemas.get(key)
    if (cached) return cached

    if (this.loadingPromises.has(key)) {
      try { return await this.loadingPromises.get(key)! }
      catch { return null }
    }

    const promise = fetchDescriptorSet(target, messageType, this.schemas)
      .then(desc => {
        this.loadingPromises.delete(key)
        if (desc) this.notify()
        return desc
      })
      .catch(error => {
        this.loadingPromises.delete(key)
        schemaLogger.error(`Failed to load schema for ${target}:${messageType}:`, error)
        return null
      })

    this.loadingPromises.set(key, promise)
    return promise
  }

  // ── cleanup ───────────────────────────────────────────────────

  clearCache(target?: string) {
    if (target) {
      // Clear cached descriptors for a specific target only.
      const prefix = `${target}:`
      for (const key of this.schemas.keys()) {
        if (key.startsWith(prefix)) this.schemas.delete(key)
      }
      for (const key of this.loadingPromises.keys()) {
        if (key.startsWith(prefix)) this.loadingPromises.delete(key)
      }
    } else {
      this.schemas.clear()
      this.loadingPromises.clear()
    }
    this.notify()
  }
}

export const schemaCache = new SchemaCache()
