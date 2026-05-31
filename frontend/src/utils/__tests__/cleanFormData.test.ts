// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { cleanFormData } from '../cleanFormData'

describe('cleanFormData', () => {
  it('removes undefined values from objects', () => {
    const input = { a: 1, b: undefined, c: 'hello' }
    expect(cleanFormData(input)).toEqual({ a: 1, c: 'hello' })
  })

  it('recursively cleans nested objects', () => {
    const input = { a: { b: undefined, c: 2 }, d: 3 }
    expect(cleanFormData(input)).toEqual({ a: { c: 2 }, d: 3 })
  })

  it('filters undefined from arrays', () => {
    const input = [1, undefined, 3, undefined, 5]
    expect(cleanFormData(input)).toEqual([1, 3, 5])
  })

  it('treats null as undefined', () => {
    expect(cleanFormData(null)).toBeUndefined()
    expect(cleanFormData({ a: null })).toEqual({})
  })

  it('preserves primitive values', () => {
    expect(cleanFormData('hello')).toBe('hello')
    expect(cleanFormData(42)).toBe(42)
    expect(cleanFormData(true)).toBe(true)
    expect(cleanFormData(false)).toBe(false)
  })

  describe('google.protobuf.Any special handling', () => {
    it('treats Any with only @type as undefined', () => {
      // When user selects a type but hasn't entered data yet
      const input = { '@type': 'type.googleapis.com/google.protobuf.StringValue' }
      expect(cleanFormData(input)).toBeUndefined()
    })

    it('preserves Any when it has @type and data fields', () => {
      const input = { '@type': 'type.googleapis.com/google.protobuf.StringValue', 'value': 'hello' }
      expect(cleanFormData(input)).toEqual(input)
    })

    it('omits parent fields containing Any-with-only-@type', () => {
      const input = {
        name: 'test',
        extra_info: { '@type': 'type.googleapis.com/google.protobuf.BytesValue' }
      }
      expect(cleanFormData(input)).toEqual({ name: 'test' })
    })

    it('preserves nested Any fields with actual data', () => {
      const input = {
        name: 'test',
        extra_info: {
          '@type': 'type.googleapis.com/google.protobuf.StringValue',
          'value': 'metadata'
        }
      }
      expect(cleanFormData(input)).toEqual(input)
    })
  })
})
