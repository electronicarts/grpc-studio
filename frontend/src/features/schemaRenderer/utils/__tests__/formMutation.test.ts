// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { updateValueAtPath } from '../formMutation'

describe('formMutation', () => {
  describe('updateValueAtPath', () => {
    it('sets value at simple path', () => {
      const root = {}
      const result = updateValueAtPath(root, 'name', 'John')

      expect(result).toEqual({ name: 'John' })
      expect(result).not.toBe(root) // Immutable
    })

    it('sets value at nested path', () => {
      const root = {}
      const result = updateValueAtPath(root, 'user.name', 'John')

      expect(result).toEqual({
        user: { name: 'John' }
      })
    })

    it('deletes key when value is undefined', () => {
      const root = { name: 'John', age: 25 }
      const result = updateValueAtPath(root, 'name', undefined)

      expect(result).toEqual({ age: 25 })
      expect('name' in result).toBe(false)
    })

    it('deletes nested key when value is undefined', () => {
      const root = {
        user: {
          name: 'John',
          email: 'john@example.com'
        }
      }
      const result = updateValueAtPath(root, 'user.email', undefined)

      expect(result).toEqual({
        user: { name: 'John' }
      })
      expect('email' in result.user).toBe(false)
    })

    it('updates existing value', () => {
      const root = { name: 'John', age: 25 }
      const result = updateValueAtPath(root, 'name', 'Jane')

      expect(result).toEqual({ name: 'Jane', age: 25 })
    })

    it('handles array indices', () => {
      const root = { items: ['a', 'b', 'c'] }
      const result = updateValueAtPath(root, 'items[1]', 'updated')

      expect(result).toEqual({ items: ['a', 'updated', 'c'] })
    })

    it('creates nested structure if missing', () => {
      const root = {}
      const result = updateValueAtPath(root, 'user.profile.bio', 'Developer')

      expect(result).toEqual({
        user: {
          profile: {
            bio: 'Developer'
          }
        }
      })
    })

    it('preserves other fields when updating', () => {
      const root = {
        name: 'John',
        age: 25,
        email: 'john@example.com'
      }
      const result = updateValueAtPath(root, 'age', 26)

      expect(result).toEqual({
        name: 'John',
        age: 26,
        email: 'john@example.com'
      })
    })

    it('handles map-style keys', () => {
      const root = { metadata: { key1: 'value1' } }
      const result = updateValueAtPath(root, 'metadata[key2]', 'value2')

      expect(result.metadata).toHaveProperty('key2', 'value2')
    })

    it('preserves null values (different from undefined)', () => {
      const root = { name: 'John' }
      const result = updateValueAtPath(root, 'email', null)

      expect(result).toEqual({ name: 'John', email: null })
      expect('email' in result).toBe(true)
    })

    it('preserves empty string values', () => {
      const root = { name: 'John' }
      const result = updateValueAtPath(root, 'bio', '')

      expect(result).toEqual({ name: 'John', bio: '' })
    })

    it('preserves zero values', () => {
      const root = { name: 'John' }
      const result = updateValueAtPath(root, 'count', 0)

      expect(result).toEqual({ name: 'John', count: 0 })
    })

    it('preserves false values', () => {
      const root = { name: 'John' }
      const result = updateValueAtPath(root, 'active', false)

      expect(result).toEqual({ name: 'John', active: false })
    })
  })
})
