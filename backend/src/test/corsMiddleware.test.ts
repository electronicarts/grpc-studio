// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { cors, createCors } from '../middlewares/corsMiddleware.js'

// Mock request/response helpers
function createMockRequest(method: string, origin?: string): Partial<Request> {
  return {
    method,
    headers: origin ? { origin } : {},
    id: 'test-request-id',
  }
}

function createMockResponse(): {
  res: Partial<Response>
  headers: Map<string, string>
  getState: () => { statusCode: number | null; jsonData: unknown | null; sendStatusCode: number | null }
} {
  const headers = new Map<string, string>()
  const state = {
    statusCode: null as number | null,
    jsonData: null as unknown,
    sendStatusCode: null as number | null
  }

  const res: Partial<Response> = {
    header: (key: string, value: string) => {
      headers.set(key, value)
      return res as Response
    },
    status: (code: number) => {
      state.statusCode = code
      return res as Response
    },
    json: (data: unknown) => {
      state.jsonData = data
      return res as Response
    },
    sendStatus: (code: number) => {
      state.sendStatusCode = code
      return res as Response
    }
  }

  return {
    res,
    headers,
    getState: () => ({ ...state })
  }
}

describe('CORS Middleware', () => {
  describe('default permissive mode', () => {
    it('should allow requests from localhost:3000', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'http://localhost:3000')
      const { res, headers } = createMockResponse()
      let nextCalled = false

      middleware(req as Request, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000')
      assert.equal(headers.get('Access-Control-Allow-Credentials'), 'true')
      assert.equal(headers.get('Vary'), 'Origin')
      assert.equal(nextCalled, true)
    })

    it('should allow multiple configured origins', () => {
      const middleware = cors(['http://localhost:3000', 'http://localhost:4173'])

      // Test first origin
      const req1 = createMockRequest('GET', 'http://localhost:3000')
      const mock1 = createMockResponse()
      let next1Called = false

      middleware(req1 as Request, mock1.res as Response, (() => {
        next1Called = true
      }) as NextFunction)

      assert.equal(mock1.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000')
      assert.equal(next1Called, true)

      // Test second origin
      const req2 = createMockRequest('GET', 'http://localhost:4173')
      const mock2 = createMockResponse()
      let next2Called = false

      middleware(req2 as Request, mock2.res as Response, (() => {
        next2Called = true
      }) as NextFunction)

      assert.equal(mock2.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4173')
      assert.equal(next2Called, true)
    })

    it('should reject disallowed origins in non-strict mode', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'http://evil.com')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      // Should not set CORS headers for disallowed origin
      assert.equal(mock.headers.has('Access-Control-Allow-Origin'), false)
      // But should call next() (permissive)
      assert.equal(nextCalled, true)
    })

    it('should allow requests without origin header in non-strict mode', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(mock.headers.has('Access-Control-Allow-Origin'), false)
      assert.equal(nextCalled, true)
    })
  })

  describe('OPTIONS preflight handling', () => {
    it('should handle OPTIONS preflight for allowed origin', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('OPTIONS', 'http://localhost:3000')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(mock.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000')
      assert.equal(mock.headers.get('Access-Control-Allow-Methods'), 'GET, POST, PUT, DELETE, OPTIONS')
      assert.ok(mock.headers.get('Access-Control-Allow-Headers'))
      assert.equal(mock.getState().sendStatusCode, 204)
      assert.equal(nextCalled, false) // Should not call next for OPTIONS
    })

    it('should reject OPTIONS preflight for disallowed origin with 403', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('OPTIONS', 'http://evil.com')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      const state = mock.getState()
      // Should return 403 with error body
      assert.equal(state.statusCode, 403)
      assert.ok(state.jsonData)
      assert.equal((state.jsonData as any).error.code, 'CORS_VIOLATION')
      assert.equal(nextCalled, false)
    })

    it('should include correct CORS headers in OPTIONS response', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('OPTIONS', 'http://localhost:3000')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      assert.equal(mock.headers.get('Access-Control-Allow-Methods'), 'GET, POST, PUT, DELETE, OPTIONS')
      assert.ok(mock.headers.get('Access-Control-Allow-Headers')?.includes('Content-Type'))
      assert.ok(mock.headers.get('Access-Control-Allow-Headers')?.includes('Authorization'))
    })
  })

  describe('strict mode', () => {
    it('should reject disallowed origins with 403 in strict mode', () => {
      const middleware = createCors({
        enabled: true,
        origins: ['http://localhost:3000'],
        credentials: true,
        strict: true
      })

      const req = createMockRequest('GET', 'http://evil.com')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      const state = mock.getState()
      // In strict mode, should reject with 403
      assert.equal(state.statusCode, 403)
      assert.ok(state.jsonData)
      assert.equal((state.jsonData as any).error.code, 'CORS_VIOLATION')
      assert.equal(nextCalled, false)
    })

    it('should allow valid origins even in strict mode', () => {
      const middleware = createCors({
        enabled: true,
        origins: ['http://localhost:3000'],
        credentials: true,
        strict: true
      })

      const req = createMockRequest('GET', 'http://localhost:3000')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(mock.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000')
      assert.equal(nextCalled, true)
    })

    it('should reject OPTIONS preflight in strict mode for disallowed origin', () => {
      const middleware = createCors({
        enabled: true,
        origins: ['http://localhost:3000'],
        credentials: true,
        strict: true
      })

      const req = createMockRequest('OPTIONS', 'http://evil.com')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      const state = mock.getState()
      assert.equal(state.statusCode, 403)
      assert.ok(state.jsonData)
    })
  })

  describe('credentials handling', () => {
    it('should set Access-Control-Allow-Credentials when enabled', () => {
      const middleware = cors({
        origins: ['http://localhost:3000'],
        credentials: true
      })

      const req = createMockRequest('GET', 'http://localhost:3000')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      assert.equal(mock.headers.get('Access-Control-Allow-Credentials'), 'true')
    })

    it('should not set Access-Control-Allow-Credentials when disabled', () => {
      const middleware = createCors({
        enabled: true,
        origins: ['http://localhost:3000'],
        credentials: false // Disabled
      })

      const req = createMockRequest('GET', 'http://localhost:3000')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      // Should not set the credentials header when disabled
      assert.equal(mock.headers.has('Access-Control-Allow-Credentials'), false)
    })
  })

  describe('custom headers', () => {
    it('should include user context headers in allowed headers', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('OPTIONS', 'http://localhost:3000')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      const allowedHeaders = mock.headers.get('Access-Control-Allow-Headers')
      assert.ok(allowedHeaders)
      assert.ok(allowedHeaders.includes('X-User-Id'))
      assert.ok(allowedHeaders.includes('X-User-Email'))
      assert.ok(allowedHeaders.includes('X-User-Name'))
    })
  })

  describe('Vary header', () => {
    it('should always set Vary: Origin for allowed requests', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'http://localhost:3000')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      assert.equal(mock.headers.get('Vary'), 'Origin')
    })
  })

  describe('edge cases', () => {
    it('should handle case-sensitive origins correctly', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'HTTP://LOCALHOST:3000')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      // Origin matching is case-sensitive in URL spec
      assert.equal(mock.headers.has('Access-Control-Allow-Origin'), false)
      assert.equal(nextCalled, true) // Still proceeds in non-strict mode
    })

    it('should handle origins with different ports', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'http://localhost:3001')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      assert.equal(mock.headers.has('Access-Control-Allow-Origin'), false)
    })

    it('should handle origins with paths correctly', () => {
      const middleware = cors(['http://localhost:3000'])
      const req = createMockRequest('GET', 'http://localhost:3000/path')
      const mock = createMockResponse()

      middleware(req as Request, mock.res as Response, (() => {}) as NextFunction)

      // Origin should not include path
      assert.equal(mock.headers.has('Access-Control-Allow-Origin'), false)
    })

    it('should handle HTTPS origins', () => {
      const middleware = cors(['https://app.example.com'])
      const req = createMockRequest('GET', 'https://app.example.com')
      const mock = createMockResponse()
      let nextCalled = false

      middleware(req as Request, mock.res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(mock.headers.get('Access-Control-Allow-Origin'), 'https://app.example.com')
      assert.equal(nextCalled, true)
    })
  })
})
