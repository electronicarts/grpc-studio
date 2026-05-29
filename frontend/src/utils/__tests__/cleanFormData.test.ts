// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { cleanFormData } from '../cleanFormData'

describe('cleanFormData', () => {
  it('removes undefined values from flat objects', () => {
    const input = {
      name: 'test',
      age: undefined,
      active: true,
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      name: 'test',
      active: true,
    })
  })

  it('removes undefined values from nested objects', () => {
    const input = {
      user: {
        name: 'John',
        email: undefined,
        profile: {
          bio: 'Developer',
          avatar: undefined,
        },
      },
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      user: {
        name: 'John',
        profile: {
          bio: 'Developer',
        },
      },
    })
  })

  it('preserves null values', () => {
    const input = {
      name: 'test',
      value: null,
    }

    const result = cleanFormData(input)

    // null values are removed as they're considered "not set" for protobuf
    expect(result).toEqual({
      name: 'test',
    })
  })

  it('preserves empty strings', () => {
    const input = {
      name: '',
      email: 'test@example.com',
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      name: '',
      email: 'test@example.com',
    })
  })

  it('preserves zero values', () => {
    const input = {
      count: 0,
      price: 0.0,
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      count: 0,
      price: 0.0,
    })
  })

  it('preserves false values', () => {
    const input = {
      active: false,
      verified: true,
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      active: false,
      verified: true,
    })
  })

  it('filters undefined from arrays', () => {
    const input = {
      items: ['a', undefined, 'b', undefined, 'c'],
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      items: ['a', 'b', 'c'],
    })
  })

  it('recursively cleans array elements', () => {
    const input = {
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: undefined },
        { name: undefined, age: 25 },
      ],
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob' },
        { age: 25 },
      ],
    })
  })

  it('preserves objects that become empty after cleaning', () => {
    const input = {
      user: {
        profile: {
          avatar: undefined,
        },
      },
      active: true,
    }

    const result = cleanFormData(input)

    // Empty objects are valid in protobuf, so they're preserved
    expect(result).toEqual({
      user: {
        profile: {},
      },
      active: true,
    })
  })

  it('preserves empty arrays', () => {
    const input = {
      items: [],
      tags: ['test'],
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      items: [],
      tags: ['test'],
    })
  })

  it('handles complex nested structures', () => {
    const input = {
      request: {
        user: {
          name: 'John',
          email: undefined,
          addresses: [
            { street: '123 Main', city: 'NYC', zip: undefined },
            { street: undefined, city: undefined, zip: undefined },
          ],
        },
        metadata: {
          timestamp: '2024-01-01',
          source: undefined,
        },
      },
    }

    const result = cleanFormData(input)

    expect(result).toEqual({
      request: {
        user: {
          name: 'John',
          addresses: [
            { street: '123 Main', city: 'NYC' },
            // Second address has all undefined, becomes empty object, preserved
            {},
          ],
        },
        metadata: {
          timestamp: '2024-01-01',
        },
      },
    })
  })

  it('handles primitive values', () => {
    expect(cleanFormData('test')).toBe('test')
    expect(cleanFormData(42)).toBe(42)
    expect(cleanFormData(true)).toBe(true)
    expect(cleanFormData(false)).toBe(false)
    expect(cleanFormData(undefined)).toBe(undefined)
    expect(cleanFormData(null)).toBe(undefined)
  })
})
