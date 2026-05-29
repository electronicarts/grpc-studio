// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { ScalarType } from '@bufbuild/protobuf'
import { getInputType, parseValue, isEmpty } from '../scalarTypeUtils'

describe('scalarTypeUtils', () => {
  describe('getInputType', () => {
    it('returns number for numeric types', () => {
      expect(getInputType(ScalarType.INT32)).toBe('number')
      expect(getInputType(ScalarType.INT64)).toBe('number')
      expect(getInputType(ScalarType.UINT32)).toBe('number')
      expect(getInputType(ScalarType.UINT64)).toBe('number')
      expect(getInputType(ScalarType.DOUBLE)).toBe('number')
      expect(getInputType(ScalarType.FLOAT)).toBe('number')
      expect(getInputType(ScalarType.SINT32)).toBe('number')
      expect(getInputType(ScalarType.SINT64)).toBe('number')
      expect(getInputType(ScalarType.FIXED32)).toBe('number')
      expect(getInputType(ScalarType.FIXED64)).toBe('number')
      expect(getInputType(ScalarType.SFIXED32)).toBe('number')
      expect(getInputType(ScalarType.SFIXED64)).toBe('number')
    })

    it('returns checkbox for bool', () => {
      expect(getInputType(ScalarType.BOOL)).toBe('checkbox')
    })

    it('returns text for string and bytes', () => {
      expect(getInputType(ScalarType.STRING)).toBe('text')
      expect(getInputType(ScalarType.BYTES)).toBe('text')
    })
  })

  describe('parseValue', () => {
    it('parses integers', () => {
      expect(parseValue('42', ScalarType.INT32)).toBe(42)
      expect(parseValue('-100', ScalarType.INT64)).toBe(-100)
      expect(parseValue('1000', ScalarType.UINT32)).toBe(1000)
    })

    it('parses floats', () => {
      expect(parseValue('3.14', ScalarType.FLOAT)).toBe(3.14)
      expect(parseValue('2.718', ScalarType.DOUBLE)).toBe(2.718)
      expect(parseValue('-1.5', ScalarType.DOUBLE)).toBe(-1.5)
    })

    it('parses booleans', () => {
      expect(parseValue('true', ScalarType.BOOL)).toBe(true)
      expect(parseValue('false', ScalarType.BOOL)).toBe(false)
    })

    it('returns strings as-is', () => {
      expect(parseValue('hello', ScalarType.STRING)).toBe('hello')
      expect(parseValue('world', ScalarType.BYTES)).toBe('world')
    })

    it('handles empty values', () => {
      expect(parseValue('', ScalarType.STRING)).toBeUndefined()
      expect(parseValue('', ScalarType.INT32)).toBeUndefined()
      expect(parseValue('', ScalarType.BOOL)).toBeUndefined()
    })

    it('handles zero', () => {
      expect(parseValue('0', ScalarType.INT32)).toBe(0)
      expect(parseValue('0.0', ScalarType.DOUBLE)).toBe(0)
    })

    it('handles invalid numbers', () => {
      expect(parseValue('not-a-number', ScalarType.INT32)).toBeUndefined()
      expect(parseValue('abc', ScalarType.FLOAT)).toBeUndefined()
    })
  })

  describe('isEmpty', () => {
    it('returns true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true)
      expect(isEmpty(undefined)).toBe(true)
    })

    it('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true)
    })

    it('returns true for empty array', () => {
      expect(isEmpty([])).toBe(true)
    })

    it('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true)
    })

    it('returns false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false)
      expect(isEmpty(0)).toBe(false)
      expect(isEmpty(false)).toBe(false)
      expect(isEmpty([1, 2])).toBe(false)
      expect(isEmpty({ key: 'value' })).toBe(false)
    })
  })
})
