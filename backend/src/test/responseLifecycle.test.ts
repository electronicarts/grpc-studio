// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { errorHandler } from '../middlewares/errorMiddleware.js'
import { requestTimeout } from '../middlewares/timeoutMiddleware.js'
import { responseHelpers } from '../utils/responseHelpers.js'

type MockResponse = Response & {
  statusCalls: number[]
  jsonCalls: unknown[]
}

describe('response lifecycle guards', () => {
  it('does not send a success response after the response has already been sent', () => {
    const res = createMockResponse({ headersSent: true, statusCode: 408 })

    withMutedConsoleWarn(() => {
      responseHelpers.success(res, { late: true })
    })

    assert.deepEqual(res.statusCalls, [])
    assert.deepEqual(res.jsonCalls, [])
    assert.equal(res.statusCode, 408)
  })

  it('does not send an error response after the response has already been sent', () => {
    const req = {
      id: 'request-1',
      method: 'POST',
      url: '/api/grpc/discover',
    } as Request
    const res = createMockResponse({ headersSent: true, statusCode: 408 })
    const nextCalls: unknown[] = []
    const next: NextFunction = (error?: unknown) => {
      nextCalls.push(error)
    }

    withMutedConsoleWarn(() => {
      errorHandler(new Error('late discovery failure'), req, res, next)
    })

    assert.deepEqual(res.statusCalls, [])
    assert.deepEqual(res.jsonCalls, [])
    assert.deepEqual(nextCalls, [])
    assert.equal(res.statusCode, 408)
  })

  it('forwards request timeouts through the centralized error path', async () => {
    const req = {} as Request
    const res = createEventedResponse()

    const error = await new Promise<unknown>((resolve) => {
      requestTimeout(1)(req, res, (maybeError?: unknown) => {
        if (maybeError) resolve(maybeError)
      })
    })

    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, 408)
    assert.equal(error.code, 'REQUEST_TIMEOUT')
  })
})

function createMockResponse(options: {
  headersSent?: boolean
  writableEnded?: boolean
  destroyed?: boolean
  statusCode?: number
} = {}): MockResponse {
  const statusCalls: number[] = []
  const jsonCalls: unknown[] = []

  const res = {
    headersSent: options.headersSent ?? false,
    writableEnded: options.writableEnded ?? false,
    destroyed: options.destroyed ?? false,
    statusCode: options.statusCode ?? 200,
    status(code: number) {
      statusCalls.push(code)
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      jsonCalls.push(body)
      res.headersSent = true
      ;(res as { writableEnded: boolean }).writableEnded = true
      return res
    },
    statusCalls,
    jsonCalls,
  } as unknown as MockResponse

  return res
}

function withMutedConsoleWarn(fn: () => void): void {
  const originalWarn = console.warn
  console.warn = () => {}

  try {
    fn()
  } finally {
    console.warn = originalWarn
  }
}

function createEventedResponse(): Response {
  const res = Object.assign(new EventEmitter(), {
    headersSent: false,
    writableEnded: false,
    destroyed: false,
  })

  return res as unknown as Response
}
