// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import {
  getUserContextFromHeaders,
  userContextMiddleware,
  runWithUserContext,
  getCurrentUserContext,
  getCurrentUserId,
  getUserHeadersFromStreamPayload,
  getUserContextFromStreamPayload
} from '../middlewares/userContextMiddleware.js'

function createMockRequest(headers: Record<string, string>): Partial<Request> {
  return {
    headers,
    userContext: undefined
  }
}

function createMockResponse(): Partial<Response> {
  return {}
}

describe('User Context Middleware', () => {
  describe('getUserContextFromHeaders', () => {
    it('should extract user context from headers', () => {
      const headers = {
        'x-user-id': 'user123',
        'x-user-email': 'test@example.com',
        'x-user-name': 'Test User'
      }

      const context = getUserContextFromHeaders(headers)

      assert.strictEqual(context.userId, 'user123')
      assert.strictEqual(context.userEmail, 'test@example.com')
      assert.strictEqual(context.userName, 'Test User')
      assert.strictEqual(context.authenticated, true)
    })

    it('should handle case-insensitive headers', () => {
      const headers = {
        'X-User-Id': 'user456',
        'X-USER-EMAIL': 'test2@example.com'
      }

      const context = getUserContextFromHeaders(headers)

      assert.strictEqual(context.userId, 'user456')
      assert.strictEqual(context.userEmail, 'test2@example.com')
      assert.strictEqual(context.authenticated, true)
    })

    it('should return unauthenticated context when no user headers present', () => {
      const headers = {
        'content-type': 'application/json'
      }

      const context = getUserContextFromHeaders(headers)

      assert.strictEqual(context.userId, null)
      assert.strictEqual(context.userEmail, null)
      assert.strictEqual(context.userName, null)
      assert.strictEqual(context.authenticated, false)
    })

    it('should handle partial user headers', () => {
      const headers = {
        'x-user-id': 'user789'
      }

      const context = getUserContextFromHeaders(headers)

      assert.strictEqual(context.userId, 'user789')
      assert.strictEqual(context.userEmail, null)
      assert.strictEqual(context.userName, null)
      assert.strictEqual(context.authenticated, true)
    })

    it('should handle array header values', () => {
      const headers = {
        'x-user-id': ['user111', 'user222']
      }

      const context = getUserContextFromHeaders(headers as any)

      assert.strictEqual(context.userId, 'user111')
      assert.strictEqual(context.authenticated, true)
    })
  })

  describe('userContextMiddleware', () => {
    it('should attach user context to request object', () => {
      const req = createMockRequest({
        'x-user-id': 'user-middleware',
        'x-user-email': 'middleware@test.com'
      }) as Request

      const res = createMockResponse() as Response
      let nextCalled = false

      userContextMiddleware(req, res, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.strictEqual(nextCalled, true)
      assert.ok(req.userContext)
      assert.strictEqual(req.userContext.userId, 'user-middleware')
      assert.strictEqual(req.userContext.userEmail, 'middleware@test.com')
      assert.strictEqual(req.userContext.authenticated, true)
    })

    it('should work with unauthenticated requests', () => {
      const req = createMockRequest({}) as Request
      const res = createMockResponse() as Response
      let nextCalled = false

      userContextMiddleware(req, res, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.strictEqual(nextCalled, true)
      assert.ok(req.userContext)
      assert.strictEqual(req.userContext.authenticated, false)
    })
  })

  describe('runWithUserContext', () => {
    it('should run function with authenticated user context', () => {
      const userContext = {
        userId: 'user-run',
        userEmail: 'run@test.com',
        userName: 'Run User'
      }

      let capturedContext: any = null

      runWithUserContext(userContext, () => {
        capturedContext = getCurrentUserContext()
      })

      assert.ok(capturedContext)
      assert.strictEqual(capturedContext.userId, 'user-run')
      assert.strictEqual(capturedContext.userEmail, 'run@test.com')
      assert.strictEqual(capturedContext.userName, 'Run User')
      assert.strictEqual(capturedContext.authenticated, true)
    })

    it('should run function with unauthenticated context', () => {
      let capturedContext: any = null

      runWithUserContext(null, () => {
        capturedContext = getCurrentUserContext()
      })

      assert.ok(capturedContext)
      assert.strictEqual(capturedContext.userId, null)
      assert.strictEqual(capturedContext.authenticated, false)
    })

    it('should handle partial user context', () => {
      const userContext = {
        userId: 'partial-user',
        userEmail: null,
        userName: null
      }

      let capturedContext: any = null

      runWithUserContext(userContext, () => {
        capturedContext = getCurrentUserContext()
      })

      assert.ok(capturedContext)
      assert.strictEqual(capturedContext.userId, 'partial-user')
      assert.strictEqual(capturedContext.authenticated, true)
    })

    it('should return function result', () => {
      const result = runWithUserContext({ userId: 'test' }, () => {
        return 'test-result'
      })

      assert.strictEqual(result, 'test-result')
    })
  })

  describe('getCurrentUserContext', () => {
    it('should return null when called outside context', () => {
      const context = getCurrentUserContext()
      assert.strictEqual(context, null)
    })

    it('should return context when called inside runWithUserContext', () => {
      runWithUserContext({ userId: 'inside' }, () => {
        const context = getCurrentUserContext()
        assert.ok(context)
        assert.strictEqual(context.userId, 'inside')
      })
    })
  })

  describe('getCurrentUserId', () => {
    it('should return null when called outside context', () => {
      const userId = getCurrentUserId()
      assert.strictEqual(userId, null)
    })

    it('should return userId when called inside runWithUserContext', () => {
      runWithUserContext({ userId: 'current-user' }, () => {
        const userId = getCurrentUserId()
        assert.strictEqual(userId, 'current-user')
      })
    })

    it('should return null for unauthenticated context', () => {
      runWithUserContext(null, () => {
        const userId = getCurrentUserId()
        assert.strictEqual(userId, null)
      })
    })
  })

  describe('getUserHeadersFromStreamPayload', () => {
    it('should extract user headers from stream payload', () => {
      const payload = {
        userHeaders: {
          'x-user-id': 'stream-user',
          'x-user-email': 'stream@test.com'
        }
      }

      const headers = getUserHeadersFromStreamPayload(payload)

      assert.ok(headers)
      assert.strictEqual(headers['X-User-Id'], 'stream-user')
      assert.strictEqual(headers['X-User-Email'], 'stream@test.com')
    })

    it('should handle case-insensitive header keys', () => {
      const payload = {
        userHeaders: {
          'X-USER-ID': 'case-user',
          'x-user-name': 'Case User'
        }
      }

      const headers = getUserHeadersFromStreamPayload(payload)

      assert.ok(headers)
      assert.strictEqual(headers['X-User-Id'], 'case-user')
      assert.strictEqual(headers['X-User-Name'], 'Case User')
    })

    it('should return null for missing userHeaders', () => {
      const payload = {}
      const headers = getUserHeadersFromStreamPayload(payload)
      assert.strictEqual(headers, null)
    })

    it('should return null for non-object userHeaders', () => {
      const payload = {
        userHeaders: 'invalid'
      }
      const headers = getUserHeadersFromStreamPayload(payload)
      assert.strictEqual(headers, null)
    })

    it('should return null for non-string header values', () => {
      const payload = {
        userHeaders: {
          'x-user-id': 123
        }
      }
      const headers = getUserHeadersFromStreamPayload(payload)
      assert.strictEqual(headers, null)
    })

    it('should return null for unknown header keys', () => {
      const payload = {
        userHeaders: {
          'x-custom-header': 'value'
        }
      }
      const headers = getUserHeadersFromStreamPayload(payload)
      assert.strictEqual(headers, null)
    })

    it('should skip undefined header values', () => {
      const payload = {
        userHeaders: {
          'x-user-id': 'defined-user',
          'x-user-email': undefined
        }
      }

      const headers = getUserHeadersFromStreamPayload(payload)

      assert.ok(headers)
      assert.strictEqual(headers['X-User-Id'], 'defined-user')
      assert.strictEqual(headers['X-User-Email'], undefined)
    })
  })

  describe('getUserContextFromStreamPayload', () => {
    it('should extract user context from stream payload', () => {
      const payload = {
        userHeaders: {
          'x-user-id': 'stream-context',
          'x-user-email': 'stream-context@test.com'
        }
      }

      const context = getUserContextFromStreamPayload(payload)

      assert.ok(context)
      assert.strictEqual(context.userId, 'stream-context')
      assert.strictEqual(context.userEmail, 'stream-context@test.com')
      assert.strictEqual(context.authenticated, true)
    })

    it('should return null for invalid payload', () => {
      const payload = {
        userHeaders: 'invalid'
      }

      const context = getUserContextFromStreamPayload(payload)
      assert.strictEqual(context, null)
    })

    it('should return null for missing userHeaders', () => {
      const payload = {}
      const context = getUserContextFromStreamPayload(payload)
      assert.strictEqual(context, null)
    })
  })
})
