// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { isRecord, isJsonObject, cloneJsonObject } from '../jsonUtils'

describe('jsonUtils', () => {
  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ key: 'value' })).toBe(true)
      expect(isRecord({ nested: { obj: true } })).toBe(true)
    })

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false)
      expect(isRecord([1, 2, 3])).toBe(false)
    })

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isRecord(undefined)).toBe(false)
      expect(isRecord(42)).toBe(false)
      expect(isRecord('string')).toBe(false)
      expect(isRecord(true)).toBe(false)
    })

    it('should return true for class instances', () => {
      class TestClass {}
      expect(isRecord(new TestClass())).toBe(true)
    })

    it('should return true for Date objects', () => {
      expect(isRecord(new Date())).toBe(true)
    })
  })

  describe('isJsonObject', () => {
    it('should return true for valid JSON objects', () => {
      expect(isJsonObject({})).toBe(true)
      expect(isJsonObject({ key: 'value' })).toBe(true)
      expect(isJsonObject({ num: 42, bool: true, str: 'test' })).toBe(true)
    })

    it('should return true for nested JSON objects', () => {
      expect(isJsonObject({
        nested: {
          deep: {
            value: 'test'
          }
        }
      })).toBe(true)
    })

    it('should return true for objects with JSON arrays', () => {
      expect(isJsonObject({
        items: [1, 2, 3],
        names: ['a', 'b', 'c']
      })).toBe(true)
    })

    it('should return false for arrays', () => {
      expect(isJsonObject([])).toBe(false)
      expect(isJsonObject([1, 2, 3])).toBe(false)
    })

    it('should return false for null', () => {
      expect(isJsonObject(null)).toBe(false)
    })

    it('should return false for primitives', () => {
      expect(isJsonObject(undefined)).toBe(false)
      expect(isJsonObject(42)).toBe(false)
      expect(isJsonObject('string')).toBe(false)
      expect(isJsonObject(true)).toBe(false)
    })

    it('should handle objects with null values', () => {
      expect(isJsonObject({ value: null })).toBe(true)
    })
  })

  describe('cloneJsonObject', () => {
    it('should create a deep clone of simple objects', () => {
      const original = { key: 'value', num: 42 }
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })

    it('should create a deep clone of nested objects', () => {
      const original = {
        level1: {
          level2: {
            level3: 'deep'
          }
        }
      }
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)
      expect(cloned.level1).not.toBe(original.level1)
      expect(cloned.level1.level2).not.toBe(original.level1.level2)
    })

    it('should clone arrays within objects', () => {
      const original = {
        items: [1, 2, 3],
        nested: [{ a: 1 }, { a: 2 }]
      }
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)
      expect(cloned.items).not.toBe(original.items)
      expect(cloned.nested).not.toBe(original.nested)
      expect(cloned.nested[0]).not.toBe(original.nested[0])
    })

    it('should preserve all JSON types', () => {
      const original = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
        object: { nested: true }
      }
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)
      expect(cloned.string).toBe('test')
      expect(cloned.number).toBe(42)
      expect(cloned.boolean).toBe(true)
      expect(cloned.nullValue).toBeNull()
    })

    it('should handle empty objects', () => {
      const original = {}
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual({})
      expect(cloned).not.toBe(original)
    })

    it('should not share references after cloning', () => {
      const original = {
        data: { value: 1 }
      }
      const cloned = cloneJsonObject(original)

      // Mutate clone
      cloned.data.value = 2

      // Original should be unchanged
      expect(original.data.value).toBe(1)
      expect(cloned.data.value).toBe(2)
    })

    it('should handle objects with many nested levels', () => {
      const original: Record<string, unknown> = { value: 1 }
      let current = original
      for (let i = 0; i < 10; i++) {
        current.nested = { value: i + 2 }
        current = current.nested as Record<string, unknown>
      }

      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)

      // Verify deep mutation doesn't affect original
      let clonedCurrent = cloned
      for (let i = 0; i < 10; i++) {
        clonedCurrent = clonedCurrent.nested
      }
      clonedCurrent.value = 999

      let originalCurrent = original
      for (let i = 0; i < 10; i++) {
        originalCurrent = originalCurrent.nested
      }
      expect(originalCurrent.value).not.toBe(999)
    })

    it('should handle objects with special string values', () => {
      const original = {
        unicode: '你好世界',
        emoji: '🌍🎉',
        escaped: 'line1\nline2\ttab',
        quotes: '"quoted" and \'single\''
      }
      const cloned = cloneJsonObject(original)

      expect(cloned).toEqual(original)
      expect(cloned.unicode).toBe('你好世界')
      expect(cloned.emoji).toBe('🌍🎉')
    })

    it('should handle numeric edge cases', () => {
      const original = {
        zero: 0,
        negative: -42,
        float: 3.14159,
        scientific: 1e10,
        infinity: Infinity,
        negInfinity: -Infinity,
        nan: NaN
      }
      const cloned = cloneJsonObject(original)

      expect(cloned.zero).toBe(0)
      expect(cloned.negative).toBe(-42)
      expect(cloned.float).toBe(3.14159)
      expect(cloned.scientific).toBe(1e10)
      // Note: JSON.stringify converts Infinity and NaN to null
      expect(cloned.infinity).toBeNull()
      expect(cloned.negInfinity).toBeNull()
      expect(cloned.nan).toBeNull()
    })

    it('should handle large objects efficiently', () => {
      const original: Record<string, unknown> = {}
      for (let i = 0; i < 1000; i++) {
        original[`key${i}`] = { value: i, nested: { data: `value${i}` } }
      }

      const cloned = cloneJsonObject(original)

      expect(Object.keys(cloned).length).toBe(1000)
      expect(cloned.key500).toEqual(original.key500)
      expect(cloned.key500).not.toBe(original.key500)
    })
  })
})
