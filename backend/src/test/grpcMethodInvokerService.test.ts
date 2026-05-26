// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { create, createFileRegistry, toJson } from '@bufbuild/protobuf'
import type { DescMethod, FileRegistry } from '@bufbuild/protobuf'
import type { Transport } from '@connectrpc/connect'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { GrpcMethodInvokerService } from '../services/grpcMethodInvokerService.js'
import type { ConnectTransportProvider } from '../grpc/connect/connectTransport.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import type { StreamCallbacks } from '../types/index.js'
import * as protoFixtures from './protoFixtures.js'

function testRegistry(): FileRegistry {
  const file = protoFixtures.fileDescriptor({
    name: 'connect_invoker_test.proto',
    messageType: [
      {
        name: 'Request',
        field: [
          protoFixtures.field('name', 1, protoFixtures.FieldType.STRING),
        ],
      },
      {
        name: 'Response',
        field: [
          protoFixtures.field('message', 1, protoFixtures.FieldType.STRING),
        ],
      },
    ],
    service: [
      {
        name: 'TestService',
        method: [
          { name: 'Get', inputType: '.test.Request', outputType: '.test.Response' },
          {
            name: 'List',
            inputType: '.test.Request',
            outputType: '.test.Response',
            serverStreaming: true,
          },
          {
            name: 'Upload',
            inputType: '.test.Request',
            outputType: '.test.Response',
            clientStreaming: true,
          },
          {
            name: 'Chat',
            inputType: '.test.Request',
            outputType: '.test.Response',
            clientStreaming: true,
            serverStreaming: true,
          },
        ],
      },
    ],
  })

  const registry = createFileRegistry(create(FileDescriptorSetSchema, { file: [file] }))
  const service = registry.getService('test.TestService')
  if (!service) throw new Error('test.TestService descriptor was not built')

  return registry
}

function repository(registry: FileRegistry): Pick<ReflectionSchemaRepository, 'getFileRegistry'> {
  return {
    getFileRegistry: async () => registry,
  }
}

function provider(transport: Transport): ConnectTransportProvider {
  return {
    getTransport: () => transport,
    close: () => {},
  } as ConnectTransportProvider
}

function normalizeHeaders(headers: unknown): Record<string, string> {
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (!headers || typeof headers !== 'object') return {}

  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof value === 'string') normalized[key.toLowerCase()] = value
    if (Array.isArray(value)) normalized[key.toLowerCase()] = value.join(', ')
  }
  return normalized
}

describe('GrpcMethodInvokerService', () => {
  it('invokes unary methods through Connect transport descriptors', async () => {
    const registry = testRegistry()
    let receivedRequest: unknown = null
    let receivedHeaders: Record<string, string> = {}
    const transport = {
      unary: async (method: DescMethod, _signal: unknown, _timeoutMs: unknown, headers: unknown, input: unknown) => {
        receivedHeaders = normalizeHeaders(headers)
        receivedRequest = toJson(method.input, input as never, { useProtoFieldName: true })
        return {
          message: create(method.output, { message: 'hello Ada' }),
        }
      },
    } as unknown as Transport
    const invoker = new GrpcMethodInvokerService(repository(registry), provider(transport))

    const result = await userContextMiddleware.runWithUserContext(
      { userId: 'unary-user' },
      () => invoker.invokeUnary('test.TestService', 'Get', { name: 'Ada' })
    )

    assert.deepEqual(receivedRequest, { name: 'Ada' })
    assert.equal(receivedHeaders['x-user-id'], 'unary-user')
    assert.deepEqual(result.success ? result.data : null, { message: 'hello Ada' })
  })

  it('streams client requests through Connect transport descriptors', async () => {
    const registry = testRegistry()
    const receivedRequests: unknown[] = []
    const completed = new Promise<void>((resolve, reject) => {
      const callbacks: StreamCallbacks = {
        onData: (data) => {
          assert.deepEqual(data, { message: 'uploaded' })
        },
        onEnd: resolve,
        onError: reject,
      }

      const transport = {
        stream: async (
          method: DescMethod,
          _signal: unknown,
          _timeoutMs: unknown,
          _headers: unknown,
          input: AsyncIterable<unknown>
        ) => {
          for await (const request of input) {
            receivedRequests.push(toJson(method.input, request as never, { useProtoFieldName: true }))
          }

          return {
            message: (async function* () {
              yield create(method.output, { message: 'uploaded' })
            })(),
          }
        },
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(transport))

      void invoker.invokeClientStream('test.TestService', 'Upload', (async function* () {
        yield { name: 'first' }
        yield { name: 'second' }
      })(), callbacks)
    })

    await completed
    assert.deepEqual(receivedRequests, [{ name: 'first' }, { name: 'second' }])
  })

  it('streams server responses through Connect clients', async () => {
    const registry = testRegistry()
    let receivedRequest: unknown = null
    let receivedHeaders: Record<string, string> = {}
    const completed = new Promise<void>((resolve, reject) => {
      const callbacks: StreamCallbacks = {
        onData: (data) => {
          assert.deepEqual(data, { message: 'hello Ada' })
        },
        onEnd: resolve,
        onError: reject,
      }

      const transport = {
        stream: async (
          method: DescMethod,
          _signal: unknown,
          _timeoutMs: unknown,
          headers: unknown,
          input: AsyncIterable<unknown>
        ) => {
          receivedHeaders = normalizeHeaders(headers)
          for await (const request of input) {
            receivedRequest = toJson(method.input, request as never, { useProtoFieldName: true })
          }

          return {
            message: (async function* () {
              yield create(method.output, { message: 'hello Ada' })
            })(),
          }
        },
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(transport))

      void userContextMiddleware.runWithUserContext(
        { userId: 'stream-user' },
        () => invoker.invokeServerStream('test.TestService', 'List', { name: 'Ada' }, callbacks)
      )
    })

    await completed
    assert.deepEqual(receivedRequest, { name: 'Ada' })
    assert.equal(receivedHeaders['x-user-id'], 'stream-user')
  })

  it('streams bidi requests and responses through Connect clients', async () => {
    const registry = testRegistry()
    const receivedRequests: unknown[] = []
    const receivedResponses: unknown[] = []
    const completed = new Promise<void>((resolve, reject) => {
      const callbacks: StreamCallbacks = {
        onData: (data) => {
          receivedResponses.push(data)
        },
        onEnd: resolve,
        onError: reject,
      }

      const transport = {
        stream: async (
          method: DescMethod,
          _signal: unknown,
          _timeoutMs: unknown,
          _headers: unknown,
          input: AsyncIterable<unknown>
        ) => {
          for await (const request of input) {
            receivedRequests.push(toJson(method.input, request as never, { useProtoFieldName: true }))
          }

          return {
            message: (async function* () {
              yield create(method.output, { message: 'first response' })
              yield create(method.output, { message: 'second response' })
            })(),
          }
        },
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(transport))

      void invoker.invokeBidiStream('test.TestService', 'Chat', (async function* () {
        yield { name: 'first' }
        yield { name: 'second' }
      })(), callbacks)
    })

    await completed
    assert.deepEqual(receivedRequests, [{ name: 'first' }, { name: 'second' }])
    assert.deepEqual(receivedResponses, [{ message: 'first response' }, { message: 'second response' }])
  })

  describe('Method name validation', () => {
    it('should reject invalid service names', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('invalid service!', 'Method', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Invalid service name/)
    })

    it('should reject invalid method names', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('test.TestService', 'invalid method!', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Invalid method name/)
    })

    it('should accept valid dotted names', async () => {
      const registry = testRegistry()
      const mockTransport = {
        unary: async (method: DescMethod) => ({
          message: create(method.output, { message: 'success' })
        })
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('test.TestService', 'Get', { name: 'test' })

      assert.strictEqual(result.success, true)
    })
  })

  describe('Service resolution errors', () => {
    it('should throw when service not found', async () => {
      const mockRepo = {
        getFileRegistry: async () => ({
          getService: () => null
        })
      }
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(mockRepo, provider(mockTransport))

      const result = await invoker.invokeUnary('MissingService', 'Method', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Service MissingService not found/)
    })

    it('should throw when method not found on service', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('test.TestService', 'NonExistentMethod', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Method NonExistentMethod not found/)
    })

    it('should throw when method type mismatch', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      // Try to call 'List' (server_streaming) as unary
      const result = await invoker.invokeUnary('test.TestService', 'List', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /is server_streaming, not unary/)
    })

    it('should include service name in error messages', async () => {
      const mockRepo = {
        getFileRegistry: async () => ({
          getService: () => null
        })
      }
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(mockRepo, provider(mockTransport))

      const result = await invoker.invokeUnary('com.example.UserService', 'Get', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.ok(result.error.includes('com.example.UserService'))
    })
  })

  describe('Error handling', () => {
    it('should return formatted error for unary failures', async () => {
      const registry = testRegistry()
      const mockTransport = {
        unary: async () => {
          throw new Error('Network timeout')
        }
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('test.TestService', 'Get', { name: 'test' })

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Network timeout/)
    })

    it('should call onError callback for stream failures', async () => {
      let errorCalled = false
      let errorMessage = ''

      const callbacks: StreamCallbacks = {
        onData: () => {},
        onEnd: () => {},
        onError: (error) => {
          errorCalled = true
          errorMessage = error.message || error.formatted || ''
        }
      }

      const mockRepo = {
        getFileRegistry: async () => ({
          getService: () => null
        })
      }
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(mockRepo, provider(mockTransport))

      await invoker.invokeServerStream('MissingService', 'Method', {}, callbacks)

      assert.strictEqual(errorCalled, true)
      assert.ok(errorMessage.includes('MissingService'))
    })

    it('should return noop handle on stream initialization errors', async () => {
      const callbacks: StreamCallbacks = {
        onData: () => {},
        onEnd: () => {},
        onError: () => {}
      }

      const mockRepo = {
        getFileRegistry: async () => {
          throw new Error('Registry unavailable')
        }
      }
      const mockTransport = {} as Transport
      const invoker = new GrpcMethodInvokerService(mockRepo, provider(mockTransport))

      const handle = await invoker.invokeServerStream('test.TestService', 'List', {}, callbacks)

      // Should return noop handle that doesn't throw
      handle.cancel()
      assert.ok(true) // If we get here, cancel() didn't throw
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined request body for unary', async () => {
      const registry = testRegistry()
      const mockTransport = {
        unary: async (method: DescMethod, _signal: unknown, _timeoutMs: unknown, _headers: unknown, _input: unknown) => {
          return {
            message: create(method.output, { message: 'success' })
          }
        }
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const result = await invoker.invokeUnary('test.TestService', 'Get', undefined)

      assert.strictEqual(result.success, true)
      // undefined request should be handled gracefully
    })

    it('should handle empty async iterator for client stream', async () => {
      const registry = testRegistry()
      const receivedRequests: unknown[] = []
      const completed = new Promise<void>((resolve, reject) => {
        const callbacks: StreamCallbacks = {
          onData: (data) => {
            assert.deepEqual(data, { message: 'no data received' })
          },
          onEnd: resolve,
          onError: reject
        }

        const mockTransport = {
          stream: async (
            method: DescMethod,
            _signal: unknown,
            _timeoutMs: unknown,
            _headers: unknown,
            input: AsyncIterable<unknown>
          ) => {
            for await (const request of input) {
              receivedRequests.push(request)
            }

            return {
              message: (async function* () {
                yield create(method.output, { message: 'no data received' })
              })()
            }
          }
        } as unknown as Transport
        const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

        void invoker.invokeClientStream('test.TestService', 'Upload', (async function* () {
          // Empty iterator
        })(), callbacks)
      })

      await completed
      assert.deepEqual(receivedRequests, [])
    })

    it('should handle stream cancellation', async () => {
      const registry = testRegistry()
      let cancelled = false
      const callbacks: StreamCallbacks = {
        onData: () => {},
        onEnd: () => {},
        onError: () => {}
      }

      const mockTransport = {
        stream: async () => {
          return {
            message: (async function* () {
              // Stream that would run forever if not cancelled
              while (true) {
                await new Promise(resolve => setTimeout(resolve, 100))
                if (cancelled) break
                yield create(testRegistry().getMessage('test.Response')!, { message: 'data' })
              }
            })()
          }
        }
      } as unknown as Transport
      const invoker = new GrpcMethodInvokerService(repository(registry), provider(mockTransport))

      const handle = await invoker.invokeServerStream('test.TestService', 'List', {}, callbacks)

      // Cancel should work without throwing
      handle.cancel()
      cancelled = true
      assert.ok(true)
    })
  })
})
