// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MethodKind } from '@grpc-studio/shared'
import { parseClientMessage } from '../websocket/websocketProtocol.js'

describe('WebSocket protocol', () => {
  it('parses start messages into the shared stream request shape', () => {
    const result = parseClientMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'List',
        methodKind: MethodKind.SERVER_STREAMING,
        data: { pageSize: 10 },
      },
    })), 1024)

    assert.equal(result.ok, true)
    assert.deepEqual(result.ok ? result.message : null, {
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'List',
        methodKind: MethodKind.SERVER_STREAMING,
        data: { pageSize: 10 },
      },
    })
  })

  it('parses user headers on start messages', () => {
    const result = parseClientMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'List',
        methodKind: MethodKind.SERVER_STREAMING,
        userHeaders: {
          'X-User-Id': 'user-1',
          'X-User-Email': 'ada@example.com',
          'X-User-Name': 'Ada',
        },
      },
    })), 1024)

    assert.equal(result.ok, true)
    assert.deepEqual(result.ok ? result.message.payload.userHeaders : null, {
      'X-User-Id': 'user-1',
      'X-User-Email': 'ada@example.com',
      'X-User-Name': 'Ada',
    })
  })

  it('rejects unsupported user headers on start messages', () => {
    const result = parseClientMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'List',
        methodKind: MethodKind.SERVER_STREAMING,
        userHeaders: {
          authorization: 'nope',
        },
      },
    })), 1024)

    assert.deepEqual(result, {
      ok: false,
      error: 'Invalid payload: service, method, and streaming methodKind are required',
    })
  })

  it('rejects invalid start payloads', () => {
    const result = parseClientMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'List',
        methodKind: 'not_a_real_kind',
      },
    })), 1024)

    assert.deepEqual(result, {
      ok: false,
      error: 'Invalid payload: service, method, and streaming methodKind are required',
    })
  })

  it('rejects unary start payloads because unary uses HTTP invocation', () => {
    const result = parseClientMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'Get',
        methodKind: MethodKind.UNARY,
        data: { id: '123' },
      },
    })), 1024)

    assert.deepEqual(result, {
      ok: false,
      error: 'Invalid payload: service, method, and streaming methodKind are required',
    })
  })

  it('rejects oversized messages before JSON parsing', () => {
    const result = parseClientMessage(Buffer.from('{"type":"ping"}'), 4)

    assert.deepEqual(result, {
      ok: false,
      error: 'Message too large',
      tooLarge: true,
    })
  })

  it('parses fragmented raw WebSocket messages', () => {
    const result = parseClientMessage([
      Buffer.from('{"type":"'),
      Buffer.from('ping"}'),
    ], 1024)

    assert.deepEqual(result, {
      ok: true,
      message: { type: 'ping' },
    })
  })

  describe('malformed message handling', () => {
    it('should reject invalid JSON', () => {
      const result = parseClientMessage(Buffer.from('not valid json'), 1024)

      assert.equal(result.ok, false)
      assert.ok(result.ok === false && result.error.includes('JSON'))
    })

    it('should reject messages without type field', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        payload: { some: 'data' }
      })), 1024)

      assert.deepEqual(result, {
        ok: false,
        error: 'Missing or invalid message type',
      })
    })

    it('should reject messages with non-string type', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 123
      })), 1024)

      assert.deepEqual(result, {
        ok: false,
        error: 'Missing or invalid message type',
      })
    })

    it('should reject unknown message types', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 'unknown_type'
      })), 1024)

      assert.deepEqual(result, {
        ok: false,
        error: 'Unknown message type: unknown_type',
      })
    })

    it('should reject data message with missing payload field', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 'data'
      })), 1024)

      assert.equal(result.ok, false)
      assert.ok(result.ok === false && result.error.includes('payload'))
    })

    it('should reject data message with non-JSON payload', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 'data',
        payload: undefined
      })), 1024)

      // After JSON.stringify, undefined becomes missing, so this tests missing payload
      assert.equal(result.ok, false)
    })

    it('should accept empty object as data payload', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 'data',
        payload: {}
      })), 1024)

      assert.equal(result.ok, true)
      assert.deepEqual(result.ok ? result.message : null, {
        type: 'data',
        payload: {}
      })
    })

    it('should accept null as data payload', () => {
      const result = parseClientMessage(Buffer.from(JSON.stringify({
        type: 'data',
        payload: null
      })), 1024)

      assert.equal(result.ok, true)
      assert.deepEqual(result.ok ? result.message : null, {
        type: 'data',
        payload: null
      })
    })
  })

  describe('message size validation', () => {
    it('should accept messages at size limit', () => {
      const payload = 'x'.repeat(100)
      const message = JSON.stringify({ type: 'ping', data: payload })
      const result = parseClientMessage(Buffer.from(message), Buffer.byteLength(message, 'utf8'))

      assert.equal(result.ok, true)
    })

    it('should reject messages just over size limit', () => {
      const payload = 'x'.repeat(100)
      const message = JSON.stringify({ type: 'ping', data: payload })
      const byteLength = Buffer.byteLength(message, 'utf8')
      const result = parseClientMessage(Buffer.from(message), byteLength - 1)

      assert.deepEqual(result, {
        ok: false,
        error: 'Message too large',
        tooLarge: true,
      })
    })
  })
})
