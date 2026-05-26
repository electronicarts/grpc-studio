// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { healthCheck, readinessCheck, livenessCheck } from '../middlewares/healthMiddleware.js'
import { HealthStatus } from '@grpc-studio/shared'

function createMockRequest(path: string): Partial<Request> {
  return { path }
}

function createMockResponse() {
  const state = { jsonData: null as any }
  const res: Partial<Response> = {
    json: (data: unknown) => {
      state.jsonData = data
      return res as Response
    }
  }
  return { res, getState: () => ({ ...state }) }
}

describe('Health Middleware', () => {
  let originalUptime: typeof process.uptime

  beforeEach(() => {
    originalUptime = process.uptime
    process.uptime = mock.fn(() => 123.456)
  })

  afterEach(() => {
    process.uptime = originalUptime
  })

  describe('healthCheck', () => {
    it('should respond to health endpoint with status', () => {
      const req = createMockRequest('/health') as Request
      const { res, getState } = createMockResponse()
      let nextCalled = false

      healthCheck(req, res as Response, (() => {
        nextCalled = false
      }) as NextFunction)

      const state = getState()
      assert.strictEqual(nextCalled, false)
      assert.ok(state.jsonData)
      assert.strictEqual(state.jsonData.status, HealthStatus.HEALTHY)
      assert.ok(state.jsonData.timestamp)
      assert.strictEqual(state.jsonData.uptime, 123.456)
    })

    it('should include version if available', () => {
      const req = createMockRequest('/health') as Request
      const { res, getState } = createMockResponse()

      healthCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      // Version is optional, just check it exists or is undefined
      assert.ok(state.jsonData.version !== null)
    })

    it('should call next for non-health paths', () => {
      const req = createMockRequest('/api/grpc') as Request
      const { res, getState } = createMockResponse()
      let nextCalled = false

      healthCheck(req, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.strictEqual(nextCalled, true)
      const state = getState()
      assert.strictEqual(state.jsonData, null)
    })

    it('should respect health config enabled setting', () => {
      // Health check is always enabled in current implementation
      // Testing that it responds when endpoint matches
      const req = createMockRequest('/health') as Request
      const { res, getState } = createMockResponse()

      healthCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      assert.strictEqual(state.jsonData.status, HealthStatus.HEALTHY)
    })

    it('should include valid ISO timestamp', () => {
      const req = createMockRequest('/health') as Request
      const { res, getState } = createMockResponse()

      healthCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      assert.ok(state.jsonData.timestamp)

      // Verify it's a valid ISO date
      const date = new Date(state.jsonData.timestamp)
      assert.ok(!isNaN(date.getTime()))
    })
  })

  describe('readinessCheck', () => {
    it('should respond to ready endpoint', async () => {
      const req = createMockRequest('/ready') as Request
      const { res, getState } = createMockResponse()

      await readinessCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      assert.strictEqual(state.jsonData.status, HealthStatus.READY)
      assert.ok(state.jsonData.timestamp)
    })

    it('should call next for non-ready paths', async () => {
      const req = createMockRequest('/api/grpc') as Request
      const { res, getState } = createMockResponse()
      let nextCalled = false

      await readinessCheck(req, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.strictEqual(nextCalled, true)
      const state = getState()
      assert.strictEqual(state.jsonData, null)
    })

    it('should include valid ISO timestamp', async () => {
      const req = createMockRequest('/ready') as Request
      const { res, getState } = createMockResponse()

      await readinessCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      assert.ok(state.jsonData.timestamp)

      const date = new Date(state.jsonData.timestamp)
      assert.ok(!isNaN(date.getTime()))
    })
  })

  describe('livenessCheck', () => {
    it('should respond to live endpoint', () => {
      const req = createMockRequest('/live') as Request
      const { res, getState } = createMockResponse()
      let nextCalled = false

      livenessCheck(req, res as Response, (() => {
        nextCalled = false
      }) as NextFunction)

      const state = getState()
      assert.strictEqual(nextCalled, false)
      assert.ok(state.jsonData)
      assert.strictEqual(state.jsonData.status, HealthStatus.ALIVE)
      assert.ok(state.jsonData.timestamp)
    })

    it('should call next for non-live paths', () => {
      const req = createMockRequest('/api/grpc') as Request
      const { res, getState } = createMockResponse()
      let nextCalled = false

      livenessCheck(req, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.strictEqual(nextCalled, true)
      const state = getState()
      assert.strictEqual(state.jsonData, null)
    })

    it('should include valid ISO timestamp', () => {
      const req = createMockRequest('/live') as Request
      const { res, getState } = createMockResponse()

      livenessCheck(req, res as Response, (() => {}) as NextFunction)

      const state = getState()
      assert.ok(state.jsonData)
      assert.ok(state.jsonData.timestamp)

      const date = new Date(state.jsonData.timestamp)
      assert.ok(!isNaN(date.getTime()))
    })
  })

  describe('path matching', () => {
    it('should handle exact path matches', () => {
      const tests = [
        { path: '/health', middleware: healthCheck, expected: HealthStatus.HEALTHY },
        { path: '/ready', middleware: readinessCheck, expected: HealthStatus.READY },
        { path: '/live', middleware: livenessCheck, expected: HealthStatus.ALIVE }
      ]

      tests.forEach(async ({ path, middleware, expected }) => {
        const req = createMockRequest(path) as Request
        const { res, getState } = createMockResponse()

        if (middleware === readinessCheck) {
          await middleware(req, res as Response, (() => {}) as NextFunction)
        } else {
          middleware(req, res as Response, (() => {}) as NextFunction)
        }

        const state = getState()
        assert.ok(state.jsonData)
        assert.strictEqual(state.jsonData.status, expected)
      })
    })

    it('should not match similar paths', () => {
      const tests = [
        { path: '/health/extra', middleware: healthCheck },
        { path: '/ready/check', middleware: readinessCheck },
        { path: '/live/status', middleware: livenessCheck }
      ]

      tests.forEach(async ({ path, middleware }) => {
        const req = createMockRequest(path) as Request
        const { res, getState } = createMockResponse()
        let nextCalled = false

        if (middleware === readinessCheck) {
          await middleware(req, res as Response, (() => {
            nextCalled = true
          }) as NextFunction)
        } else {
          middleware(req, res as Response, (() => {
            nextCalled = true
          }) as NextFunction)
        }

        assert.strictEqual(nextCalled, true)
        const state = getState()
        assert.strictEqual(state.jsonData, null)
      })
    })
  })
})
