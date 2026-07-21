// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { DiscoveryService } from '../services/discoveryService.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'

const TEST_TARGET = 'test-target'

describe('DiscoveryService', () => {
  describe('listServices', () => {
    it('should list all available services', async () => {
      const mockSchemaRepository = {
        listServices: mock.fn(async () => ['service1', 'service2', 'service3'])
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const services = await service.listServices(TEST_TARGET)

      assert.deepStrictEqual(services, ['service1', 'service2', 'service3'])
      assert.strictEqual((mockSchemaRepository.listServices as any).mock.calls.length, 1)
    })

    it('should return empty array when no services available', async () => {
      const mockSchemaRepository = {
        listServices: mock.fn(async () => [])
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const services = await service.listServices(TEST_TARGET)

      assert.deepStrictEqual(services, [])
    })

    it('should handle repository errors', async () => {
      const mockSchemaRepository = {
        listServices: mock.fn(async () => {
          throw new Error('Repository unavailable')
        })
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)

      await assert.rejects(
        async () => await service.listServices(TEST_TARGET),
        {
          name: 'Error',
          message: 'Repository unavailable'
        }
      )
    })
  })

  describe('describeService', () => {
    it('should describe service with methods', async () => {
      const mockMethods = [
        {
          name: 'GetUser',
          input: { typeName: 'GetUserRequest' },
          output: { typeName: 'GetUserResponse' },
          methodKind: 'unary'
        },
        {
          name: 'ListUsers',
          input: { typeName: 'ListUsersRequest' },
          output: { typeName: 'ListUsersResponse' },
          methodKind: 'unary'
        }
      ]

      const mockDescService = {
        methods: mockMethods
      }

      const mockRegistry = {
        getService: mock.fn((_name: string) => mockDescService)
      }

      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const description = await service.describeService(TEST_TARGET, 'com.example.UserService')

      assert.strictEqual(description.name, 'UserService')
      assert.strictEqual(description.fullName, 'com.example.UserService')
      assert.strictEqual(description.methods.length, 2)

      assert.strictEqual(description.methods[0].name, 'GetUser')
      assert.strictEqual(description.methods[0].inputType, 'GetUserRequest')
      assert.strictEqual(description.methods[0].outputType, 'GetUserResponse')
      assert.strictEqual(description.methods[0].kind, 'unary')

      assert.strictEqual(description.methods[1].name, 'ListUsers')
    })

    it('should handle service with streaming methods', async () => {
      const mockMethods = [
        {
          name: 'StreamMessages',
          input: { typeName: 'StreamRequest' },
          output: { typeName: 'StreamResponse' },
          methodKind: 'server_streaming'
        },
        {
          name: 'UploadData',
          input: { typeName: 'DataChunk' },
          output: { typeName: 'UploadResult' },
          methodKind: 'client_streaming'
        },
        {
          name: 'Chat',
          input: { typeName: 'ChatMessage' },
          output: { typeName: 'ChatMessage' },
          methodKind: 'bidi_streaming'
        }
      ]

      const mockDescService = {
        methods: mockMethods
      }

      const mockRegistry = {
        getService: mock.fn(() => mockDescService)
      }

      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const description = await service.describeService(TEST_TARGET, 'StreamService')

      assert.strictEqual(description.methods.length, 3)
      assert.strictEqual(description.methods[0].kind, 'server_streaming')
      assert.strictEqual(description.methods[1].kind, 'client_streaming')
      assert.strictEqual(description.methods[2].kind, 'bidi_streaming')
    })

    it('should throw error when service not found', async () => {
      const mockRegistry = {
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)

      await assert.rejects(
        async () => await service.describeService(TEST_TARGET, 'NonExistentService'),
        {
          name: 'Error',
          message: 'Service NonExistentService not found in descriptor'
        }
      )
    })

    it('should parse service name correctly', async () => {
      const mockMethods = [
        {
          name: 'Method1',
          input: { typeName: 'Request' },
          output: { typeName: 'Response' },
          methodKind: 'unary'
        }
      ]

      const mockDescService = { methods: mockMethods }
      const mockRegistry = { getService: mock.fn(() => mockDescService) }
      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)

      // Test fully qualified name
      const desc1 = await service.describeService(TEST_TARGET, 'com.example.v1.MyService')
      assert.strictEqual(desc1.name, 'MyService')
      assert.strictEqual(desc1.fullName, 'com.example.v1.MyService')

      // Test simple name
      const desc2 = await service.describeService(TEST_TARGET, 'SimpleService')
      assert.strictEqual(desc2.name, 'SimpleService')
      assert.strictEqual(desc2.fullName, 'SimpleService')
    })

    it('should handle service with no methods', async () => {
      const mockDescService = {
        methods: []
      }

      const mockRegistry = {
        getService: mock.fn(() => mockDescService)
      }

      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const description = await service.describeService(TEST_TARGET, 'EmptyService')

      assert.strictEqual(description.methods.length, 0)
    })

    it('should handle repository errors during describe', async () => {
      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => {
          throw new Error('Failed to fetch registry')
        })
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)

      await assert.rejects(
        async () => await service.describeService(TEST_TARGET, 'TestService'),
        {
          name: 'Error',
          message: 'Failed to fetch registry'
        }
      )
    })

    it('should preserve method metadata accurately', async () => {
      const mockMethods = [
        {
          name: 'ComplexMethod',
          input: { typeName: 'com.example.ComplexRequest' },
          output: { typeName: 'com.example.ComplexResponse' },
          methodKind: 'unary'
        }
      ]

      const mockDescService = { methods: mockMethods }
      const mockRegistry = { getService: mock.fn(() => mockDescService) }
      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      const description = await service.describeService(TEST_TARGET, 'TestService')

      const method = description.methods[0]
      assert.strictEqual(method.name, 'ComplexMethod')
      assert.strictEqual(method.inputType, 'com.example.ComplexRequest')
      assert.strictEqual(method.outputType, 'com.example.ComplexResponse')
      assert.strictEqual(method.kind, 'unary')
    })

    it('should call repository with correct service name', async () => {
      const mockMethods = [
        {
          name: 'Test',
          input: { typeName: 'Req' },
          output: { typeName: 'Res' },
          methodKind: 'unary'
        }
      ]

      const mockDescService = { methods: mockMethods }
      const mockRegistry = { getService: mock.fn(() => mockDescService) }
      const mockSchemaRepository = {
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DiscoveryService(mockSchemaRepository)
      await service.describeService(TEST_TARGET, 'my.test.Service')

      const calls = (mockSchemaRepository.getFileRegistry as any).mock.calls
      assert.strictEqual(calls.length, 1)
      assert.strictEqual(calls[0].arguments[0], TEST_TARGET)
      assert.strictEqual(calls[0].arguments[1], 'my.test.Service')
    })
  })
})
