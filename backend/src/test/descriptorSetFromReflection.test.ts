// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createFileRegistry, fromJson, toJson } from '@bufbuild/protobuf'
import type { GrpcReflection } from 'grpc-js-reflection-client'
import * as descriptorSetFromReflection from '../grpc/reflection/descriptorSetFromReflection.js'
import * as protoFixtures from './protoFixtures.js'

function reflectionClient(files: Record<string, Uint8Array[]>, symbolFile: string) {
  const requestedFiles: string[] = []
  const callOptions: unknown[] = []

  return {
    requestedFiles,
    callOptions,
    client: {
      async getProtoDescriptorBySymbol(_symbol: string, options: unknown) {
        callOptions.push(options)
        return files[symbolFile] ?? []
      },
      async getProtoDescriptorByFileName(fileName: string, options: unknown) {
        callOptions.push(options)
        requestedFiles.push(fileName)
        const result = files[fileName]
        if (!result) throw new Error(`missing ${fileName}`)
        return result
      },
    } as unknown as GrpcReflection,
  }
}

describe('descriptorSetFromReflection', () => {
  it('builds a descriptor set from reflection descriptors and resolves transitive imports once', async () => {
    const common = protoFixtures.fileDescriptor({
      name: 'common.proto',
      messageType: [{ name: 'Common', field: [protoFixtures.field('id', 1, protoFixtures.FieldType.STRING)] }],
    })
    const child = protoFixtures.fileDescriptor({
      name: 'child.proto',
      dependency: ['common.proto'],
      messageType: [{ name: 'Child', field: [protoFixtures.messageField('common', 1, '.test.Common')] }],
    })
    const service = protoFixtures.fileDescriptor({
      name: 'service.proto',
      dependency: ['child.proto'],
      service: [
        {
          name: 'TestService',
          method: [
            { name: 'GetChild', inputType: '.test.Child', outputType: '.test.Common' },
          ],
        },
      ],
    })

    const { client, requestedFiles } = reflectionClient({
      'service.proto': [protoFixtures.descriptorBytes(service)],
      'child.proto': [protoFixtures.descriptorBytes(child), protoFixtures.descriptorBytes(common)],
    }, 'service.proto')

    const fdSet = await descriptorSetFromReflection.buildFileDescriptorSet(client, 'test.TestService')
    const registry = createFileRegistry(fdSet)

    assert.ok(registry.getService('test.TestService'))
    assert.ok(registry.getMessage('test.Child'))
    assert.ok(registry.getMessage('test.Common'))
    assert.deepEqual(requestedFiles, ['child.proto'])
  })

  it('prunes dependencies that reflection cannot return', async () => {
    const service = protoFixtures.fileDescriptor({
      name: 'service.proto',
      dependency: ['missing.proto'],
      messageType: [{ name: 'Request' }, { name: 'Response' }],
      service: [
        {
          name: 'TestService',
          method: [
            { name: 'Get', inputType: '.test.Request', outputType: '.test.Response' },
          ],
        },
      ],
    })

    const { client } = reflectionClient({
      'service.proto': [protoFixtures.descriptorBytes(service)],
    }, 'service.proto')

    const fdSet = await descriptorSetFromReflection.buildFileDescriptorSet(client, 'test.TestService')

    assert.deepEqual(fdSet.file.map(file => file.name), ['service.proto'])
    assert.deepEqual(fdSet.file[0]?.dependency, [])
  })

  it('restores default JSON names when reflection omits json_name', async () => {
    const request = protoFixtures.fileDescriptor({
      name: 'request.proto',
      messageType: [
        {
          name: 'Request',
          field: [
            protoFixtures.field('snake_case_field', 1, protoFixtures.FieldType.STRING, {
              jsonName: undefined,
            }),
          ],
        },
      ],
    })

    const { client } = reflectionClient({
      'request.proto': [protoFixtures.descriptorBytes(request)],
    }, 'request.proto')

    const fdSet = await descriptorSetFromReflection.buildFileDescriptorSet(client, 'test.Request')
    const registry = createFileRegistry(fdSet)
    const message = registry.getMessage('test.Request')

    assert.ok(message)
    assert.equal(message.fields[0]?.jsonName, 'snakeCaseField')

    const value = fromJson(message, { snakeCaseField: 'ok' }, { ignoreUnknownFields: false })
    assert.deepEqual(toJson(message, value, { useProtoFieldName: true }), {
      snake_case_field: 'ok',
    })
  })

  it('passes call options to reflection descriptor requests', async () => {
    const service = protoFixtures.fileDescriptor({
      name: 'service.proto',
      service: [
        {
          name: 'TestService',
          method: [
            { name: 'Get', inputType: '.test.Request', outputType: '.test.Response' },
          ],
        },
      ],
    })
    const options = { deadline: new Date(Date.now() + 1000) }
    const { client, callOptions } = reflectionClient({
      'service.proto': [protoFixtures.descriptorBytes(service)],
    }, 'service.proto')

    await descriptorSetFromReflection.buildFileDescriptorSet(client, 'test.TestService', options)

    assert.deepEqual(callOptions, [options])
  })
})
