// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { requestTimeout } from '../middlewares/timeoutMiddleware.js'
import { AppError } from '../errors/AppError.js'

// These tests drive time deterministically with node:test mock timers instead of real
// wall-clock waits — no sleeps, no timing races, instant and reproducible on loaded CI.

function createMockRequest(): Partial<Request> {
  return {
    method: 'GET',
    path: '/api/test'
  }
}

function createMockResponse(): {
  res: Partial<Response>
  events: Map<string, (() => void)[]>
  finished: boolean
} {
  const events = new Map<string, (() => void)[]>()
  const state = { finished: false }

  const res: Partial<Response> = {
    on: ((event: string, handler: () => void) => {
      if (!events.has(event)) {
        events.set(event, [])
      }
      events.get(event)!.push(handler)
      return res as Response
    }) as Response['on'],
    headersSent: false,
    get writableEnded() {
      return state.finished
    }
  }

  return {
    res,
    events,
    finished: state.finished
  }
}

describe('Timeout Middleware', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] })
  })

  afterEach(() => {
    mock.timers.reset()
  })

  describe('normal operation', () => {
    it('should call next immediately', () => {
      const middleware = requestTimeout(5000)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let nextCalled = false

      middleware(req, res as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(nextCalled, true)
    })

    it('should register finish and close handlers', () => {
      const middleware = requestTimeout(5000)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()

      middleware(req, res as Response, (() => {}) as NextFunction)

      assert.ok(events.has('finish'))
      assert.ok(events.has('close'))
      assert.equal(events.get('finish')!.length, 1)
      assert.equal(events.get('close')!.length, 1)
    })

    it('should clear timeout on finish event', () => {
      const middleware = requestTimeout(1000)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Trigger finish event immediately (clears the timer)
      events.get('finish')!.forEach(h => h())

      // Advance well past the timeout — it must not fire.
      mock.timers.tick(1500)

      assert.equal(timeoutErrorCalled, false)
    })

    it('should clear timeout on close event', () => {
      const middleware = requestTimeout(1000)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Trigger close event immediately (clears the timer)
      events.get('close')!.forEach(h => h())

      mock.timers.tick(1500)

      assert.equal(timeoutErrorCalled, false)
    })
  })

  describe('timeout behavior', () => {
    it('should call next with AppError after timeout', () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let capturedError: unknown = null

      middleware(req, res as Response, ((err?: unknown) => {
        capturedError = err
      }) as NextFunction)

      mock.timers.tick(200)

      assert.ok(capturedError instanceof AppError)
      assert.equal((capturedError as AppError).message, 'Request timeout')
      assert.equal((capturedError as AppError).statusCode, 408)
      assert.equal((capturedError as AppError).code, 'REQUEST_TIMEOUT')
    })

    it('should use default timeout of 30000ms', () => {
      const middleware = requestTimeout()
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Just before the default 30s deadline — should not have fired yet.
      mock.timers.tick(29999)
      assert.equal(timeoutErrorCalled, false)

      // Crossing the deadline fires it.
      mock.timers.tick(1)
      assert.equal(timeoutErrorCalled, true)
    })

    it('should respect custom timeout duration', () => {
      const middleware = requestTimeout(50)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError) {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      mock.timers.tick(100)

      assert.equal(timeoutErrorCalled, true)
    })
  })

  describe('edge cases', () => {
    it('should not call next with a timeout error if the response already finished', () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const mock2 = createMockResponse()
      // Simulate a response that completed before the timer fires.
      mock2.res = { ...mock2.res, get writableEnded() { return true }, headersSent: true }
      let timeoutErrorCalled = false

      middleware(req, mock2.res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      mock.timers.tick(200)

      // isResponseFinished() short-circuits the timeout callback.
      assert.equal(timeoutErrorCalled, false)
    })

    it('should handle multiple timeout middleware instances', () => {
      const middleware1 = requestTimeout(200)
      const middleware2 = requestTimeout(300)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()

      middleware1(req, res as Response, (() => {}) as NextFunction)
      middleware2(req, res as Response, (() => {}) as NextFunction)

      assert.equal(events.get('finish')!.length, 2)
      assert.equal(events.get('close')!.length, 2)
    })

    it('should handle very short timeout', () => {
      const middleware = requestTimeout(1)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      mock.timers.tick(1)

      assert.equal(timeoutErrorCalled, true)
    })

    it('should handle zero timeout', () => {
      const middleware = requestTimeout(0)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // A 0ms timer fires on the next tick.
      mock.timers.tick(0)

      assert.equal(timeoutErrorCalled, true)
    })
  })

  describe('cleanup', () => {
    it('should only fire timeout once even if neither finish nor close called', () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutCount = 0

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutCount++
        }
      }) as NextFunction)

      // Advance well past the deadline — setTimeout is one-shot, so it fires once.
      mock.timers.tick(300)

      assert.equal(timeoutCount, 1)
    })

    it('should clear timer when finish called', () => {
      const middleware = requestTimeout(200)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Partway to the deadline, the response finishes and clears the timer.
      mock.timers.tick(50)
      events.get('finish')!.forEach(h => h())

      // Advance past the original deadline — must not fire.
      mock.timers.tick(250)

      assert.equal(timeoutErrorCalled, false)
    })
  })
})
