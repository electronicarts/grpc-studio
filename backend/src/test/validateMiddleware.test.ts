// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Request, Response, NextFunction } from 'express'
import { validate, isNonEmptyString, isMethodKind } from '../middlewares/validateMiddleware.js'
import { AppError } from '../errors/AppError.js'

function createMockRequest(body?: unknown, params?: unknown, query?: unknown): Partial<Request> {
  return {
    body: body || {},
    params: params || {},
    query: query || {}
  }
}

describe('Validation Middleware', () => {
  describe('validate function', () => {
    it('should call next when all validations pass', () => {
      const middleware = validate({
        body: {
          name: isNonEmptyString('name'),
          type: isMethodKind('type')
        }
      })

      const req = createMockRequest({ name: 'test', type: 'unary' }) as Request
      let nextCalled = false
      let nextError: any = undefined

      middleware(req, {} as Response, ((err?: any) => {
        nextCalled = true
        nextError = err
      }) as NextFunction)

      assert.equal(nextCalled, true)
      assert.equal(nextError, undefined)
    })

    it('should call next with AppError when validation fails', () => {
      const middleware = validate({
        body: {
          name: isNonEmptyString('name')
        }
      })

      const req = createMockRequest({ name: '' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.equal(capturedError.statusCode, 400)
      assert.equal(capturedError.code, 'VALIDATION_ERROR')
      assert.ok(capturedError.message.includes('name'))
    })

    it('should validate request body', () => {
      const middleware = validate({
        body: {
          email: (v) => typeof v === 'string' && v.includes('@') ? true : 'email must be valid'
        }
      })

      const req = createMockRequest({ email: 'invalid' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('email'))
    })

    it('should validate request params', () => {
      const middleware = validate({
        params: {
          id: (v) => typeof v === 'string' && v.length > 0 ? true : 'id is required'
        }
      })

      const req = createMockRequest(undefined, { id: '' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('params.id'))
    })

    it('should validate request query', () => {
      const middleware = validate({
        query: {
          page: (v) => !isNaN(Number(v)) ? true : 'page must be a number'
        }
      })

      const req = createMockRequest(undefined, undefined, { page: 'abc' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('query.page'))
    })

    it('should validate multiple fields', () => {
      const middleware = validate({
        body: {
          name: isNonEmptyString('name'),
          email: (v) => typeof v === 'string' && v.includes('@') ? true : 'email invalid'
        }
      })

      const req = createMockRequest({ name: '', email: 'invalid' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('name'))
      assert.ok(capturedError.message.includes('email'))
    })

    it('should validate across body, params, and query', () => {
      const middleware = validate({
        body: { name: isNonEmptyString('name') },
        params: { id: isNonEmptyString('id') },
        query: { type: isNonEmptyString('type') }
      })

      const req = createMockRequest(
        { name: 'test' },
        { id: '123' },
        { type: 'admin' }
      ) as Request
      let nextCalled = false

      middleware(req, {} as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(nextCalled, true)
    })

    it('should skip validation for undefined schema sections', () => {
      const middleware = validate({
        body: {
          name: isNonEmptyString('name')
        }
        // No params or query validation
      })

      const req = createMockRequest(
        { name: 'test' },
        { invalidParam: '' }, // This should be ignored
        { invalidQuery: '' }  // This should be ignored
      ) as Request
      let nextCalled = false

      middleware(req, {} as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(nextCalled, true)
    })

    it('should handle missing fields gracefully', () => {
      const middleware = validate({
        body: {
          optionalField: (v) => v === undefined || typeof v === 'string' ? true : 'must be string'
        }
      })

      const req = createMockRequest({}) as Request
      let nextCalled = false

      middleware(req, {} as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(nextCalled, true)
    })
  })

  describe('isNonEmptyString validator', () => {
    it('should pass for non-empty strings', () => {
      const validator = isNonEmptyString('field')

      assert.equal(validator('hello'), true)
      assert.equal(validator('a'), true)
      assert.equal(validator('   text   '), true)
    })

    it('should fail for empty strings', () => {
      const validator = isNonEmptyString('field')

      const result = validator('')
      assert.notEqual(result, true)
      assert.ok(typeof result === 'string')
      assert.ok(result.includes('field'))
    })

    it('should fail for whitespace-only strings', () => {
      const validator = isNonEmptyString('field')

      const result = validator('   ')
      assert.notEqual(result, true)
    })

    it('should fail for non-strings', () => {
      const validator = isNonEmptyString('field')

      assert.notEqual(validator(123), true)
      assert.notEqual(validator(null), true)
      assert.notEqual(validator(undefined), true)
      assert.notEqual(validator({}), true)
      assert.notEqual(validator([]), true)
    })

    it('should use custom label in error message', () => {
      const validator = isNonEmptyString('username')

      const result = validator('') as string
      assert.ok(result.includes('username'))
    })
  })

  describe('isMethodKind validator', () => {
    it('should pass for valid method kinds', () => {
      const validator = isMethodKind('methodKind')

      assert.equal(validator('unary'), true)
      assert.equal(validator('server_streaming'), true)
      assert.equal(validator('client_streaming'), true)
      assert.equal(validator('bidi_streaming'), true)
    })

    it('should fail for invalid method kinds', () => {
      const validator = isMethodKind('methodKind')

      const result = validator('invalid')
      assert.notEqual(result, true)
      assert.ok(typeof result === 'string')
      assert.ok(result.includes('methodKind'))
    })

    it('should fail for non-strings', () => {
      const validator = isMethodKind('methodKind')

      assert.notEqual(validator(123), true)
      assert.notEqual(validator(null), true)
      assert.notEqual(validator(undefined), true)
      assert.notEqual(validator({}), true)
    })

    it('should be case-sensitive', () => {
      const validator = isMethodKind('methodKind')

      assert.notEqual(validator('UNARY'), true)
      assert.notEqual(validator('Unary'), true)
    })

    it('should use custom label in error message', () => {
      const validator = isMethodKind('rpcType')

      const result = validator('invalid') as string
      assert.ok(result.includes('rpcType'))
    })
  })

  describe('custom validators', () => {
    it('should support custom validation logic', () => {
      const isPositiveNumber = (v: unknown) =>
        typeof v === 'number' && v > 0 ? true : 'must be positive number'

      const middleware = validate({
        body: {
          age: isPositiveNumber
        }
      })

      // Valid
      const req1 = createMockRequest({ age: 25 }) as Request
      let nextCalled = false

      middleware(req1, {} as Response, (() => {
        nextCalled = true
      }) as NextFunction)

      assert.equal(nextCalled, true)

      // Invalid
      const req2 = createMockRequest({ age: -5 }) as Request
      let capturedError: any = null

      middleware(req2, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
    })

    it('should support complex validation rules', () => {
      const isValidEmail = (v: unknown) => {
        if (typeof v !== 'string') return 'email must be string'
        if (!v.includes('@')) return 'email must contain @'
        if (v.length < 5) return 'email too short'
        return true
      }

      const middleware = validate({
        body: { email: isValidEmail }
      })

      const req = createMockRequest({ email: 'a@' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('too short'))
    })
  })

  describe('error messages', () => {
    it('should combine multiple validation errors', () => {
      const middleware = validate({
        body: {
          name: isNonEmptyString('name'),
          type: isMethodKind('type')
        }
      })

      const req = createMockRequest({ name: '', type: 'invalid' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError instanceof AppError)
      assert.ok(capturedError.message.includes('name'))
      assert.ok(capturedError.message.includes('type'))
      assert.ok(capturedError.message.includes(';'))
    })

    it('should include field path in error message', () => {
      const middleware = validate({
        params: { id: isNonEmptyString('id') }
      })

      const req = createMockRequest(undefined, { id: '' }) as Request
      let capturedError: any = null

      middleware(req, {} as Response, ((err?: any) => {
        capturedError = err
      }) as NextFunction)

      assert.ok(capturedError.message.includes('params.id'))
    })
  })
})
