// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * SchemaCache — Single source of truth for all protobuf data.
 *
 * Schemas are stored as DescMessage instances (from @bufbuild/protobuf).
 * Descriptors are fetched on demand and all transitive dependencies are
 * populated in one shot — no nested preloading loop needed.
 */
import type { DescMessage } from '@bufbuild/protobuf'
import type { GrpcService } from '../../../types/grpc'
import { schemaLogger } from '../../../utils/debugLogger'
import { fetchDescriptorSet } from './descriptorSetFetcher'
import { restoreServices, persistServices, clearPersistedServices } from './schemaPersistence'

type Listener = () => void

class SchemaCache {
  private schemas = new Map<string, DescMessage>()
  private loadingPromises = new Map<string, Promise<DescMessage | null>>()
  private listeners = new Set<Listener>()
  private _services: GrpcService[] = []
  private _fetchedAt: Date | null = null

  // ── subscriptions ─────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    for (const listener of this.listeners) listener()
  }

  // ── services ──────────────────────────────────────────────────

  getServices(): GrpcService[] {
    return this._services
  }

  getFetchedAt(): Date | null {
    return this._fetchedAt
  }

  restoreFromStorage(): boolean {
    if (this._services.length > 0) return true
    const restored = restoreServices()
    if (!restored) return false
    this._services = restored.services
    this._fetchedAt = restored.fetchedAt
    this.notify()
    return true
  }

  setServices(services: GrpcService[], fetchedAt?: Date) {
    this._services = services
    this._fetchedAt = fetchedAt ?? new Date()
    persistServices(this._services, this._fetchedAt)
    this.notify()
  }

  replaceServices(services: GrpcService[], fetchedAt?: Date) {
    this.schemas.clear()
    this.loadingPromises.clear()
    this.setServices(services, fetchedAt)
  }

  // ── synchronous reads ─────────────────────────────────────────

  getCachedSchema(messageType: string): DescMessage | null {
    return this.schemas.get(messageType) ?? null
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

  async getSchema(messageType: string): Promise<DescMessage | null> {
    const cached = this.schemas.get(messageType)
    if (cached) return cached

    if (this.loadingPromises.has(messageType)) {
      try { return await this.loadingPromises.get(messageType)! }
      catch { return null }
    }

    const promise = fetchDescriptorSet(messageType, this.schemas)
      .then(desc => {
        this.loadingPromises.delete(messageType)
        if (desc) this.notify()
        return desc
      })
      .catch(error => {
        this.loadingPromises.delete(messageType)
        schemaLogger.error(`Failed to load schema for ${messageType}:`, error)
        return null
      })

    this.loadingPromises.set(messageType, promise)
    return promise
  }

  // ── cleanup ───────────────────────────────────────────────────

  clearCache() {
    this.schemas.clear()
    this.loadingPromises.clear()
    this._services = []
    this._fetchedAt = null
    clearPersistedServices()
    this.notify()
  }
}

export const schemaCache = new SchemaCache()
