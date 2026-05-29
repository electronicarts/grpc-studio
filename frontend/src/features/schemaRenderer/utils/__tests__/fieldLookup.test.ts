// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { getFieldValue, setFieldValue, getNestedValue } from '../fieldLookup'

describe('fieldLookup', () => {
  describe('getFieldValue', () => {
    it('returns field value from object', () => {
      const obj = { name: 'John', age: 30 }
      expect(getFieldValue(obj, 'name')).toBe('John')
      expect(getFieldValue(obj, 'age')).toBe(30)
    })

    it('returns undefined for missing field', () => {
      const obj = { name: 'John' }
      expect(getFieldValue(obj, 'age')).toBeUndefined()
    })

    it('returns undefined for null/undefined object', () => {
      expect(getFieldValue(null, 'name')).toBeUndefined()
      expect(getFieldValue(undefined, 'name')).toBeUndefined()
    })
  })

  describe('setFieldValue', () => {
    it('sets field value in object', () => {
      const obj = { name: 'John' }
      const result = setFieldValue(obj, 'age', 30)

      expect(result).toEqual({ name: 'John', age: 30 })
      expect(result).not.toBe(obj) // Immutable
    })

    it('updates existing field', () => {
      const obj = { name: 'John', age: 25 }
      const result = setFieldValue(obj, 'age', 26)

      expect(result).toEqual({ name: 'John', age: 26 })
    })

    it('deletes field when value is undefined', () => {
      const obj = { name: 'John', age: 25 }
      const result = setFieldValue(obj, 'age', undefined)

      expect(result).toEqual({ name: 'John' })
      expect('age' in result).toBe(false)
    })

    it('returns empty object when setting undefined on null object', () => {
      const result = setFieldValue(null, 'name', undefined)
      expect(result).toEqual({})
    })

    it('preserves null values (different from undefined)', () => {
      const obj = { name: 'John' }
      const result = setFieldValue(obj, 'age', null)

      expect(result).toEqual({ name: 'John', age: null })
      expect('age' in result).toBe(true)
    })

    it('preserves falsy values except undefined', () => {
      const obj = { name: 'John' }

      expect(setFieldValue(obj, 'count', 0)).toEqual({ name: 'John', count: 0 })
      expect(setFieldValue(obj, 'bio', '')).toEqual({ name: 'John', bio: '' })
      expect(setFieldValue(obj, 'active', false)).toEqual({ name: 'John', active: false })
    })
  })

  describe('getNestedValue', () => {
    it('returns value at simple path', () => {
      const obj = { user: { name: 'John' } }
      expect(getNestedValue(obj, 'user.name')).toBe('John')
    })

    it('returns value at deeply nested path', () => {
      const obj = {
        request: {
          user: {
            profile: {
              bio: 'Developer'
            }
          }
        }
      }
      expect(getNestedValue(obj, 'request.user.profile.bio')).toBe('Developer')
    })

    it('returns undefined for missing path', () => {
      const obj = { user: { name: 'John' } }
      expect(getNestedValue(obj, 'user.age')).toBeUndefined()
      expect(getNestedValue(obj, 'user.profile.bio')).toBeUndefined()
    })

    it('handles array indices', () => {
      const obj = { items: ['a', 'b', 'c'] }
      expect(getNestedValue(obj, 'items[0]')).toBe('a')
      expect(getNestedValue(obj, 'items[1]')).toBe('b')
      expect(getNestedValue(obj, 'items[2]')).toBe('c')
    })

    it('handles nested array access', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      }
      expect(getNestedValue(obj, 'users[0].name')).toBe('Alice')
      expect(getNestedValue(obj, 'users[1].age')).toBe(25)
    })

    it('handles map keys with brackets', () => {
      const obj = {
        metadata: {
          key1: 'value1',
          key2: 'value2'
        }
      }
      expect(getNestedValue(obj, 'metadata[key1]')).toBe('value1')
      expect(getNestedValue(obj, 'metadata[key2]')).toBe('value2')
    })

    it('returns entire object for empty path', () => {
      const obj = { name: 'John' }
      expect(getNestedValue(obj, '')).toBe(obj)
    })

    it('returns undefined for null/undefined object', () => {
      expect(getNestedValue(null, 'user.name')).toBeUndefined()
      expect(getNestedValue(undefined, 'user.name')).toBeUndefined()
    })

    it('handles complex nested structures', () => {
      const obj = {
        request: {
          users: [
            {
              addresses: [
                { street: '123 Main', city: 'NYC' },
                { street: '456 Oak', city: 'LA' }
              ]
            }
          ]
        }
      }
      expect(getNestedValue(obj, 'request.users[0].addresses[1].city')).toBe('LA')
    })
  })
})
