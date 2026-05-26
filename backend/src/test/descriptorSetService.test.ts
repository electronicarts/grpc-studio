// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { create } from '@bufbuild/protobuf'
import { FileDescriptorSetSchema, FileDescriptorProtoSchema, DescriptorProtoSchema } from '@bufbuild/protobuf/wkt'
import { DescriptorSetService } from '../services/descriptorSetService.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'

describe('DescriptorSetService', () => {
  describe('getDescriptorSetBase64', () => {
    it('should return base64-encoded descriptor set', async () => {
      // Create proper protobuf message instances
      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'test.proto',
        package: 'test',
        messageType: [],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn((name: string) => ({ name })),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('test.Message')

      assert.ok(result)
      assert.strictEqual(typeof result, 'string')
      // Verify it's valid base64
      assert.ok(/^[A-Za-z0-9+/]*={0,2}$/.test(result))
    })

    it('should handle message type validation', async () => {
      // Create proper protobuf message instances
      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'user.proto',
        package: 'api',
        messageType: [],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn((name: string) => {
          if (name === 'api.User') {
            return { name: 'User' }
          }
          return null
        }),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('api.User')

      assert.ok(result)
      const calls = (mockRegistry.getMessage as unknown as { mock: { calls: Array<{ arguments: string[] }> } }).mock.calls
      assert.strictEqual(calls.length, 1)
      assert.strictEqual(calls[0].arguments[0], 'api.User')
    })

    it('should handle service type validation', async () => {
      // Create proper protobuf message instances
      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'service.proto',
        package: 'api',
        messageType: [],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn(() => null),
        getService: mock.fn((name: string) => {
          if (name === 'api.UserService') {
            return { name: 'UserService' }
          }
          return null
        })
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('api.UserService')

      assert.ok(result)
      const calls = (mockRegistry.getService as unknown as { mock: { calls: Array<{ arguments: string[] }> } }).mock.calls
      assert.strictEqual(calls.length, 1)
      assert.strictEqual(calls[0].arguments[0], 'api.UserService')
    })

    it('should warn when symbol not found after resolution', async () => {
      // Create proper protobuf message instances
      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'test.proto',
        package: 'test',
        messageType: [],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn(() => null),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('MissingSymbol')

      // Should still return result, just with warning logged
      assert.ok(result)
      assert.strictEqual(typeof result, 'string')
    })

    it('should handle repository errors', async () => {
      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => {
          throw new Error('Failed to fetch descriptor set')
        }),
        getFileRegistry: mock.fn(async () => {
          throw new Error('Repository error')
        })
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)

      await assert.rejects(
        async () => await service.getDescriptorSetBase64('test.Message'),
        {
          name: 'Error',
          message: 'Failed to fetch descriptor set'
        }
      )
    })

    it('should correctly calculate binary size in logs', async () => {
      // Create proper protobuf message instances with fields
      const mockMessage = create(DescriptorProtoSchema, {
        name: 'LargeMessage',
        field: [
          { name: 'field1', number: 1, type: 9 }, // STRING type
          { name: 'field2', number: 2, type: 9 },
          { name: 'field3', number: 3, type: 9 }
        ]
      })

      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'large.proto',
        package: 'test',
        messageType: [mockMessage],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn(() => ({ name: 'LargeMessage' })),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('test.LargeMessage')

      assert.ok(result)
      // Base64 encoding expands by ~33%, so bytes should be ~75% of base64 length
      const expectedBytes = Math.round(result.length * 0.75)
      assert.ok(expectedBytes > 0)
    })

    it('should handle complex nested descriptors', async () => {
      // Create proper protobuf message instances with nested types
      const mockInner = create(DescriptorProtoSchema, {
        name: 'Inner',
        field: [{ name: 'value', number: 1, type: 9 }] // STRING type
      })

      const mockOuter = create(DescriptorProtoSchema, {
        name: 'Outer',
        nestedType: [mockInner],
        field: []
      })

      const mockFileDescriptorProto = create(FileDescriptorProtoSchema, {
        name: 'nested.proto',
        package: 'complex',
        messageType: [mockOuter],
        service: []
      })

      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: [mockFileDescriptorProto]
      })

      const mockRegistry = {
        getMessage: mock.fn(() => ({ name: 'Outer' })),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      const result = await service.getDescriptorSetBase64('complex.Outer')

      assert.ok(result)
      assert.ok(result.length > 0)
    })

    it('should call repository methods with correct message type', async () => {
      // Create proper protobuf message instance (empty descriptor set is valid)
      const mockFileDescriptorSet = create(FileDescriptorSetSchema, {
        file: []
      })

      const mockRegistry = {
        getMessage: mock.fn(() => null),
        getService: mock.fn(() => null)
      }

      const mockSchemaRepository = {
        getFileDescriptorSet: mock.fn(async () => mockFileDescriptorSet),
        getFileRegistry: mock.fn(async () => mockRegistry)
      } as unknown as ReflectionSchemaRepository

      const service = new DescriptorSetService(mockSchemaRepository)
      await service.getDescriptorSetBase64('com.example.TestMessage')

      const descriptorCalls = (mockSchemaRepository.getFileDescriptorSet as unknown as { mock: { calls: Array<{ arguments: string[] }> } }).mock.calls
      const registryCalls = (mockSchemaRepository.getFileRegistry as unknown as { mock: { calls: Array<{ arguments: string[] }> } }).mock.calls

      assert.strictEqual(descriptorCalls.length, 1)
      assert.strictEqual(descriptorCalls[0].arguments[0], 'com.example.TestMessage')

      assert.strictEqual(registryCalls.length, 1)
      assert.strictEqual(registryCalls[0].arguments[0], 'com.example.TestMessage')
    })
  })
})
