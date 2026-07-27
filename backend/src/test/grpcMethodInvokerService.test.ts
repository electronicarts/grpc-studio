// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, mock, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { create, createFileRegistry, toJson } from '@bufbuild/protobuf'
import type { DescMethod, FileRegistry } from '@bufbuild/protobuf'
import type { Transport } from '@connectrpc/connect'
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt'
import { GrpcMethodInvokerService } from '../services/grpcMethodInvokerService.js'
import multiClientManager from '../grpc/multiClientManager.js'
import * as userContextMiddleware from '../middlewares/userContextMiddleware.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import type { StreamCallbacks } from '../types/index.js'
import * as protoFixtures from './protoFixtures.js'

const TEST_TARGET = 'test-target'

/**
 * Makes the service use `transport` by mocking the multiClientManager singleton's
 * getConnectTransport (the service pulls its transport from there internally).
 */
function useTransport(transport: Transport): void {
  mock.method(multiClientManager, 'getConnectTransport', () => transport)
}

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

function repository(registry: FileRegistry): Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'> {
  // Convert FileRegistry to FileDescriptorSet for getAllFileDescriptorSet
  const files = Array.from(registry.files)
  const fileDescriptorSet = create(FileDescriptorSetSchema, { file: files.map(f => f.proto) })

  return {
    getFileRegistry: async () => registry,
    getAllFileDescriptorSet: async () => fileDescriptorSet,
  }
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
  afterEach(() => {
    mock.restoreAll()
  })

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
    useTransport(transport)
    const invoker = new GrpcMethodInvokerService(repository(registry))

    const result = await userContextMiddleware.runWithUserContext(
      { userId: 'unary-user' },
      () => invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'Get', { name: 'Ada' })
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
      useTransport(transport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      void invoker.invokeClientStream(TEST_TARGET, 'test.TestService', 'Upload', (async function* () {
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
      useTransport(transport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      void userContextMiddleware.runWithUserContext(
        { userId: 'stream-user' },
        () => invoker.invokeServerStream(TEST_TARGET, 'test.TestService', 'List', { name: 'Ada' }, callbacks)
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
      useTransport(transport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      void invoker.invokeBidiStream(TEST_TARGET, 'test.TestService', 'Chat', (async function* () {
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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'invalid service!', 'Method', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Invalid service name/)
    })

    it('should reject invalid method names', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'invalid method!', {})

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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'Get', { name: 'test' })

      assert.strictEqual(result.success, true)
    })
  })

  describe('Service resolution errors', () => {
    it('should throw when service not found', async () => {
      const mockRepo = {
        getFileRegistry: async () => ({
          getService: () => null,
          files: []
        }),
        getAllFileDescriptorSet: async () => create(FileDescriptorSetSchema, { file: [] })
      }
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(mockRepo as unknown as Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'>)

      const result = await invoker.invokeUnary(TEST_TARGET, 'MissingService', 'Method', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Service MissingService not found/)
    })

    it('should throw when method not found on service', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'NonExistentMethod', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /Method NonExistentMethod not found/)
    })

    it('should throw when method type mismatch', async () => {
      const registry = testRegistry()
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      // Try to call 'List' (server_streaming) as unary
      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'List', {})

      assert.strictEqual(result.success, false)
      assert.ok(result.error)
      assert.match(result.error, /is server_streaming, not unary/)
    })

    it('should include service name in error messages', async () => {
      const mockRepo = {
        getFileRegistry: async () => ({
          getService: () => null,
          files: []
        }),
        getAllFileDescriptorSet: async () => create(FileDescriptorSetSchema, { file: [] })
      }
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(mockRepo as unknown as Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'>)

      const result = await invoker.invokeUnary(TEST_TARGET, 'com.example.UserService', 'Get', {})

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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'Get', { name: 'test' })

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
          getService: () => null,
          files: []
        }),
        getAllFileDescriptorSet: async () => create(FileDescriptorSetSchema, { file: [] })
      }
      const mockTransport = {} as Transport
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(mockRepo as unknown as Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'>)

      await invoker.invokeServerStream(TEST_TARGET, 'MissingService', 'Method', {}, callbacks)

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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(mockRepo as unknown as Pick<ReflectionSchemaRepository, 'getFileRegistry' | 'getAllFileDescriptorSet'>)

      const handle = await invoker.invokeServerStream(TEST_TARGET, 'test.TestService', 'List', {}, callbacks)

      // A failed initialization must still yield a usable noop handle whose cancel() is safe.
      assert.equal(typeof handle.cancel, 'function')
      assert.doesNotThrow(() => handle.cancel())
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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const result = await invoker.invokeUnary(TEST_TARGET, 'test.TestService', 'Get', undefined)

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
        useTransport(mockTransport)
        const invoker = new GrpcMethodInvokerService(repository(registry))

        void invoker.invokeClientStream(TEST_TARGET, 'test.TestService', 'Upload', (async function* () {
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
      useTransport(mockTransport)
      const invoker = new GrpcMethodInvokerService(repository(registry))

      const handle = await invoker.invokeServerStream(TEST_TARGET, 'test.TestService', 'List', {}, callbacks)

      // Cancelling an in-flight (infinite) stream must be safe and not throw.
      assert.equal(typeof handle.cancel, 'function')
      assert.doesNotThrow(() => handle.cancel())
      cancelled = true
    })
  })
})
