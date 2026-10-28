// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { DescMessage } from '@bufbuild/protobuf'
import { schemaCache } from '@/features/schemaLoader/lib/schemaCache'

// Stands in for the backend: each request loads one real message type for its target
vi.mock('@/features/schemaLoader/lib/descriptorSetFetcher', async () => {
  const { fileRegistry } = await import('@/test/descriptors')
  const registry = fileRegistry({
    name: 'pkg.proto',
    package: 'pkg',
    messageType: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Gamma' }],
  })
  return {
    fetchDescriptorSet: vi.fn(async (target: string, messageType: string, cache: Map<string, DescMessage>) => {
      const desc = registry.getMessage(messageType) ?? null
      if (desc) cache.set(`${target}:${messageType}`, desc)
      return desc
    }),
  }
})

describe('schemaCache', () => {
  beforeEach(() => {
    schemaCache.clearCache()
  })

  describe('descriptor cache', () => {
    it('getCachedSchema returns null for non-existent schemas', () => {
      expect(schemaCache.getCachedSchema('Server1', 'NonExistent')).toBeNull()
    })

    it('starts empty', () => {
      expect(schemaCache.getTargetSchemas('Server1')).toEqual([])
      expect(schemaCache.allLoaded).toBe(true)
    })

    it('supports target-specific cache clearing without throwing', () => {
      schemaCache.clearCache('Server1')
      expect(schemaCache.getTargetSchemas('Server1')).toEqual([])
    })

    it('bumps its version whenever the cache changes', async () => {
      const before = schemaCache.getVersion()
      await schemaCache.getSchema('Server1', 'pkg.Alpha')
      const afterLoad = schemaCache.getVersion()
      schemaCache.clearCache('Server1')

      expect(afterLoad).toBeGreaterThan(before)
      expect(schemaCache.getVersion()).toBeGreaterThan(afterLoad)
    })
  })

  describe('getTargetSchemas', () => {
    it("returns one target's message types, not another's or the cache keys", async () => {
      await schemaCache.getSchema('A', 'pkg.Alpha')
      await schemaCache.getSchema('AB', 'pkg.Beta')
      await schemaCache.getSchema('A', 'pkg.Gamma')

      expect(
        schemaCache
          .getTargetSchemas('A')
          .map(d => d.typeName)
          .sort(),
      ).toEqual(['pkg.Alpha', 'pkg.Gamma'])
      expect(schemaCache.getTargetSchemas('AB').map(d => d.typeName)).toEqual(['pkg.Beta'])
      expect(schemaCache.getTargetSchemas('C')).toEqual([])
    })
  })

  describe('subscription and notifications', () => {
    it('notifies subscribers on cache clear', () => {
      let notified = false
      const unsubscribe = schemaCache.subscribe(() => {
        notified = true
      })

      schemaCache.clearCache()
      expect(notified).toBe(true)

      unsubscribe()
    })

    it('does not notify after unsubscribe', () => {
      let callCount = 0
      const unsubscribe = schemaCache.subscribe(() => {
        callCount++
      })

      schemaCache.clearCache()
      expect(callCount).toBe(1)

      unsubscribe()

      schemaCache.clearCache()
      expect(callCount).toBe(1) // Should not increment after unsubscribe
    })
  })
})
