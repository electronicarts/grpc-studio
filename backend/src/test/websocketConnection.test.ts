// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { MethodKind, type InvokeStreamStartPayload } from '@grpc-studio/shared'
import type { GrpcMethodInvokerService } from '../services/grpcMethodInvokerService.js'
import type { StreamCallbacks, StreamHandle } from '../types/index.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import { WebSocketConnection } from '../websocket/websocketConnection.js'

function fakeWebSocket() {
  const sent: Array<Record<string, unknown>> = []
  let messageHandler: ((data: Buffer) => void) | null = null
  const ws = {
    readyState: WebSocket.OPEN,
    on: (event: string, handler: (data: Buffer) => void) => {
      if (event === 'message') {
        messageHandler = handler
      }
      return ws
    },
    send: (message: string) => {
      sent.push(JSON.parse(message))
    },
  } as unknown as WebSocket

  return {
    ws,
    sent,
    emitMessage: (data: Buffer) => {
      assert.ok(messageHandler)
      messageHandler(data)
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function startPayload(methodKind = MethodKind.SERVER_STREAMING): InvokeStreamStartPayload {
  return {
    service: 'test.Service',
    method: 'List',
    methodKind,
    data: {},
  }
}

describe('WebSocketConnection', () => {
  it('starts a stream and rejects writes after the stream completes', async () => {
    let callbacks: StreamCallbacks | null = null
    const stream: StreamHandle = { cancel: () => {} }
    const invoker = {
      invokeServerStream: async (_service: string, _method: string, _data: unknown, cb: StreamCallbacks) => {
        callbacks = cb
        return stream
      },
    } as unknown as GrpcMethodInvokerService
    const { ws, sent } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      grpcMethodInvokerService: invoker,
    })

    await connection.handleClientMessage({ type: 'start', payload: startPayload() })
    callbacks?.onEnd()
    await connection.handleClientMessage({ type: 'data', payload: { after: 'complete' } })

    assert.equal(sent.length, 2)
    assert.equal(sent[0].type, 'complete')
    assert.equal(sent[1].type, 'error')
    assert.equal(sent[1].error, 'No active stream')
  })

  it('ignores stale callbacks after a newer stream replaces an older stream', async () => {
    const callbacks: StreamCallbacks[] = []
    let firstCanceled = false
    const streams: StreamHandle[] = [{ cancel: () => { firstCanceled = true } }, { cancel: () => {} }]
    const invoker = {
      invokeServerStream: async (_service: string, _method: string, _data: unknown, cb: StreamCallbacks) => {
        callbacks.push(cb)
        return streams[callbacks.length - 1]
      },
    } as unknown as GrpcMethodInvokerService
    const { ws, sent } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      grpcMethodInvokerService: invoker,
    })

    await connection.handleClientMessage({ type: 'start', payload: startPayload() })
    await connection.handleClientMessage({ type: 'start', payload: startPayload() })

    callbacks[0]?.onError({ formatted: 'gRPC Cancelled: old stream' })
    callbacks[1]?.onData({ id: 'new' })

    assert.equal(firstCanceled, true)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].type, 'response')
    assert.deepEqual(sent[0].data, { id: 'new' })
    assert.equal(typeof sent[0].sentAtMs, 'number')
  })

  it('queues data and end messages while a writable stream is starting', async () => {
    const pendingStream = deferred<StreamHandle>()
    let requestStream: AsyncIterable<unknown> | null = null
    const stream: StreamHandle = { cancel: () => {} }
    const invoker = {
      invokeClientStream: async (
        _service: string,
        _method: string,
        requests: AsyncIterable<unknown>
      ) => {
        requestStream = requests
        return pendingStream.promise
      },
    } as unknown as GrpcMethodInvokerService
    const { ws } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      grpcMethodInvokerService: invoker,
    })

    const start = connection.handleClientMessage({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'Upload',
        methodKind: MethodKind.CLIENT_STREAMING,
        data: { first: true },
      },
    })

    await connection.handleClientMessage({ type: 'data', payload: { second: true } })
    await connection.handleClientMessage({ type: 'end' })
    pendingStream.resolve(stream)
    await start

    const requests: unknown[] = []
    for await (const request of requestStream ?? []) {
      requests.push(request)
    }

    assert.deepEqual(requests, [{ first: true }, { second: true }])
  })

  it('allows a new stream after canceling one that is still starting', async () => {
    const firstStream = deferred<StreamHandle>()
    const secondStream = deferred<StreamHandle>()
    let callCount = 0
    let firstCanceled = false
    const oldStream: StreamHandle = { cancel: () => { firstCanceled = true } }
    const newStream: StreamHandle = { cancel: () => {} }
    const invoker = {
      invokeServerStream: async () => {
        callCount += 1
        return callCount === 1 ? firstStream.promise : secondStream.promise
      },
    } as unknown as GrpcMethodInvokerService
    const { ws, sent } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      grpcMethodInvokerService: invoker,
    })

    const firstStart = connection.handleClientMessage({ type: 'start', payload: startPayload() })
    await connection.handleClientMessage({ type: 'cancel' })
    const secondStart = connection.handleClientMessage({ type: 'start', payload: startPayload() })

    firstStream.resolve(oldStream)
    await firstStart
    secondStream.resolve(newStream)
    await secondStart

    assert.equal(firstCanceled, true)

    await connection.handleClientMessage({ type: 'data', payload: { unsupported: true } })
    assert.equal(sent.length, 1)
    assert.equal(sent[0].type, 'error')
    assert.equal(sent[0].error, 'No active stream')
  })

  it('parses attached WebSocket messages inside the captured user context', async () => {
    let userIdFromMessageContext: string | null = null
    const invoker = {
      invokeServerStream: async (_service: string, _method: string, _data: unknown, cb: StreamCallbacks) => {
        userIdFromMessageContext = userContextMiddleware.getCurrentUserId()
        cb.onEnd()
        return { cancel: () => {} }
      },
    } as unknown as GrpcMethodInvokerService
    const { ws, sent, emitMessage } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      userContext: {
        userId: 'user-1',
        userEmail: null,
        userName: null,
        authenticated: true,
      },
      maxMessageSize: 1024,
      grpcMethodInvokerService: invoker,
    })

    connection.open()
    emitMessage(Buffer.from(JSON.stringify({ type: 'start', payload: startPayload() })))
    await new Promise((resolve) => setImmediate(resolve))

    assert.equal(userIdFromMessageContext, 'user-1')
    assert.equal(sent[0].type, 'complete')
  })

  it('uses start-frame user headers when the WebSocket upgrade had no user context', async () => {
    let userIdFromMessageContext: string | null = null
    const invoker = {
      invokeServerStream: async (_service: string, _method: string, _data: unknown, cb: StreamCallbacks) => {
        userIdFromMessageContext = userContextMiddleware.getCurrentUserId()
        cb.onEnd()
        return { cancel: () => {} }
      },
    } as unknown as GrpcMethodInvokerService
    const { ws, sent, emitMessage } = fakeWebSocket()
    const connection = new WebSocketConnection({
      connectionId: 'connection-1',
      ws,
      maxMessageSize: 1024,
      grpcMethodInvokerService: invoker,
    })

    connection.open()
    emitMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        ...startPayload(),
        userHeaders: {
          'X-User-Id': 'frame-user',
        },
      },
    })))
    await new Promise((resolve) => setImmediate(resolve))

    assert.equal(userIdFromMessageContext, 'frame-user')
    assert.equal(sent[0].type, 'complete')
  })

  it('should send error when queue overflows during client streaming', async () => {
    const { ws, sent, emitMessage } = fakeWebSocket()

    const connection = new WebSocketConnection({
      connectionId: 'test-conn',
      ws,
      grpcMethodInvokerService: {
        invokeClientStream: async () => {
          return { cancel: () => {} }
        }
      } as any,
    })

    connection.open()

    // Start a client streaming RPC
    emitMessage(Buffer.from(JSON.stringify({
      type: 'start',
      payload: {
        service: 'test.Service',
        method: 'Upload',
        methodKind: MethodKind.CLIENT_STREAMING,
      },
    })))
    await new Promise((resolve) => setImmediate(resolve))

    // Attempt to send more than the queue limit (default 1000)
    // For testing, we'll send a reasonable number and verify error handling works
    for (let i = 0; i < 1005; i++) {
      emitMessage(Buffer.from(JSON.stringify({
        type: 'data',
        payload: { chunk: i },
      })))
    }

    await new Promise((resolve) => setImmediate(resolve))

    // Should have sent an error message about queue capacity
    const errorMessages = sent.filter(msg => msg.type === 'error')
    assert.ok(errorMessages.length > 0, 'Should send error message')

    // Check if any error message mentions queue or capacity
    const queueError = errorMessages.find(msg => {
      const msgText = JSON.stringify(msg).toLowerCase()
      return msgText.includes('queue') || msgText.includes('capacity') || msgText.includes('overflow')
    })
    assert.ok(queueError, `Error should mention queue capacity. Got: ${JSON.stringify(errorMessages)}`)
  })

  describe('rapid stream transitions', () => {
    it('should handle start → cancel → start sequence', async () => {
      const { ws, sent, emitMessage } = fakeWebSocket()
      const { resolve: resolveStream1, promise: promise1 } = deferred<void>()
      const { resolve: resolveStream2, promise: promise2 } = deferred<void>()

      let invokeCount = 0
      const connection = new WebSocketConnection({
        connectionId: 'test-conn',
        ws,
        grpcMethodInvokerService: {
          invokeServerStream: async (_service, _method, _request, callbacks) => {
            invokeCount++
            if (invokeCount === 1) {
              await promise1
              callbacks.onData({ stream: 1 })
              callbacks.onEnd()
            } else {
              await promise2
              callbacks.onData({ stream: 2 })
              callbacks.onEnd()
            }
            return { cancel: () => {} }
          }
        } as any,
      })

      connection.open()

      // Start stream 1
      emitMessage(Buffer.from(JSON.stringify({
        type: 'start',
        payload: startPayload(),
      })))
      await new Promise((resolve) => setImmediate(resolve))

      // Cancel immediately
      emitMessage(Buffer.from(JSON.stringify({ type: 'cancel' })))
      await new Promise((resolve) => setImmediate(resolve))

      // Start stream 2
      emitMessage(Buffer.from(JSON.stringify({
        type: 'start',
        payload: startPayload(),
      })))
      await new Promise((resolve) => setImmediate(resolve))

      // Resolve both streams
      resolveStream1()
      await new Promise((resolve) => setImmediate(resolve))
      resolveStream2()
      await new Promise((resolve) => setImmediate(resolve))

      // Should only see responses from stream 2
      const responses = sent.filter(msg => msg.type === 'response')
      assert.equal(responses.length, 1)
      assert.deepEqual(responses[0].data, { stream: 2 })
    })

    it('should ignore late responses from cancelled stream', async () => {
      const { ws, sent, emitMessage } = fakeWebSocket()
      const { resolve: resolveStream1, promise: promise1 } = deferred<void>()
      const { resolve: resolveStream2, promise: promise2 } = deferred<void>()

      let stream1Callbacks: any
      let stream2Callbacks: any

      const connection = new WebSocketConnection({
        connectionId: 'test-conn',
        ws,
        grpcMethodInvokerService: {
          invokeServerStream: async (_service, _method, _request, callbacks) => {
            if (!stream1Callbacks) {
              stream1Callbacks = callbacks
              await promise1
            } else {
              stream2Callbacks = callbacks
              await promise2
            }
            return { cancel: () => {} }
          }
        } as any,
      })

      connection.open()

      // Start stream 1
      emitMessage(Buffer.from(JSON.stringify({
        type: 'start',
        payload: startPayload(),
      })))
      await new Promise((resolve) => setImmediate(resolve))

      // Start stream 2 (replaces stream 1)
      emitMessage(Buffer.from(JSON.stringify({
        type: 'start',
        payload: startPayload(),
      })))
      await new Promise((resolve) => setImmediate(resolve))

      // Resolve stream 2 first
      resolveStream2()
      await new Promise((resolve) => setImmediate(resolve))

      // Send response from stream 2
      stream2Callbacks.onData({ stream: 2 })
      await new Promise((resolve) => setImmediate(resolve))

      // Resolve stream 1 late
      resolveStream1()
      await new Promise((resolve) => setImmediate(resolve))

      // Send response from stream 1 (should be ignored)
      stream1Callbacks.onData({ stream: 1 })
      await new Promise((resolve) => setImmediate(resolve))

      // Should only see response from stream 2
      const responses = sent.filter(msg => msg.type === 'response')
      assert.equal(responses.length, 1)
      assert.deepEqual(responses[0].data, { stream: 2 })
    })
  })
})
