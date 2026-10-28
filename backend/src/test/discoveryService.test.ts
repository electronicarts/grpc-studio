// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { DiscoveryService } from '../services/discoveryService.js'
import type { ReflectionSchemaRepository } from '../repositories/reflectionSchemaRepository.js'
import * as protoFixtures from './protoFixtures.js'

const TEST_TARGET = 'test-target'

interface MethodSpec {
  name: string
  input?: string
  output?: string
  clientStreaming?: boolean
  serverStreaming?: boolean
}

/** A repository serving a real registry with one service, as reflection would. Messages are declared as needed. */
function repositoryWithService(pkg: string, serviceName: string, methods: (string | MethodSpec)[]) {
  const specs = methods.map(m => typeof m === 'string' ? { name: m } : m)
  const messageNames = [...new Set(specs.flatMap(m => [m.input ?? 'Request', m.output ?? 'Response']))]
  const qualify = (message: string) => pkg ? `.${pkg}.${message}` : `.${message}`
  const registry = protoFixtures.fileRegistry(protoFixtures.fileDescriptor({
    name: 'service.proto',
    package: pkg,
    messageType: messageNames.map(name => ({ name })),
    service: [{
      name: serviceName,
      method: specs.map(m => ({
        name: m.name,
        inputType: qualify(m.input ?? 'Request'),
        outputType: qualify(m.output ?? 'Response'),
        clientStreaming: m.clientStreaming,
        serverStreaming: m.serverStreaming,
      })),
    }],
  }))
  const getFileRegistry = mock.fn(async (_target: string, _service: string) => registry)
  return { repository: { getFileRegistry } as unknown as ReflectionSchemaRepository, getFileRegistry }
}

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
      const { repository } = repositoryWithService('com.example', 'UserService', [
        { name: 'GetUser', input: 'GetUserRequest', output: 'GetUserResponse' },
        { name: 'ListUsers', input: 'ListUsersRequest', output: 'ListUsersResponse' },
      ])

      const description = await new DiscoveryService(repository).describeService(TEST_TARGET, 'com.example.UserService')

      assert.strictEqual(description.name, 'UserService')
      assert.strictEqual(description.fullName, 'com.example.UserService')
      assert.strictEqual(description.methods.length, 2)

      assert.strictEqual(description.methods[0].name, 'GetUser')
      assert.strictEqual(description.methods[0].inputType, 'com.example.GetUserRequest')
      assert.strictEqual(description.methods[0].outputType, 'com.example.GetUserResponse')
      assert.strictEqual(description.methods[0].kind, 'unary')

      assert.strictEqual(description.methods[1].name, 'ListUsers')
    })

    it('should handle service with streaming methods', async () => {
      const { repository } = repositoryWithService('', 'StreamService', [
        { name: 'StreamMessages', serverStreaming: true },
        { name: 'UploadData', clientStreaming: true },
        { name: 'Chat', clientStreaming: true, serverStreaming: true },
      ])

      const description = await new DiscoveryService(repository).describeService(TEST_TARGET, 'StreamService')

      assert.strictEqual(description.methods.length, 3)
      assert.strictEqual(description.methods[0].kind, 'server_streaming')
      assert.strictEqual(description.methods[1].kind, 'client_streaming')
      assert.strictEqual(description.methods[2].kind, 'bidi_streaming')
    })

    it('should throw error when service not found', async () => {
      const { repository } = repositoryWithService('', 'OtherService', [])

      await assert.rejects(
        async () => await new DiscoveryService(repository).describeService(TEST_TARGET, 'NonExistentService'),
        {
          name: 'Error',
          message: 'Service NonExistentService not found in descriptor'
        }
      )
    })

    it('should take the service name from its descriptor', async () => {
      const packaged = repositoryWithService('com.example.v1', 'MyService', ['Method1'])
      const qualified = await new DiscoveryService(packaged.repository)
        .describeService(TEST_TARGET, 'com.example.v1.MyService')
      assert.strictEqual(qualified.name, 'MyService')
      assert.strictEqual(qualified.fullName, 'com.example.v1.MyService')
      assert.strictEqual(qualified.methods[0].inputType, 'com.example.v1.Request')

      const simple = repositoryWithService('', 'SimpleService', ['Method1'])
      const unpackaged = await new DiscoveryService(simple.repository).describeService(TEST_TARGET, 'SimpleService')
      assert.strictEqual(unpackaged.name, 'SimpleService')
      assert.strictEqual(unpackaged.fullName, 'SimpleService')
    })

    it('should handle service with no methods', async () => {
      const { repository } = repositoryWithService('', 'EmptyService', [])

      const description = await new DiscoveryService(repository).describeService(TEST_TARGET, 'EmptyService')

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
      const { repository } = repositoryWithService('com.example', 'TestService', [
        { name: 'ComplexMethod', input: 'ComplexRequest', output: 'ComplexResponse' },
      ])

      const description = await new DiscoveryService(repository).describeService(TEST_TARGET, 'com.example.TestService')

      const method = description.methods[0]
      assert.strictEqual(method.name, 'ComplexMethod')
      assert.strictEqual(method.inputType, 'com.example.ComplexRequest')
      assert.strictEqual(method.outputType, 'com.example.ComplexResponse')
      assert.strictEqual(method.kind, 'unary')
    })

    it('should call repository with correct service name', async () => {
      const { repository, getFileRegistry } = repositoryWithService('my.test', 'Service', ['Test'])

      await new DiscoveryService(repository).describeService(TEST_TARGET, 'my.test.Service')

      assert.strictEqual(getFileRegistry.mock.callCount(), 1)
      assert.deepStrictEqual(getFileRegistry.mock.calls[0].arguments, [TEST_TARGET, 'my.test.Service'])
    })
  })
})
