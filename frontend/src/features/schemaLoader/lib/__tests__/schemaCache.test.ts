// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest'
import { schemaCache } from '../schemaCache'

describe('schemaCache', () => {
  beforeEach(() => {
    schemaCache.clearCache()
  })

  describe('descriptor cache', () => {
    it('getCachedSchema returns null for non-existent schemas', () => {
      expect(schemaCache.getCachedSchema('Server1', 'NonExistent')).toBeNull()
    })

    it('starts empty', () => {
      expect(schemaCache.getCacheSize()).toBe(0)
      expect(schemaCache.allLoaded).toBe(true)
    })

    it('supports target-specific cache clearing without throwing', () => {
      schemaCache.clearCache('Server1')
      expect(schemaCache.getCacheSize()).toBe(0)
    })

    it('exposes an immutable copy of the schema map', () => {
      const map = schemaCache.getSchemaMap()
      map.set('x', {} as never)
      // Mutating the returned copy must not affect the cache.
      expect(schemaCache.getCacheSize()).toBe(0)
    })
  })

  describe('subscription and notifications', () => {
    it('notifies subscribers on cache clear', () => {
      let notified = false
      const unsubscribe = schemaCache.subscribe(() => { notified = true })

      schemaCache.clearCache()
      expect(notified).toBe(true)

      unsubscribe()
    })

    it('does not notify after unsubscribe', () => {
      let callCount = 0
      const unsubscribe = schemaCache.subscribe(() => { callCount++ })

      schemaCache.clearCache()
      expect(callCount).toBe(1)

      unsubscribe()

      schemaCache.clearCache()
      expect(callCount).toBe(1) // Should not increment after unsubscribe
    })
  })
})
