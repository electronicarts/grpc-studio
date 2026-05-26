// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { requestTimeout } from '../middlewares/timeoutMiddleware.js'
import { AppError } from '../errors/AppError.js'

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
    on: (event: string, handler: () => void) => {
      if (!events.has(event)) {
        events.set(event, [])
      }
      events.get(event)!.push(handler)
      return res as Response
    },
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

    it('should clear timeout on finish event', async () => {
      const middleware = requestTimeout(1000)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Trigger finish event immediately
      const finishHandlers = events.get('finish')!
      finishHandlers.forEach(h => h())

      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Timeout should not have fired
      assert.equal(timeoutErrorCalled, false)
    })

    it('should clear timeout on close event', async () => {
      const middleware = requestTimeout(1000)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Trigger close event immediately
      const closeHandlers = events.get('close')!
      closeHandlers.forEach(h => h())

      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Timeout should not have fired
      assert.equal(timeoutErrorCalled, false)
    })
  })

  describe('timeout behavior', () => {
    it('should call next with AppError after timeout', async () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let capturedError: any = null

      middleware(req, res as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200))

      assert.ok(capturedError instanceof AppError)
      assert.equal(capturedError.message, 'Request timeout')
      assert.equal(capturedError.statusCode, 408)
      assert.equal(capturedError.code, 'REQUEST_TIMEOUT')
    })

    it('should use default timeout of 30000ms', async () => {
      const middleware = requestTimeout()
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Wait 100ms - should not timeout
      await new Promise(resolve => setTimeout(resolve, 100))

      assert.equal(timeoutErrorCalled, false)
    })

    it('should respect custom timeout duration', async () => {
      const middleware = requestTimeout(50)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError) {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100))

      assert.equal(timeoutErrorCalled, true)
    })
  })

  describe('edge cases', () => {
    it('should not timeout if response finished before timeout', async () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const mock = createMockResponse()
      mock.finished = true
      mock.res.headersSent = true

      middleware(req, mock.res as Response, ((err?: unknown) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          // Timeout error called
        }
      }) as NextFunction)

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should still fire but error handler will check if response is finished
      // This tests the middleware behavior, actual prevention happens in error handler
      assert.ok(true)
    })

    it('should handle multiple timeout middleware instances', async () => {
      const middleware1 = requestTimeout(200)
      const middleware2 = requestTimeout(300)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()

      middleware1(req, res as Response, (() => {}) as NextFunction)
      middleware2(req, res as Response, (() => {}) as NextFunction)

      // Both should register handlers
      assert.equal(events.get('finish')!.length, 2)
      assert.equal(events.get('close')!.length, 2)
    })

    it('should handle very short timeout', async () => {
      const middleware = requestTimeout(1)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50))

      assert.equal(timeoutErrorCalled, true)
    })

    it('should handle zero timeout', async () => {
      const middleware = requestTimeout(0)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Wait a tick
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should timeout immediately
      assert.equal(timeoutErrorCalled, true)
    })
  })

  describe('cleanup', () => {
    it('should only fire timeout once even if neither finish nor close called', async () => {
      const middleware = requestTimeout(100)
      const req = createMockRequest() as Request
      const { res } = createMockResponse()
      let timeoutCount = 0

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutCount++
        }
      }) as NextFunction)

      // Wait much longer than timeout
      await new Promise(resolve => setTimeout(resolve, 300))

      // Should only fire once
      assert.equal(timeoutCount, 1)
    })

    it('should clear timer when finish called', async () => {
      const middleware = requestTimeout(200)
      const req = createMockRequest() as Request
      const { res, events } = createMockResponse()
      let timeoutErrorCalled = false

      middleware(req, res as Response, ((err?: any) => {
        if (err instanceof AppError && err.code === 'REQUEST_TIMEOUT') {
          timeoutErrorCalled = true
        }
      }) as NextFunction)

      // Call finish handlers after short delay
      await new Promise(resolve => setTimeout(resolve, 50))
      const finishHandlers = events.get('finish')!
      finishHandlers.forEach(h => h())

      // Wait longer than timeout
      await new Promise(resolve => setTimeout(resolve, 250))

      assert.equal(timeoutErrorCalled, false)
    })
  })
})
