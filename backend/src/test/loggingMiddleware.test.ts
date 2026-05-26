// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { requestLogger } from '../middlewares/loggingMiddleware.js'

// Mock request/response
function createMockRequest(headers: Record<string, string> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/api/test',
    get: (key: string) => headers[key.toLowerCase()],
    headers: headers as any
  }
}

function createMockResponse(): {
  res: Partial<Response>
  headers: Map<string, string>
  events: Map<string, () => void>
} {
  const headers = new Map<string, string>()
  const events = new Map<string, () => void>()

  const res = {
    setHeader: (key: string, value: string) => {
      headers.set(key, value)
      return res
    },
    get: (key: string) => headers.get(key),
    on: (event: string, handler: () => void) => {
      events.set(event, handler)
      return res
    },
    statusCode: 200
  }

  return { res, headers, events }
}

describe('Logging Middleware', () => {
  describe('request ID generation', () => {
    it('should generate a new request ID if not provided', () => {
      const req = createMockRequest() as Request
      const { res, headers } = createMockResponse()
      let nextCalled = false

      requestLogger(req, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.ok(req.id, 'Request ID should be set')
      assert.ok(headers.has('X-Request-Id'), 'Response header should be set')
      assert.equal(req.id, headers.get('X-Request-Id'))
      assert.equal(nextCalled, true)
    })

    it('should use provided valid UUID request ID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      const req = createMockRequest({
        'x-request-id': validUuid
      }) as Request
      const { res, headers } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.equal(req.id, validUuid)
      assert.equal(headers.get('X-Request-Id'), validUuid)
    })

    it('should reject invalid request ID format', () => {
      const invalidId = 'not-a-uuid-123'
      const req = createMockRequest({
        'x-request-id': invalidId
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      // Should generate new UUID instead of using invalid one
      assert.notEqual(req.id, invalidId)
      assert.ok(req.id)
      assert.match(req.id!, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should reject request ID with CRLF injection attempt', () => {
      const maliciousId = '550e8400\r\nInjected: header'
      const req = createMockRequest({
        'x-request-id': maliciousId
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      // Should generate new UUID instead
      assert.notEqual(req.id, maliciousId)
      assert.ok(req.id)
      assert.ok(!req.id!.includes('\r'))
      assert.ok(!req.id!.includes('\n'))
    })

    it('should reject request ID with special characters', () => {
      const maliciousId = '<script>alert(1)</script>'
      const req = createMockRequest({
        'x-request-id': maliciousId
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.notEqual(req.id, maliciousId)
      assert.match(req.id!, /^[0-9a-f-]+$/i)
    })

    it('should handle uppercase UUIDs', () => {
      const upperUuid = '550E8400-E29B-41D4-A716-446655440000'
      const req = createMockRequest({
        'x-request-id': upperUuid
      }) as Request
      const { res, headers } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.equal(req.id, upperUuid)
      assert.equal(headers.get('X-Request-Id'), upperUuid)
    })

    it('should reject UUID with wrong segment lengths', () => {
      const invalidUuid = '550e840-e29b-41d4-a716-446655440000' // First segment too short
      const req = createMockRequest({
        'x-request-id': invalidUuid
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.notEqual(req.id, invalidUuid)
    })
  })

  describe('response logging', () => {
    it('should log response on finish event', () => {
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      // Verify finish event handler is registered
      assert.ok(events.has('finish'))

      // Trigger finish event
      const finishHandler = events.get('finish')!
      assert.doesNotThrow(() => {
        finishHandler()
      })
    })

    it('should include response status code in logs', () => {
      const req = createMockRequest() as Request
      const mock = createMockResponse()
      mock.res.statusCode = 404

      requestLogger(req, mock.res as Response, (() => {}) as NextFunction)

      const finishHandler = mock.events.get('finish')!
      assert.doesNotThrow(() => {
        finishHandler()
      })
    })
  })

  describe('edge cases', () => {
    it('should handle missing headers gracefully', () => {
      const req = createMockRequest({}) as Request
      const { res } = createMockResponse()

      assert.doesNotThrow(() => {
        requestLogger(req, res as Response, (() => {}) as NextFunction)
      })

      assert.ok(req.id)
    })

    it('should handle empty string request ID', () => {
      const req = createMockRequest({
        'x-request-id': ''
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.ok(req.id)
      assert.notEqual(req.id, '')
    })

    it('should handle whitespace-only request ID', () => {
      const req = createMockRequest({
        'x-request-id': '   '
      }) as Request
      const { res } = createMockResponse()

      requestLogger(req, res as Response, (() => {}) as NextFunction)

      assert.ok(req.id)
      assert.notEqual(req.id!.trim(), '')
    })

    it('should set X-Request-Id header before calling next', () => {
      const req = createMockRequest() as Request
      const { res, headers } = createMockResponse()
      let headerSetBeforeNext = false

      requestLogger(req, res as Response, (() => {
        headerSetBeforeNext = headers.has('X-Request-Id')
      }) as NextFunction)

      assert.equal(headerSetBeforeNext, true)
    })
  })

  describe('UUID format validation', () => {
    const validUuids = [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
    ]

    validUuids.forEach(uuid => {
      it(`should accept valid UUID: ${uuid}`, () => {
        const req = createMockRequest({
          'x-request-id': uuid
        }) as Request
        const { res } = createMockResponse()

        requestLogger(req, res as Response, (() => {}) as NextFunction)

        assert.equal(req.id, uuid)
      })
    })

    const invalidUuids = [
      '550e8400-e29b-41d4-a716',  // Too short
      '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
      '550e8400e29b41d4a716446655440000', // No dashes
      'gggggggg-eeee-eeee-eeee-eeeeeeeeeeee', // Invalid hex
      '550e8400-e29b-41d4-a716-44665544000',  // Last segment too short
      '550e84000-e29b-41d4-a716-446655440000' // First segment too long
    ]

    invalidUuids.forEach(uuid => {
      it(`should reject invalid UUID: ${uuid}`, () => {
        const req = createMockRequest({
          'x-request-id': uuid
        }) as Request
        const { res } = createMockResponse()

        requestLogger(req, res as Response, (() => {}) as NextFunction)

        assert.notEqual(req.id, uuid)
        assert.match(req.id!, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      })
    })
  })
})
