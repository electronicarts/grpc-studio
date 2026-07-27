// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { TimedCache } from '../cache/timedCache.js'

describe('TimedCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      cache.set('key1', 42)
      assert.equal(cache.get('key1'), 42)
    })

    it('should return undefined for missing keys', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      assert.equal(cache.get('nonexistent'), undefined)
    })

    it('should update existing keys', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      cache.set('key1', 10)
      cache.set('key1', 20)

      assert.equal(cache.get('key1'), 20)
    })

    it('should delete keys', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      cache.set('key1', 42)
      const deleted = cache.delete('key1')

      assert.equal(deleted, true)
      assert.equal(cache.get('key1'), undefined)
    })

    it('should return false when deleting nonexistent keys', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      const deleted = cache.delete('nonexistent')
      assert.equal(deleted, false)
    })

    it('should clear all entries', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      cache.set('key1', 1)
      cache.set('key2', 2)
      cache.set('key3', 3)

      assert.equal(cache.size, 3)

      cache.clear()

      assert.equal(cache.size, 0)
      assert.equal(cache.get('key1'), undefined)
    })

    it('should track size correctly', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 100
      })

      assert.equal(cache.size, 0)

      cache.set('key1', 1)
      assert.equal(cache.size, 1)

      cache.set('key2', 2)
      assert.equal(cache.size, 2)

      cache.delete('key1')
      assert.equal(cache.size, 1)
    })
  })

  describe('keys()', () => {
    it('exposes current keys for prefix-based iteration', () => {
      const cache = new TimedCache<string, number>({ ttlMs: 1000, maxEntries: 100 })
      cache.set('targetA:service-names', 1)
      cache.set('targetA:registry:Foo', 2)
      cache.set('targetB:service-names', 3)

      const keys = [...cache.keys()]
      assert.equal(keys.length, 3)

      // Callers (e.g. ReflectionSchemaRepository.clearCache) delete by target prefix.
      const targetAKeys = keys.filter((k) => k.startsWith('targetA:'))
      assert.deepEqual(targetAKeys.sort(), ['targetA:registry:Foo', 'targetA:service-names'])

      for (const key of targetAKeys) cache.delete(key)
      assert.deepEqual([...cache.keys()], ['targetB:service-names'])
    })
  })

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 1000,
        maxEntries: 100,
        nowMs: () => now
      })

      cache.set('key1', 42)

      // Within TTL
      now = 999
      assert.equal(cache.get('key1'), 42)

      // After TTL
      now = 1001
      assert.equal(cache.get('key1'), undefined)
    })

    it('should remove expired entries from cache on access', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 1000,
        maxEntries: 100,
        nowMs: () => now
      })

      cache.set('key1', 42)
      assert.equal(cache.size, 1)

      // Access after expiration
      now = 1001
      cache.get('key1')

      // Size should be 0 (expired entry removed)
      assert.equal(cache.size, 0)
    })

    it('should support dynamic TTL via function', () => {
      let now = 0
      let ttl = 1000

      const cache = new TimedCache<string, number>({
        ttlMs: () => ttl,
        maxEntries: 100,
        nowMs: () => now
      })

      cache.set('key1', 42)

      // Within initial TTL
      now = 999
      assert.equal(cache.get('key1'), 42)

      // Change TTL to shorter duration
      ttl = 500

      // Now expired under new TTL
      assert.equal(cache.get('key1'), undefined)
    })

    it('should reset timestamp when updating existing key', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 1000,
        maxEntries: 100,
        nowMs: () => now
      })

      cache.set('key1', 42)

      // Advance time but within TTL
      now = 500

      // Update the key (resets timestamp)
      cache.set('key1', 100)

      // Advance past original expiration
      now = 1200

      // Should still be valid (timestamp was reset at 500ms)
      assert.equal(cache.get('key1'), 100)

      // Now expire
      now = 1501
      assert.equal(cache.get('key1'), undefined)
    })
  })

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at capacity', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 3,
        nowMs: () => now
      })

      cache.set('a', 1)
      now += 100
      cache.set('b', 2)
      now += 100
      cache.set('c', 3)

      // Access 'a' to make it recently used
      now += 100
      cache.get('a')

      // Add 'd' - should evict 'b' (least recently used)
      now += 100
      cache.set('d', 4)

      assert.equal(cache.get('a'), 1, 'a should still be present')
      assert.equal(cache.get('b'), undefined, 'b should be evicted (LRU)')
      assert.equal(cache.get('c'), 3, 'c should still be present')
      assert.equal(cache.get('d'), 4, 'd should be present')
    })

    it('should update access time on get', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 3,
        nowMs: () => now
      })

      cache.set('a', 1)
      now += 100
      cache.set('b', 2)
      now += 100
      cache.set('c', 3)

      // Access 'a' multiple times
      now += 100
      cache.get('a')
      now += 100
      cache.get('a')

      // Add 'd' - should evict 'b' (oldest access time)
      now += 100
      cache.set('d', 4)

      assert.equal(cache.get('a'), 1)
      assert.equal(cache.get('b'), undefined, 'b should be evicted')
      assert.equal(cache.get('c'), 3)
      assert.equal(cache.get('d'), 4)
    })

    it('should keep frequently accessed hot entries', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 3,
        nowMs: () => now
      })

      cache.set('hot', 999)
      cache.set('cold1', 1)
      cache.set('cold2', 2)

      // Repeatedly access hot entry
      for (let i = 0; i < 10; i++) {
        now += 10
        cache.get('hot')
      }

      // Add new entries - cold entries should be evicted
      cache.set('new1', 10)
      cache.set('new2', 20)

      assert.equal(cache.get('hot'), 999, 'hot entry should remain')
      assert.equal(cache.get('cold1'), undefined, 'cold1 should be evicted')
      assert.equal(cache.get('cold2'), undefined, 'cold2 should be evicted')
    })

    it('should not evict when under capacity', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 5
      })

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      assert.equal(cache.size, 3)
      assert.equal(cache.get('a'), 1)
      assert.equal(cache.get('b'), 2)
      assert.equal(cache.get('c'), 3)
    })

    it('should handle updating key without triggering eviction', () => {
      const now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 3,
        nowMs: () => now
      })

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      // Update existing key - should not trigger eviction
      cache.set('b', 200)

      assert.equal(cache.size, 3)
      assert.equal(cache.get('a'), 1)
      assert.equal(cache.get('b'), 200)
      assert.equal(cache.get('c'), 3)
    })
  })

  describe('dynamic configuration', () => {
    it('should support dynamic maxEntries via function', () => {
      let maxEntries = 3

      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: () => maxEntries
      })

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      // Increase capacity
      maxEntries = 5

      // Should not evict now
      cache.set('d', 4)
      cache.set('e', 5)

      assert.equal(cache.size, 5)
    })
  })

  describe('edge cases', () => {
    it('should handle zero maxEntries gracefully', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 0
      })

      // Every set should immediately evict
      cache.set('a', 1)
      assert.equal(cache.size, 1) // Entry is added

      cache.set('b', 2)
      // Previous entry should be evicted
      assert.equal(cache.size, 1)
    })

    it('should handle single entry capacity', () => {
      const now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 1,
        nowMs: () => now
      })

      cache.set('a', 1)
      assert.equal(cache.get('a'), 1)

      cache.set('b', 2)
      assert.equal(cache.get('a'), undefined, 'a should be evicted')
      assert.equal(cache.get('b'), 2)
    })

    it('should handle complex object types', () => {
      interface User {
        id: number
        name: string
        metadata: Record<string, unknown>
      }

      const cache = new TimedCache<string, User>({
        ttlMs: 10000,
        maxEntries: 100
      })

      const user: User = {
        id: 1,
        name: 'Alice',
        metadata: { role: 'admin', active: true }
      }

      cache.set('user:1', user)

      const retrieved = cache.get('user:1')
      assert.deepEqual(retrieved, user)
    })

    it('should handle numeric keys', () => {
      const cache = new TimedCache<number, string>({
        ttlMs: 10000,
        maxEntries: 100
      })

      cache.set(123, 'value1')
      cache.set(456, 'value2')

      assert.equal(cache.get(123), 'value1')
      assert.equal(cache.get(456), 'value2')
    })
  })

  describe('concurrent access patterns', () => {
    it('should handle rapid set/get operations', () => {
      const cache = new TimedCache<string, number>({
        ttlMs: 10000,
        maxEntries: 1000
      })

      // Rapid writes
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i)
      }

      // Verify all written
      for (let i = 0; i < 100; i++) {
        assert.equal(cache.get(`key${i}`), i)
      }
    })

    it('should handle interleaved operations correctly', () => {
      let now = 0
      const cache = new TimedCache<string, number>({
        ttlMs: 1000,
        maxEntries: 50,
        nowMs: () => now
      })

      // Interleave sets and gets
      for (let i = 0; i < 20; i++) {
        cache.set(`key${i}`, i)
        if (i % 2 === 0) {
          cache.get(`key${i / 2}`)
        }
        now += 10
      }

      assert.ok(cache.size > 0)
    })
  })
})
