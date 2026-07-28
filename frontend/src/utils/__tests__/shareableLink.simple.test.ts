// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, expect } from 'vitest'
import { buildShareableUrl } from '../shareableLink'

// Helper function to parse share data from URL string
function parseShareFromUrl(url: string): { s: string; m: string; r: Record<string, unknown>; md?: Record<string, string> } | null {
  const hash = url.split('#')[1]
  if (!hash?.startsWith('share=')) return null

  const encoded = hash.slice('share='.length)
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) base64 += '='
    const json = decodeURIComponent(escape(atob(base64)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

describe('shareableLink - encoding', () => {
  describe('buildShareableUrl', () => {
    it('should build a valid URL with correct structure', () => {
      const url = buildShareableUrl('test.Service', 'GetUser', { id: '123' })

      expect(url).toContain('http://localhost:3000')
      expect(url).toContain('#share=')
    })

    it('should use URL-safe base64 encoding', () => {
      const url = buildShareableUrl('test.Service', 'Method', { key: 'value' })
      const encodedPart = url.split('#share=')[1]

      expect(encodedPart).toBeDefined()
      expect(encodedPart).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should encode and decode simple objects', () => {
      const url = buildShareableUrl('test.Service', 'GetUser', { id: '123', name: 'Alice' })
      const parsed = parseShareFromUrl(url)

      expect(parsed).toEqual({
        s: 'test.Service',
        m: 'GetUser',
        r: { id: '123', name: 'Alice' }
      })
    })

    it('should handle empty request body', () => {
      const url = buildShareableUrl('test.Service', 'Method', {})
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r).toEqual({})
    })

    it('should handle nested objects', () => {
      const body = {
        user: {
          id: '456',
          profile: { name: 'Bob', age: 30 }
        },
        tags: ['admin', 'user']
      }

      const url = buildShareableUrl('test.Service', 'CreateUser', body)
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r).toEqual(body)
    })

    it('should handle special characters', () => {
      const url = buildShareableUrl(
        'test.Service',
        'Method',
        { message: 'Hello "World" & <Friends>' }
      )
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r.message).toBe('Hello "World" & <Friends>')
    })

    it('should handle Unicode characters', () => {
      const url = buildShareableUrl(
        'test.Service',
        'Method',
        { message: '你好世界 🌍' }
      )
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r.message).toBe('你好世界 🌍')
    })

    it('should preserve data types', () => {
      const body = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3]
      }

      const url = buildShareableUrl('test.Service', 'Method', body)
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r).toEqual(body)
    })

    it('should handle service names with dots', () => {
      const url = buildShareableUrl('com.example.v1.UserService', 'Get', { id: 1 })
      const parsed = parseShareFromUrl(url)

      expect(parsed?.s).toBe('com.example.v1.UserService')
    })

    it('should handle method names with underscores', () => {
      const url = buildShareableUrl('test.Service', 'Get_User_By_Id', { id: 1 })
      const parsed = parseShareFromUrl(url)

      expect(parsed?.m).toBe('Get_User_By_Id')
    })

    it('should handle large payloads', () => {
      const largeBody: Record<string, unknown> = {}
      for (let i = 0; i < 50; i++) {
        largeBody[`field${i}`] = `value${i}`.repeat(5)
      }

      const url = buildShareableUrl('test.Service', 'Method', largeBody)
      const parsed = parseShareFromUrl(url)

      expect(parsed?.r).toEqual(largeBody)
    })

    it('should encode request metadata when provided', () => {
      const url = buildShareableUrl('test.Service', 'Method', { id: '1' }, { 'x-request-id': 'req-1' })
      const parsed = parseShareFromUrl(url)

      expect(parsed?.md).toEqual({ 'x-request-id': 'req-1' })
    })

    it('should omit metadata from the payload when empty or absent', () => {
      const withoutArg = parseShareFromUrl(buildShareableUrl('test.Service', 'Method', { id: '1' }))
      const withEmpty = parseShareFromUrl(buildShareableUrl('test.Service', 'Method', { id: '1' }, {}))

      expect(withoutArg && 'md' in withoutArg).toBe(false)
      expect(withEmpty && 'md' in withEmpty).toBe(false)
    })
  })
})
